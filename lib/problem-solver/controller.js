import {
  REPLAN_REASONS,
  STEP_STATUSES,
  TASK_STATUSES,
  assertPlan,
  assertPlanPatch,
  assertReplanDecision,
} from './contracts.js';

function clone(value) {
  return structuredClone(value);
}

function assertTaskState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('TaskState must be an object');
  if (!TASK_STATUSES.includes(state.status)) throw new Error(`invalid TaskState.status: ${state.status}`);
  if (!state.stepStates || typeof state.stepStates !== 'object' || Array.isArray(state.stepStates)) {
    throw new Error('TaskState.stepStates must be an object');
  }
  for (const [id, step] of Object.entries(state.stepStates)) {
    if (!STEP_STATUSES.includes(step.status)) throw new Error(`invalid status for step "${id}": ${step.status}`);
    if (!Number.isInteger(step.attempts) || step.attempts < 0) throw new Error(`invalid attempts for step "${id}"`);
  }
  return clone(state);
}

export function nextReadySteps(plan, state) {
  const checkedPlan = assertPlan(plan);
  const checkedState = assertTaskState(state);
  if (checkedState.planId !== checkedPlan.id || checkedState.planVersion !== checkedPlan.version) {
    throw new Error('TaskState plan reference does not match Plan');
  }

  return checkedPlan.steps.filter((step) => {
    const own = checkedState.stepStates[step.id];
    if (!own || own.status !== 'pending') return false;
    return (step.dependsOn ?? []).every((dep) => checkedState.stepStates[dep]?.status === 'completed');
  });
}

export function nextReadyStep(plan, state) {
  return nextReadySteps(plan, state)[0] ?? null;
}

export function beginStep(plan, state, stepId) {
  const checkedPlan = assertPlan(plan);
  const checkedState = assertTaskState(state);
  const ready = new Set(nextReadySteps(checkedPlan, checkedState).map((step) => step.id));
  if (!ready.has(stepId)) throw new Error(`step "${stepId}" is not ready`);
  const next = clone(checkedState);
  next.status = 'running';
  next.stepStates[stepId].status = 'running';
  next.stepStates[stepId].attempts += 1;
  return next;
}

export function recordObservation(state, observation) {
  const checkedState = assertTaskState(state);
  if (!observation || typeof observation !== 'object' || Array.isArray(observation)) {
    throw new Error('observation must be an object');
  }
  const next = clone(checkedState);
  next.observations.push(clone(observation));
  return next;
}

export function recordStepOutcome(plan, state, stepId, outcome) {
  const checkedPlan = assertPlan(plan);
  const checkedState = assertTaskState(state);
  const step = checkedPlan.steps.find((item) => item.id === stepId);
  if (!step) throw new Error(`unknown step "${stepId}"`);
  if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) throw new Error('outcome must be an object');
  const status = outcome.status;
  if (!['completed', 'failed', 'blocked'].includes(status)) throw new Error('outcome.status must be completed, failed, or blocked');

  const next = clone(checkedState);
  const runtime = next.stepStates[stepId];
  if (runtime.status !== 'running') throw new Error(`step "${stepId}" is not running`);
  runtime.status = status;
  runtime.result = outcome.result ?? null;
  runtime.lastError = outcome.error ?? null;
  if (status === 'blocked') next.status = 'blocked';
  return next;
}

export function isTaskComplete(plan, state) {
  const checkedPlan = assertPlan(plan);
  const checkedState = assertTaskState(state);
  return checkedPlan.steps.every((step) => checkedState.stepStates[step.id]?.status === 'completed');
}

function transitiveDependents(plan, seedIds) {
  const result = new Set(seedIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of plan.steps) {
      if (result.has(step.id)) continue;
      if ((step.dependsOn ?? []).some((dep) => result.has(dep))) {
        result.add(step.id);
        changed = true;
      }
    }
  }
  return result;
}

export function applyPlanPatch(plan, state, patch) {
  const oldPlan = assertPlan(plan);
  const oldState = assertTaskState(state);
  const checkedPatch = assertPlanPatch(patch, oldPlan);

  const byId = new Map(oldPlan.steps.map((step) => [step.id, clone(step)]));
  const touched = new Set(checkedPatch.invalidateSteps ?? []);

  for (const update of checkedPatch.updateSteps ?? []) {
    const current = byId.get(update.id);
    byId.set(update.id, { ...current, ...clone(update.changes), id: update.id });
    touched.add(update.id);
  }

  for (const step of checkedPatch.addSteps ?? []) {
    if (byId.has(step.id)) throw new Error(`PlanPatch adds duplicate step "${step.id}"`);
    byId.set(step.id, clone(step));
  }

  const newPlan = assertPlan({
    ...oldPlan,
    version: oldPlan.version + 1,
    constraints: [...oldPlan.constraints, ...(checkedPatch.addConstraints ?? [])],
    assumptions: [...oldPlan.assumptions, ...(checkedPatch.addAssumptions ?? [])],
    steps: [...byId.values()],
    metadata: {
      ...(oldPlan.metadata ?? {}),
      previousVersion: oldPlan.version,
      lastPatchReason: checkedPatch.reason,
    },
  });

  const resetIds = transitiveDependents(newPlan, touched);
  const nextState = clone(oldState);
  nextState.planVersion = newPlan.version;
  nextState.status = 'planned';

  for (const step of newPlan.steps) {
    if (!nextState.stepStates[step.id]) {
      nextState.stepStates[step.id] = { status: 'pending', attempts: 0, result: null, lastError: null };
    }
  }
  for (const id of resetIds) {
    nextState.stepStates[id] = { status: 'pending', attempts: 0, result: null, lastError: null };
  }
  nextState.replans.push({
    fromVersion: oldPlan.version,
    toVersion: newPlan.version,
    reason: checkedPatch.reason,
    evidence: clone(checkedPatch.evidence),
    resetSteps: [...resetIds],
  });

  return { plan: newPlan, state: nextState, resetSteps: [...resetIds] };
}

export function decideFromVerification({ plan, state, stepId, verdict }) {
  const checkedPlan = assertPlan(plan);
  const checkedState = assertTaskState(state);
  const step = checkedPlan.steps.find((item) => item.id === stepId);
  if (!step) throw new Error(`unknown step "${stepId}"`);
  if (!verdict || typeof verdict !== 'object' || Array.isArray(verdict)) throw new Error('verdict must be an object');

  if (verdict.kind === 'PASS') {
    if (isTaskComplete(checkedPlan, checkedState)) return { action: 'FINISH' };
    return { action: 'CONTINUE' };
  }
  if (verdict.kind === 'RETRY') {
    const attempts = checkedState.stepStates[stepId]?.attempts ?? 0;
    const maxAttempts = step.maxAttempts ?? 2;
    if (attempts < maxAttempts) {
      return assertReplanDecision({
        action: 'RETRY',
        reason: 'QUALITY_GATE_FAILED',
        evidence: verdict.evidence?.length ? verdict.evidence : ['verification requested retry'],
      });
    }
    return assertReplanDecision({
      action: 'REBUILD_PLAN',
      reason: 'STEP_FAILED',
      evidence: verdict.evidence?.length ? verdict.evidence : ['retry budget exhausted'],
    });
  }
  if (verdict.kind === 'REPLAN') {
    if (!REPLAN_REASONS.includes(verdict.reason)) throw new Error('REPLAN verdict requires a valid reason');
    const action = verdict.patch ? 'PATCH_PLAN' : 'REBUILD_PLAN';
    return assertReplanDecision({
      action,
      reason: verdict.reason,
      evidence: verdict.evidence ?? [],
      patch: verdict.patch,
    });
  }
  if (verdict.kind === 'BLOCKED') {
    return assertReplanDecision({
      action: 'ESCALATE',
      reason: verdict.reason && REPLAN_REASONS.includes(verdict.reason) ? verdict.reason : 'MISSING_DEPENDENCY',
      evidence: verdict.evidence?.length ? verdict.evidence : ['step is blocked'],
    });
  }
  throw new Error(`unsupported verification verdict: ${verdict.kind}`);
}
