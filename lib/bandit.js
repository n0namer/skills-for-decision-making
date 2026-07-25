// Exploration strategies for allocating a scarce resource across arms.
// Kochenderfer, Wheeler & Wray, Algorithms for Decision Making, ch. 15-16.
//
// An "arm" here is whatever you are allocating to: a product, a channel, an ad
// creative, a landing page. Wins and losses are whatever counts as success.

import { betaMean, betaQuantile, betaStd, sampleBeta, rng, probGreater } from './stats.js';

/**
 * Posterior over an arm's success rate.
 * Uniform prior Beta(1,1) unless the arm carries its own priorWins/priorLosses.
 * Pseudocounts are how you encode "we already know roughly what to expect"
 * without pretending you observed data you did not.
 */
export function posterior(arm) {
  const a = (arm.priorWins ?? 1) + (arm.wins ?? 0);
  const b = (arm.priorLosses ?? 1) + (arm.losses ?? 0);
  return { a, b, mean: betaMean(a, b), std: betaStd(a, b), n: (arm.wins ?? 0) + (arm.losses ?? 0) };
}

/** Greedy: always the highest posterior mean. Exploits, never explores. */
export function greedy(arms) {
  return score(arms, (p) => p.mean);
}

/**
 * UCB1: posterior mean plus c*sqrt(log N / N_a).
 * Optimism in the face of uncertainty. c scales how much an untried arm is
 * worth trying; c=1 is a reasonable start when rewards are in [0,1].
 */
export function ucb1(arms, c = 1) {
  const N = arms.reduce((s, arm) => {
    const p = posterior(arm);
    return s + p.a + p.b;
  }, 0);
  return score(arms, (p) => p.mean + c * Math.sqrt(Math.log(N) / (p.a + p.b)));
}

/** Quantile (interval estimation): rank by the upper end of a credible interval. */
export function quantile(arms, alpha = 0.9) {
  return score(arms, (p) => betaQuantile(alpha, p.a, p.b));
}

/**
 * Thompson sampling (posterior sampling). Draw once from each posterior, take
 * the max. No tuning parameters, and the long-run allocation converges to the
 * probability each arm is best, which is exactly the split you want.
 * Averaged over `draws` samples to report a stable allocation share.
 */
export function thompson(arms, { draws = 20000, seed = 1 } = {}) {
  const random = rng(seed);
  const posts = arms.map(posterior);
  const wins = new Array(arms.length).fill(0);
  for (let i = 0; i < draws; i++) {
    let bestIdx = 0, bestVal = -Infinity;
    for (let j = 0; j < posts.length; j++) {
      const v = sampleBeta(posts[j].a, posts[j].b, random);
      if (v > bestVal) { bestVal = v; bestIdx = j; }
    }
    wins[bestIdx]++;
  }
  return arms.map((arm, i) => ({
    arm: arm.name,
    ...posts[i],
    share: wins[i] / draws,
    score: wins[i] / draws,
  })).sort((x, y) => y.score - x.score);
}

/**
 * R-MAX style optimism: any arm observed fewer than `m` times is treated as
 * maximally promising and gets pulled first. This is the guard against killing
 * something after three bad days.
 * Returns the under-explored arms, in order of how starved they are.
 */
export function underExplored(arms, m = 30) {
  return arms
    .map((arm) => ({ arm: arm.name, n: (arm.wins ?? 0) + (arm.losses ?? 0), needed: m }))
    .filter((x) => x.n < m)
    .sort((x, y) => x.n - y.n);
}

/** Pairwise P(arm i beats arm j) for the top arms; the honest version of "X is winning". */
export function dominance(arms) {
  const posts = arms.map(posterior);
  const out = [];
  for (let i = 0; i < arms.length; i++) {
    for (let j = 0; j < arms.length; j++) {
      if (i === j) continue;
      out.push({
        a: arms[i].name,
        b: arms[j].name,
        p: probGreater(posts[i].a, posts[i].b, posts[j].a, posts[j].b),
      });
    }
  }
  return out;
}

/**
 * Turn scores into a budget split. `floor` reserves a minimum share for every
 * arm so that no arm is ever fully starved of evidence (the epsilon in
 * epsilon-greedy, expressed as a budget line rather than a coin flip).
 */
export function allocate(scored, { budget = 100, floor = 0.05 } = {}) {
  const n = scored.length;
  if (floor * n > 1) throw new Error(`floor ${floor} x ${n} arms exceeds 100% of budget`);
  const total = scored.reduce((s, x) => s + Math.max(x.score, 0), 0);
  const free = 1 - floor * n;
  return scored.map((x) => {
    const share = floor + (total > 0 ? (Math.max(x.score, 0) / total) * free : free / n);
    return { arm: x.arm, share, amount: share * budget, mean: x.mean, n: x.n };
  });
}

function score(arms, fn) {
  return arms.map((arm) => {
    const p = posterior(arm);
    return { arm: arm.name, ...p, score: fn(p) };
  }).sort((x, y) => y.score - x.score);
}
