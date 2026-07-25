import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  utility, inverseUtility, expectedUtility, expectedValue,
  certaintyEquivalent, riskPremium, maximumExpectedUtility,
} from '../lib/utility.js';
import { valueOfInformation, rankObservations, bestAction } from '../lib/voi.js';

const close = (a, b, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) < tol, `expected ${a} within ${tol} of ${b}`);

test('umbrella decision reproduces Algorithms for Decision Making example 6.3', () => {
  const bring = [
    { value: -0.1, p: 0.9 },  // rain, with umbrella
    { value: 0.9, p: 0.1 },   // sun, with umbrella
  ];
  const leave = [
    { value: -1, p: 0.9 },
    { value: 1, p: 0.1 },
  ];
  close(expectedUtility(bring, { form: 'linear' }), 0, 1e-9);
  close(expectedUtility(leave, { form: 'linear' }), -0.8, 1e-9);

  const res = maximumExpectedUtility(
    [{ action: 'bring umbrella', outcomes: bring }, { action: 'leave umbrella', outcomes: leave }],
    { form: 'linear' });
  assert.equal(res.best.action, 'bring umbrella');
});

test('a lottery that does not sum to one is rejected', () => {
  assert.throws(
    () => expectedUtility([{ value: 1, p: 0.5 }, { value: 2, p: 0.2 }], { form: 'linear' }),
    /sum to 0\.70/);
});

test('utility forms round-trip through their inverse', () => {
  for (const form of ['linear', 'log', 'power']) {
    const opts = { form, lambda: 2 };
    close(inverseUtility(utility(50, opts), opts), 50, 1e-6);
  }
  // Exponential utility only round-trips while it has not saturated.
  const cara = { form: 'exponential', lambda: 0.02 };
  close(inverseUtility(utility(50, cara), cara), 50, 1e-6);
});

test('a saturated exponential utility says so instead of returning infinity', () => {
  const opts = { form: 'exponential', lambda: 2 };
  assert.throws(() => inverseUtility(utility(50, opts), opts), /saturated/);
});

test('log utility is risk averse, linear utility is not', () => {
  const coinFlip = [{ value: 200000, p: 0.5 }, { value: 50000, p: 0.5 }];
  close(expectedValue(coinFlip), 125000, 1e-9);
  const ceLog = certaintyEquivalent(coinFlip, { form: 'log' });
  assert.ok(ceLog < 125000, 'log utility must discount the gamble');
  close(ceLog, Math.sqrt(200000 * 50000), 1e-3); // geometric mean
  assert.ok(riskPremium(coinFlip, { form: 'log' }) > 0);
  close(riskPremium(coinFlip, { form: 'linear' }), 0, 1e-9);
});

const pricingProblem = {
  states: [
    { name: 'tolerant', p: 0.5 },
    { name: 'resistant', p: 0.5 },
  ],
  actions: [
    { name: 'raise', utility: { tolerant: 100, resistant: -60 } },
    { name: 'hold', utility: { tolerant: 0, resistant: 0 } },
  ],
};

test('value of information is zero when the observation cannot change the action', () => {
  const useless = {
    name: 'read a blog post',
    cost: 0,
    outcomes: [
      { name: 'upbeat', likelihood: { tolerant: 0.5, resistant: 0.5 } },
      { name: 'downbeat', likelihood: { tolerant: 0.5, resistant: 0.5 } },
    ],
  };
  const res = valueOfInformation(pricingProblem, useless, { form: 'linear' });
  close(res.voi, 0, 1e-9);
  assert.equal(res.changesDecision, false);
  assert.equal(res.worthObserving, false);
});

test('perfect information equals E[max] minus max[E]', () => {
  const oracle = {
    name: 'oracle',
    cost: 0,
    outcomes: [
      { name: 'says tolerant', likelihood: { tolerant: 1, resistant: 0 } },
      { name: 'says resistant', likelihood: { tolerant: 0, resistant: 1 } },
    ],
  };
  const res = valueOfInformation(pricingProblem, oracle, { form: 'linear' });
  // With the oracle: 0.5*100 + 0.5*0 = 50. Without: max(20, 0) = 20.
  close(res.baselineEu, 20, 1e-9);
  close(res.voi, 30, 1e-9);
  assert.equal(res.changesDecision, true);
});

test('value of information is never negative and cost is subtracted separately', () => {
  const noisy = {
    name: 'small survey',
    cost: 45,
    outcomes: [
      { name: 'positive', likelihood: { tolerant: 0.7, resistant: 0.3 } },
      { name: 'negative', likelihood: { tolerant: 0.3, resistant: 0.7 } },
    ],
  };
  const res = valueOfInformation(pricingProblem, noisy, { form: 'linear' });
  assert.ok(res.voi >= 0);
  close(res.netVoi, res.voi - 45, 1e-9);
});

test('malformed likelihood tables are rejected rather than silently rescaled', () => {
  assert.throws(() => valueOfInformation(pricingProblem, {
    name: 'broken',
    outcomes: [{ name: 'only', likelihood: { tolerant: 0.6, resistant: 0.6 } }],
  }, { form: 'linear' }), /sum to/);
});

test('observations rank by net value, not raw value', () => {
  const problem = {
    ...pricingProblem,
    observations: [
      {
        name: 'cheap and weak',
        cost: 1,
        outcomes: [
          { name: 'a', likelihood: { tolerant: 0.6, resistant: 0.4 } },
          { name: 'b', likelihood: { tolerant: 0.4, resistant: 0.6 } },
        ],
      },
      {
        name: 'expensive and perfect',
        cost: 1000,
        outcomes: [
          { name: 'a', likelihood: { tolerant: 1, resistant: 0 } },
          { name: 'b', likelihood: { tolerant: 0, resistant: 1 } },
        ],
      },
    ],
  };
  const ranked = rankObservations(problem, { form: 'linear' });
  assert.equal(ranked[0].observation, 'cheap and weak');
  assert.ok(ranked[1].netVoi < 0, 'the perfect but overpriced study must score negative');
});

test('bestAction picks the highest expected utility under a belief', () => {
  const belief = { tolerant: 0.9, resistant: 0.1 };
  assert.equal(bestAction(pricingProblem.actions, belief, pricingProblem.states, { form: 'linear' }).name, 'raise');
});
