import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as bandit from '../lib/bandit.js';
import { precision, sampleSize, importanceGain, pareto, robust } from '../lib/validation.js';
import { describeGamma, gammaFromHalfLife, discountedReturn, horizonValue, prune } from '../lib/discount.js';
import * as game from '../lib/game.js';
import { brier, assignCredit } from '../lib/calibration.js';
import { updateBelief, entropy, trackLevel } from '../lib/belief.js';

const close = (a, b, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) < tol, `expected ${a} within ${tol} of ${b}`);

test('a zero-win arm does not get a zero estimate', () => {
  const p = bandit.posterior({ name: 'new', wins: 0, losses: 14 });
  assert.ok(p.mean > 0, 'uniform prior must keep the estimate off zero');
  close(p.mean, 1 / 16, 1e-9); // Beta(1, 15)
});

test('Thompson shares favour the better arm but never starve the uncertain one', () => {
  const arms = [
    { name: 'proven', wins: 60, losses: 240 },
    { name: 'unknown', wins: 2, losses: 6 },
  ];
  const scored = bandit.thompson(arms, { draws: 20000, seed: 3 });
  const unknown = scored.find((s) => s.arm === 'unknown');
  assert.ok(unknown.share > 0.15,
    `an arm with 8 observations must retain real probability of being best, got ${unknown.share}`);
});

test('thompson is reproducible for a fixed seed', () => {
  const arms = [{ name: 'a', wins: 5, losses: 5 }, { name: 'b', wins: 7, losses: 3 }];
  const x = bandit.thompson(arms, { draws: 5000, seed: 11 });
  const y = bandit.thompson(arms, { draws: 5000, seed: 11 });
  assert.deepEqual(x.map((r) => r.share), y.map((r) => r.share));
});

test('UCB1 puts an untried arm ahead of a mediocre proven one', () => {
  const arms = [
    { name: 'proven', wins: 30, losses: 70 },
    { name: 'untried', wins: 0, losses: 0 },
  ];
  assert.equal(bandit.ucb1(arms, 1)[0].arm, 'untried');
});

test('allocation floors keep every arm funded and shares sum to one', () => {
  const scored = bandit.greedy([
    { name: 'a', wins: 50, losses: 50 },
    { name: 'b', wins: 1, losses: 99 },
    { name: 'c', wins: 0, losses: 40 },
  ]);
  const split = bandit.allocate(scored, { budget: 40, floor: 0.1 });
  close(split.reduce((s, x) => s + x.share, 0), 1, 1e-9);
  close(split.reduce((s, x) => s + x.amount, 0), 40, 1e-9);
  assert.ok(split.every((x) => x.share >= 0.1));
});

test('an impossible floor is rejected rather than producing negative shares', () => {
  const scored = bandit.greedy([{ name: 'a', wins: 1, losses: 1 }, { name: 'b', wins: 1, losses: 1 }]);
  assert.throws(() => bandit.allocate(scored, { floor: 0.6 }), /exceeds 100%/);
});

test('underExplored names the arms that have not earned a verdict', () => {
  const starved = bandit.underExplored([
    { name: 'a', wins: 5, losses: 5 },
    { name: 'b', wins: 200, losses: 400 },
  ], 30);
  assert.deepEqual(starved.map((x) => x.arm), ['a']);
});

test('a rate of zero gets a usable interval instead of a point at zero', () => {
  const r = precision({ successes: 0, trials: 500 });
  close(r.estimate, 0, 1e-12);
  assert.ok(r.interval[1] > 0, 'upper bound must be above zero');
  assert.equal(r.relativeSe, Infinity);
  assert.match(r.note, /beta interval/);
});

test('precision from raw samples reports a two-sided interval', () => {
  const r = precision({ samples: [10, 12, 9, 11, 13, 8, 10, 12] });
  close(r.estimate, 10.625, 1e-9);
  assert.ok(r.interval[0] < r.estimate && r.estimate < r.interval[1]);
});

test('rare events need far more trials than common ones', () => {
  const rare = sampleSize({ p: 0.001, targetRelativeSe: 0.1 });
  const common = sampleSize({ p: 0.3, targetRelativeSe: 0.1 });
  assert.ok(rare > common * 100, `${rare} should dwarf ${common}`);
  close(rare, Math.ceil(0.999 / (0.001 * 0.01)), 1);
});

test('oversampling a rare segment is worth many plain runs', () => {
  const g = importanceGain({ trueRate: 0.002, proposalRate: 0.1, n: 10000 });
  assert.ok(g.expectedHits > g.directHits * 10);
  assert.ok(g.equivalentDirectSamples > 10000);
  close(g.weightOnHit, 0.02, 1e-9);
});

test('pareto keeps everything that is best at something', () => {
  const { frontier, dominated } = pareto([
    { name: 'x', rev: 10, load: 1 },
    { name: 'y', rev: 5, load: 5 },
    { name: 'z', rev: 8, load: 2 },
  ], { rev: 'max', load: 'min' });
  assert.deepEqual(frontier.map((o) => o.name), ['x']);
  assert.deepEqual(dominated.map((o) => o.name).sort(), ['y', 'z']);
});

test('robust separates the best bet from the safest bet', () => {
  const r = robust({
    gamble: { good: 100, bad: -50 },
    steady: { good: 30, bad: 20 },
  });
  assert.equal(r.maxExpected.action, 'gamble');
  assert.equal(r.maximin.action, 'steady');
  close(r.rows.find((x) => x.action === 'gamble').maxRegret, 70, 1e-9);
});

test('discount factor and half-life are inverses', () => {
  const gamma = gammaFromHalfLife(6);
  close(describeGamma(gamma).halfLife, 6, 1e-9);
  close(describeGamma(0.9).effectiveHorizon, 10, 1e-9);
});

test('discounted return weights the present more heavily', () => {
  close(discountedReturn([100, 100], 0.5), 150, 1e-9);
});

test('horizon stops where the curve flattens', () => {
  const r = horizonValue({ 2: 40, 4: 58, 8: 71, 16: 76, 32: 76.5 }, { tolerance: 0.05 });
  assert.equal(r.sufficientDepth, 16);
});

test('branch and bound prunes candidates that cannot beat the incumbent', () => {
  const r = prune([
    { name: 'known good', ceiling: 60, floor: 40 },
    { name: 'hopeless', ceiling: 25 },
    { name: 'promising', ceiling: 95 },
  ]);
  assert.equal(r.incumbent, 'known good');
  assert.deepEqual(r.prune.map((c) => c.name), ['hopeless']);
  assert.deepEqual(r.keep.map((c) => c.name), ['promising', 'known good']);
});

const prisoners = {
  players: ['a', 'b'],
  actions: { a: ['cooperate', 'defect'], b: ['cooperate', 'defect'] },
  payoffs: {
    'cooperate|cooperate': [-1, -1],
    'cooperate|defect': [-4, 0],
    'defect|cooperate': [0, -4],
    'defect|defect': [-3, -3],
  },
};

test('prisoners dilemma has defect as a dominant strategy for both', () => {
  assert.deepEqual(game.dominantStrategies(prisoners), { a: 'defect', b: 'defect' });
  const nash = game.pureNash(prisoners);
  assert.equal(nash.length, 1);
  assert.deepEqual(nash[0].joint, ['defect', 'defect']);
});

test('softmax response approaches the best response as precision rises', () => {
  const policy = [{ cooperate: 0.5, defect: 0.5 }, { cooperate: 0.5, defect: 0.5 }];
  const soft = game.softmaxResponse(prisoners, policy, 0, 0.01);
  close(soft.defect, 0.5, 0.02); // near-indifference at low precision
  const sharp = game.softmaxResponse(prisoners, policy, 0, 20);
  assert.ok(sharp.defect > 0.99);
});

test('matching pennies has no pure equilibrium and iterated best response cycles', () => {
  const pennies = {
    players: ['a', 'b'],
    actions: { a: ['heads', 'tails'], b: ['heads', 'tails'] },
    payoffs: {
      'heads|heads': [1, -1], 'heads|tails': [-1, 1],
      'tails|heads': [-1, 1], 'tails|tails': [1, -1],
    },
  };
  assert.equal(game.pureNash(pennies).length, 0);
  const ibr = game.iteratedBestResponse(pennies);
  assert.equal(ibr.converged, false);
  assert.ok(ibr.cycle && ibr.cycle.length > 1);
});

test('fictitious play best-responds to observed frequencies', () => {
  const r = game.fictitiousPlay(prisoners, { b: { cooperate: 90, defect: 1 } }, { me: 0 });
  assert.ok(r.beliefs.b.cooperate > 0.9);
  assert.equal(r.bestResponse.action, 'defect');
});

test('a perfect forecaster scores zero and a coin-flipper scores 0.25', () => {
  close(brier([{ p: 1, outcome: true }, { p: 0, outcome: false }]).brier, 0, 1e-12);
  close(brier([{ p: 0.5, outcome: true }, { p: 0.5, outcome: false }]).brier, 0.25, 1e-12);
});

test('systematic overconfidence is detected', () => {
  const records = [];
  for (let i = 0; i < 20; i++) records.push({ p: 0.9, outcome: i < 10 }); // says 90%, delivers 50%
  const r = brier(records);
  assert.equal(r.verdict, 'overconfident');
  assert.ok(r.reliability > 0.1);
});

test('credit decays with age but does not vanish', () => {
  const rows = assignCredit([
    { name: 'recent', periodsAgo: 0 },
    { name: 'old', periodsAgo: 4 },
  ], { lambda: 0.7, total: 1 });
  assert.equal(rows[0].decision, 'recent');
  assert.ok(rows[1].share > 0.1, 'a four-period-old decision still deserves visible credit');
  close(rows[0].share + rows[1].share, 1, 1e-9);
});

test('belief update concentrates on the explanation that fits the evidence', () => {
  const { belief } = updateBelief(
    { bug: 0.5, algorithm: 0.5 },
    null,
    { bug: 0.05, algorithm: 0.8 });
  assert.ok(belief.algorithm > 0.9);
  close(belief.bug + belief.algorithm, 1, 1e-9);
  assert.ok(entropy({ a: 0.5, b: 0.5 }) === 1);
});

test('an observation impossible under every state is an error, not a silent zero', () => {
  assert.throws(
    () => updateBelief({ a: 0.5, b: 0.5 }, null, { a: 0, b: 0 }),
    /zero likelihood/);
});

test('the filter tracks a real level shift and ignores pure jitter', () => {
  const flat = [100, 101, 99, 100, 102, 98, 100, 101];
  const r = trackLevel(flat, { processVar: 0.1, observationVar: 4 });
  assert.ok(Math.abs(r.level - 100) < 3);
  assert.equal(r.latestIsSurprising, false);

  const jump = [...flat, 140];
  const s = trackLevel(jump, { processVar: 0.1, observationVar: 4 });
  assert.equal(s.latestIsSurprising, true);
});
