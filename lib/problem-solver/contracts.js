const PLAN_ID_RE = /^[A-Za-z0-9._:-]+$/;
const STEP_ID_RE = /^[A-Za-z0-9._:-]+$/;

export const TASK_MODES = Object.freeze(['L0', 'L1', 'L2', 'L3']);
export const TASK_STATUSES = Object.freeze(['planned', 'running', 'blocked', 'completed', 'failed']);
export const STEP_STATUSES = Object.freeze(['pending', 'running', 'completed', 'failed', 'blocked']);
export const REPLAN_ACTIONS = Object.freeze([
  'CONTINUE',
  'RETRY',
  'PATCH_PLAN',
  'REBUILD_PLAN',
  'BACKTRACK',
  'ESCALATE',
  'FINISH',
]);
export const REPLAN_REASONS = Object.freeze([
  'NEW_FACT',
  'NEW_CONSTRAINT',
  'ASSUMPTION_FAILED',
  'STEP_FAILED',
  'QUALITY_GATE_FAILED',
  'MISSING_DEPENDENCY',
  'BETTER_FLOW_FOUND',
  'BUDGET_RISK',
  'DEADLINE_RISK',
  'GOAL_CHANGED',
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function requireObject(value, name) {
  if (!isObject(value)) throw new Error(`${name} must be an object`);
  return value;
}

function requireString(value, name, { pattern = null } = {}) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} must be a non-empty string`);
  if (pattern && !pattern.test(value)) throw new Error(`${name} has invalid format`);
  return value;
}

function requireArray(value, name) {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value;
}

function assertUnique(values, name) {
  if (new Set(values).size !== values.length) throw new Error(`${name} must be unique`);
}

function assertEnum(value, allowed, name) {
  if (!allowed.includes(value)) throw new Error(`${name} must be one of: ${allowed.join(', ')}`);
}

export function assertTaskSpec(task) {
  requireObject(task, 'TaskSpec');
  requireString(task.id, 'TaskSpec.id');
  requireString(task.goal, 'TaskSpec.goal');
  assertEnum(task.mode, TASK_MODES, 'TaskSpec.mode');
  requireArray(task.successCriteria ?? [], 'TaskSpec.successCriteria');
  requireArray(task.constraints ?? [], 'TaskSpec.constraints');
  return clone(task);
}

export function assertPlanStep(step, index = null) {
  const label = index === null ? 'PlanStep' : `Plan.steps[${index}]`;
  requireObject(step, label);
  requireString(step.id, `${label}.id`, { pattern: STEP_ID_RE });
  requireString(step.title, `${label}.title`);
  requireArray(step.dependsOn ?? [], `${label}.dependsOn`);
  for (const dep of step.dependsOn ?? []) requireString(dep, `${label}.dependsOn[]`, { pattern: STEP_ID_RE });
  requireArray(step.primitiveIds ?? [], `${label}.primitiveIds`);
  requireArray(step.dod ?? [], `${label}.dod`);
  if (step.flowId !== null && step.flowId !== undefined) requireString(step.flowId, `${label}.flowId`);
  if (step.maxAttempts !== undefined && (!Number.isInteger(step.maxAttempts) || step.maxAttempts < 1)) {
    throw new Error(`${label}.maxAttempts must be an integer >= 1`);
  }
  return clone(step);
}

function assertPlanGraph(steps) {
  const ids = steps.map((step) => step.id);
  assertUnique(ids, 'Plan step ids');
  const idSet = new Set(ids);
  for (const step of steps) {
    for (const dep of step.dependsOn ?? []) {
      if (!idSet.has(dep)) throw new Error(`Plan step "${step.id}" depends on unknown step "${dep}"`);
      if (dep === step.id) throw new Error(`Plan step "${step.id}" cannot depend on itself`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const byId = new Map(steps.map((step) => [step.id, step]));
  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`Plan contains a dependency cycle at "${id}"`);
    visiting.add(id);
    for (const dep of byId.get(id)?.dependsOn ?? []) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
}

export function assertPlan(plan) {
  requireObject(plan, 'Plan');
  requireString(plan.id, 'Plan.id', { pattern: PLAN_ID_RE });
  if (!Number.isInteger(plan.version) || plan.version < 1) throw new Error('Plan.version must be an integer >= 1');
  requireString(plan.goal, 'Plan.goal');
  requireArray(plan.constraints ?? [], 'Plan.constraints');
  requireArray(plan.assumptions ?? [], 'Plan.assumptions');
  requireArray(plan.successCriteria ?? [], 'Plan.successCriteria');
  const steps = requireArray(plan.steps, 'Plan.steps').map((step, i) => assertPlanStep(step, i));
  assertPlanGraph(steps);
  return clone({ ...plan, steps });
}

export function createPlan({
  id,
  goal,
  constraints = [],
  assumptions = [],
  successCriteria = [],
  steps = [],
  metadata = {},
}) {
  return assertPlan({
    id,
    version: 1,
    goal,
    constraints: clone(constraints),
    assumptions: clone(assumptions),
    successCriteria: clone(successCriteria),
    steps: clone(steps),
    metadata: clone(metadata),
  });
}

export function assertPlanPatch(patch, plan = null) {
  requireObject(patch, 'PlanPatch');
  requireString(patch.planId, 'PlanPatch.planId', { pattern: PLAN_ID_RE });
  if (!Number.isInteger(patch.baseVersion) || patch.baseVersion < 1) throw new Error('PlanPatch.baseVersion must be an integer >= 1');
  assertEnum(patch.reason, REPLAN_REASONS, 'PlanPatch.reason');
  const evidence = requireArray(patch.evidence, 'PlanPatch.evidence');
  if (evidence.length === 0) throw new Error('PlanPatch.evidence must contain at least one item');
  requireArray(patch.addConstraints ?? [], 'PlanPatch.addConstraints');
  requireArray(patch.addAssumptions ?? [], 'PlanPatch.addAssumptions');
  requireArray(patch.addSteps ?? [], 'PlanPatch.addSteps');
  requireArray(patch.updateSteps ?? [], 'PlanPatch.updateSteps');
  requireArray(patch.invalidateSteps ?? [], 'PlanPatch.invalidateSteps');

  if (plan) {
    const checkedPlan = assertPlan(plan);
    if (patch.planId !== checkedPlan.id) throw new Error('PlanPatch.planId does not match Plan.id');
    if (patch.baseVersion !== checkedPlan.version) throw new Error('PlanPatch.baseVersion is stale');
    const ids = new Set(checkedPlan.steps.map((step) => step.id));
    for (const id of patch.invalidateSteps ?? []) {
      if (!ids.has(id)) throw new Error(`PlanPatch invalidates unknown step "${id}"`);
    }
    for (const item of patch.updateSteps ?? []) {
      requireObject(item, 'PlanPatch.updateSteps[]');
      requireString(item.id, 'PlanPatch.updateSteps[].id', { pattern: STEP_ID_RE });
      if (!ids.has(item.id)) throw new Error(`PlanPatch updates unknown step "${item.id}"`);
      requireObject(item.changes, 'PlanPatch.updateSteps[].changes');
      if ('id' in item.changes) throw new Error('PlanPatch cannot change a step id');
    }
  }

  return clone(patch);
}

export function assertReplanDecision(decision) {
  requireObject(decision, 'ReplanDecision');
  assertEnum(decision.action, REPLAN_ACTIONS, 'ReplanDecision.action');
  if (decision.action === 'CONTINUE' || decision.action === 'FINISH') {
    if (decision.reason !== undefined && decision.reason !== null) {
      assertEnum(decision.reason, REPLAN_REASONS, 'ReplanDecision.reason');
    }
  } else {
    assertEnum(decision.reason, REPLAN_REASONS, 'ReplanDecision.reason');
    const evidence = requireArray(decision.evidence, 'ReplanDecision.evidence');
    if (evidence.length === 0) throw new Error('ReplanDecision.evidence must contain at least one item');
  }
  if (decision.action === 'PATCH_PLAN' && !decision.patch) throw new Error('PATCH_PLAN requires decision.patch');
  return clone(decision);
}

export function createTaskState(taskSpec, plan) {
  const task = assertTaskSpec(taskSpec);
  const checkedPlan = assertPlan(plan);
  const stepStates = Object.fromEntries(checkedPlan.steps.map((step) => [step.id, {
    status: 'pending',
    attempts: 0,
    result: null,
    lastError: null,
  }]));
  return {
    taskId: task.id,
    mode: task.mode,
    status: 'planned',
    planId: checkedPlan.id,
    planVersion: checkedPlan.version,
    stepStates,
    observations: [],
    replans: [],
  };
}
