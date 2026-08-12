#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  applyPlanPatch,
  assertPlan,
  beginStep,
  createTaskState,
  decideFromVerification,
  loadAssetRegistry,
  nextReadyStep,
  rankFlowCandidates,
  recordObservation,
  recordStepOutcome,
  selectTaskMode,
} from '../lib/problem-solver/index.js';

const args = process.argv.slice(2);
const command = args[0];

function flag(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function readJson(path, label) {
  if (!path) throw new Error(`${label} is required`);
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { throw new Error(`could not read ${path}: ${error.message}`); }
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage(code = 0) {
  const out = code ? process.stderr : process.stdout;
  out.write(
    'Usage:\n' +
    '  sdm-solve mode --signals FILE\n' +
    '  sdm-solve registry [--root DIR]\n' +
    '  sdm-solve validate-plan --plan FILE\n' +
    '  sdm-solve init-state --task FILE --plan FILE\n' +
    '  sdm-solve next-step --plan FILE --state FILE\n' +
    '  sdm-solve begin-step --plan FILE --state FILE --step ID\n' +
    '  sdm-solve record-outcome --plan FILE --state FILE --step ID --outcome FILE\n' +
    '  sdm-solve record-observation --state FILE --observation FILE\n' +
    '  sdm-solve select-flow --query FILE [--root DIR]\n' +
    '  sdm-solve apply-patch --plan FILE --state FILE --patch FILE\n' +
    '  sdm-solve decide --plan FILE --state FILE --step ID --verdict FILE\n',
  );
  process.exit(code);
}

if (!command || ['help', '--help', '-h'].includes(command)) usage(0);

try {
  if (command === 'mode') {
    print({ mode: selectTaskMode(readJson(flag('--signals'), '--signals FILE')) });
  } else if (command === 'registry') {
    print(loadAssetRegistry(resolve(flag('--root') ?? 'registry')));
  } else if (command === 'validate-plan') {
    print({ valid: true, plan: assertPlan(readJson(flag('--plan'), '--plan FILE')) });
  } else if (command === 'init-state') {
    const task = readJson(flag('--task'), '--task FILE');
    const plan = readJson(flag('--plan'), '--plan FILE');
    print(createTaskState(task, plan));
  } else if (command === 'next-step') {
    const plan = readJson(flag('--plan'), '--plan FILE');
    const state = readJson(flag('--state'), '--state FILE');
    print({ step: nextReadyStep(plan, state) });
  } else if (command === 'begin-step') {
    const plan = readJson(flag('--plan'), '--plan FILE');
    const state = readJson(flag('--state'), '--state FILE');
    const stepId = flag('--step');
    if (!stepId) throw new Error('--step ID is required');
    print(beginStep(plan, state, stepId));
  } else if (command === 'record-outcome') {
    const plan = readJson(flag('--plan'), '--plan FILE');
    const state = readJson(flag('--state'), '--state FILE');
    const outcome = readJson(flag('--outcome'), '--outcome FILE');
    const stepId = flag('--step');
    if (!stepId) throw new Error('--step ID is required');
    print(recordStepOutcome(plan, state, stepId, outcome));
  } else if (command === 'record-observation') {
    const state = readJson(flag('--state'), '--state FILE');
    const observation = readJson(flag('--observation'), '--observation FILE');
    print(recordObservation(state, observation));
  } else if (command === 'select-flow') {
    const registry = loadAssetRegistry(resolve(flag('--root') ?? 'registry'));
    const query = readJson(flag('--query'), '--query FILE');
    const candidates = rankFlowCandidates(registry.flows, query);
    print({ best: candidates[0] ?? null, candidates });
  } else if (command === 'apply-patch') {
    const plan = readJson(flag('--plan'), '--plan FILE');
    const state = readJson(flag('--state'), '--state FILE');
    const patch = readJson(flag('--patch'), '--patch FILE');
    print(applyPlanPatch(plan, state, patch));
  } else if (command === 'decide') {
    const plan = readJson(flag('--plan'), '--plan FILE');
    const state = readJson(flag('--state'), '--state FILE');
    const verdict = readJson(flag('--verdict'), '--verdict FILE');
    const stepId = flag('--step');
    if (!stepId) throw new Error('--step ID is required');
    print(decideFromVerification({ plan, state, stepId, verdict }));
  } else {
    throw new Error(`unknown command "${command}"`);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
