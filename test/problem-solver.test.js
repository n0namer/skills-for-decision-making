import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyPlanPatch,
  beginStep,
  createPlan,
  createTaskState,
  decideFromVerification,
  nextReadyStep,
  rankFlowCandidates,
  recordStepOutcome,
  selectTaskMode,
} from '../lib/problem-solver/index.js';

function baseTask() {
  return {
    id: 'task-1',
    goal: 'Find and compare suppliers',
    mode: 'L2',
    successCriteria: ['verified suppliers >= 5'],
    constraints: [],
  };
}

function basePlan() {
  return createPlan({
    id: 'plan-1',
    goal: 'Find and compare suppliers',
    successCriteria: ['verified suppliers >= 5'],
    steps: [
      { id: 'discover', title: 'Discover candidates', dependsOn: [], primitiveIds: ['web.search'], dod: ['candidates >= 10'] },
      { id: 'verify', title: 'Verify candidates', dependsOn: ['discover'], primitiveIds: ['company.verify'], dod: ['verified >= 5'] },
      { id: 'report', title: 'Create report', dependsOn: ['verify'], primitiveIds: [], dod: ['report complete'] },
    ],
  });
}

test('task mode routing uses smallest sufficient execution mode', () => {
  assert.equal(selectTaskMode({ hasDirectPrimitive: true }), 'L0');
  assert.equal(selectTaskMode({ hasStableFlow: true }), 'L1');
  assert.equal(selectTaskMode({ requiresPlanning: true, hasStableFlow: true }), 'L2');
  assert.equal(selectTaskMode({ openEnded: true, hasStableFlow: true }), 'L3');
});

test('plan validation rejects cycles', () => {
  assert.throws(() => createPlan({
    id: 'cyclic',
    goal: 'bad plan',
    steps: [
      { id: 'a', title: 'A', dependsOn: ['b'], primitiveIds: [], dod: [] },
      { id: 'b', title: 'B', dependsOn: ['a'], primitiveIds: [], dod: [] },
    ],
  }), /dependency cycle/);
});

test('controller exposes only dependency-ready step', () => {
  const plan = basePlan();
  const state = createTaskState(baseTask(), plan);
  assert.equal(nextReadyStep(plan, state).id, 'discover');
});

test('completed step unlocks its dependent step', () => {
  const plan = basePlan();
  let state = createTaskState(baseTask(), plan);
  state = beginStep(plan, state, 'discover');
  state = recordStepOutcome(plan, state, 'discover', { status: 'completed', result: { count: 12 } });
  assert.equal(nextReadyStep(plan, state).id, 'verify');
});

test('PlanPatch increments version and resets touched downstream steps only', () => {
  const plan = basePlan();
  let state = createTaskState(baseTask(), plan);
  for (const stepId of ['discover', 'verify']) {
    state = beginStep(plan, state, stepId);
    state = recordStepOutcome(plan, state, stepId, { status: 'completed', result: { ok: true } });
  }

  const result = applyPlanPatch(plan, state, {
    planId: plan.id,
    baseVersion: plan.version,
    reason: 'NEW_CONSTRAINT',
    evidence: ['warehouse must be in Krasnodar Krai'],
    updateSteps: [{
      id: 'verify',
      changes: { dod: ['verified >= 5', 'warehouse in Krasnodar Krai'] },
    }],
    invalidateSteps: ['verify'],
  });

  assert.equal(result.plan.version, 2);
  assert.deepEqual(new Set(result.resetSteps), new Set(['verify', 'report']));
  assert.equal(result.state.stepStates.discover.status, 'completed');
  assert.equal(result.state.stepStates.verify.status, 'pending');
  assert.equal(result.state.stepStates.report.status, 'pending');
});

test('PlanPatch rejects stale base version', () => {
  const plan = basePlan();
  const state = createTaskState(baseTask(), plan);
  assert.throws(() => applyPlanPatch(plan, state, {
    planId: plan.id,
    baseVersion: 99,
    reason: 'NEW_FACT',
    evidence: ['new evidence'],
    invalidateSteps: ['verify'],
  }), /baseVersion is stale/);
});

test('verification retry escalates to replan when retry budget is exhausted', () => {
  const plan = createPlan({
    id: 'retry-plan',
    goal: 'Retry bounded step',
    steps: [{ id: 'x', title: 'X', dependsOn: [], primitiveIds: [], dod: [], maxAttempts: 1 }],
  });
  let state = createTaskState({ id: 'retry-task', goal: 'Retry bounded step', mode: 'L2', successCriteria: [], constraints: [] }, plan);
  state = beginStep(plan, state, 'x');
  const decision = decideFromVerification({ plan, state, stepId: 'x', verdict: { kind: 'RETRY', evidence: ['quality failed'] } });
  assert.equal(decision.action, 'REBUILD_PLAN');
  assert.equal(decision.reason, 'STEP_FAILED');
});

test('flow selection enforces quality reliability SLA before cost', () => {
  const flows = [
    {
      id: 'cheap-bad', version: 1, status: 'stable', taskFamily: 'sourcing',
      capabilities: ['web.search'], entrypoint: 'x',
      metrics: { quality: 0.7, reliability: 0.99, medianDurationMinutes: 5, medianCostUsd: 0.01 },
    },
    {
      id: 'good-expensive', version: 1, status: 'stable', taskFamily: 'sourcing',
      capabilities: ['web.search'], entrypoint: 'y',
      metrics: { quality: 0.99, reliability: 0.95, medianDurationMinutes: 20, medianCostUsd: 1.0 },
    },
    {
      id: 'good-cheap', version: 1, status: 'stable', taskFamily: 'sourcing',
      capabilities: ['web.search'], entrypoint: 'z',
      metrics: { quality: 0.92, reliability: 0.91, medianDurationMinutes: 20, medianCostUsd: 0.4 },
    },
  ];

  const ranked = rankFlowCandidates(flows, {
    taskFamily: 'sourcing',
    requiredCapabilities: ['web.search'],
    qualityMin: 0.9,
    reliabilityMin: 0.9,
    slaMinutes: 60,
  });
  assert.deepEqual(ranked.map((x) => x.id), ['good-cheap', 'good-expensive']);
});
