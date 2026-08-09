import test from 'node:test';
import assert from 'node:assert/strict';

import { validateDecisionSpec } from '../lib/decision-spec.js';
import { selectDecisionMethods } from '../lib/method-router.js';

const baseSpec = {
  version: '1.0',
  decision: { id: 'launch', title: 'Choose launch approach' },
  alternatives: [
    { id: 'full', name: 'Full launch' },
    { id: 'test', name: 'Small test' },
    { id: 'wait', name: 'Do nothing for now' },
  ],
  evidence: [
    { id: 'budget', kind: 'fact', confidence: 1 },
    { id: 'conversion', kind: 'prior', confidence: 0.5 },
  ],
};

test('DecisionSpec accepts a minimal valid decision', () => {
  assert.deepEqual(validateDecisionSpec(baseSpec), { valid: true, errors: [] });
});

test('DecisionSpec rejects partial criterion weights', () => {
  const spec = {
    ...baseSpec,
    criteria: [
      { id: 'money', name: 'Money', direction: 'max', weight: 0.7 },
      { id: 'stress', name: 'Stress', direction: 'min' },
    ],
  };
  const result = validateDecisionSpec(spec);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /either all criteria must have weights/);
});

test('router selects expected utility for probabilistic outcomes', () => {
  const spec = {
    ...baseSpec,
    alternatives: baseSpec.alternatives.map((alternative) => ({
      ...alternative,
      outcomes: [
        { value: 100, p: 0.5 },
        { value: -20, p: 0.5 },
      ],
    })),
  };
  assert.deepEqual(selectDecisionMethods(spec), ['expected-utility']);
});

test('router selects MCDA for fully weighted multi-criteria scores', () => {
  const spec = {
    ...baseSpec,
    criteria: [
      { id: 'money', name: 'Money', direction: 'max', weight: 0.6 },
      { id: 'stress', name: 'Stress', direction: 'min', weight: 0.4 },
    ],
    alternatives: baseSpec.alternatives.map((alternative, index) => ({
      ...alternative,
      scores: { money: 10 - index, stress: 4 + index },
    })),
  };
  assert.deepEqual(selectDecisionMethods(spec), ['mcda']);
});

test('router uses Pareto when criteria have no complete weights', () => {
  const spec = {
    ...baseSpec,
    criteria: [
      { id: 'money', name: 'Money', direction: 'max' },
      { id: 'stress', name: 'Stress', direction: 'min' },
    ],
    alternatives: baseSpec.alternatives.map((alternative, index) => ({
      ...alternative,
      scores: { money: 10 - index, stress: 4 + index },
    })),
  };
  assert.deepEqual(selectDecisionMethods(spec), ['mcda', 'pareto']);
});

test('router adds sensitivity when parameter ranges exist', () => {
  const spec = {
    ...baseSpec,
    parameters: [{ id: 'conversion', range: [0.01, 0.08] }],
  };
  assert.deepEqual(selectDecisionMethods(spec), ['sensitivity']);
});
