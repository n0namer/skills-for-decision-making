// Policy validation: how confident are we, what breaks it, what are we trading.
// Kochenderfer, Wheeler & Wray, Algorithms for Decision Making, ch. 14.

import { normalQuantile, betaQuantile, mean, std } from './stats.js';

/**
 * Standard error and confidence interval for a measured metric.
 * For rare events (small p) the relative standard error is the number that
 * matters: an absolute error of 0.0002 on a 0.0003 metric tells you nothing.
 */
export function precision({ successes, trials, samples, confidence = 0.95 }) {
  const z = normalQuantile(1 - (1 - confidence) / 2);
  if (samples) {
    const m = mean(samples);
    const s = std(samples);
    const se = s / Math.sqrt(samples.length);
    return {
      estimate: m, se, n: samples.length,
      interval: [m - z * se, m + z * se],
      relativeSe: m === 0 ? Infinity : se / Math.abs(m),
    };
  }
  const n = trials;
  const p = successes / n;
  const se = Math.sqrt((p * (1 - p)) / n);
  // Beta posterior interval, which stays sane at 0 or n successes where the
  // normal approximation degenerates to a zero-width interval.
  const a = successes + 1, b = n - successes + 1;
  return {
    estimate: p, se, n,
    interval: [
      betaQuantile((1 - confidence) / 2, a, b),
      betaQuantile(1 - (1 - confidence) / 2, a, b),
    ],
    relativeSe: p === 0 ? Infinity : se / p,
    note: p === 0 || p === n
      ? 'zero or complete count: use the beta interval, not the normal one'
      : undefined,
  };
}

/**
 * Sample size needed to reach a target precision.
 * `targetRelativeSe` is the right input for rare events; `targetSe` for the rest.
 */
export function sampleSize({ p, targetSe, targetRelativeSe }) {
  if (targetRelativeSe) {
    // se/p = sqrt((1-p)/(n p)) -> n = (1-p) / (p * rse^2)
    return Math.ceil((1 - p) / (p * targetRelativeSe ** 2));
  }
  if (!targetSe) throw new Error('give targetSe or targetRelativeSe');
  return Math.ceil((p * (1 - p)) / targetSe ** 2);
}

/**
 * Effective sample count when you oversample a rare segment and reweight
 * (importance sampling, sec. 14.2). Returns the variance reduction factor:
 * how many plain samples the biased run is worth.
 */
export function importanceGain({ trueRate, proposalRate, n }) {
  if (proposalRate <= 0 || proposalRate >= 1) throw new Error('proposalRate must be in (0,1)');
  // Weight w = p/q on hits, (1-p)/(1-q) on misses. Variance of the weighted
  // estimator relative to direct sampling at the same n.
  const w1 = trueRate / proposalRate;
  const w0 = (1 - trueRate) / (1 - proposalRate);
  const second = proposalRate * w1 * w1;
  const varIs = second - trueRate ** 2;
  const varDirect = trueRate * (1 - trueRate);
  return {
    expectedHits: Math.round(proposalRate * n),
    directHits: Math.round(trueRate * n),
    varianceRatio: varIs / varDirect,
    equivalentDirectSamples: Math.round(n * (varDirect / varIs)),
    weightOnHit: w1,
    weightOnMiss: w0,
  };
}

/**
 * Pareto frontier over options scored on several objectives.
 * `objectives` maps metric name -> 'max' | 'min'.
 * Dominated options are the ones you can drop without argument: something else
 * is at least as good on every axis and strictly better on one.
 */
export function pareto(options, objectives) {
  const keys = Object.keys(objectives);
  const better = (x, y, k) =>
    objectives[k] === 'max' ? x[k] > y[k] : x[k] < y[k];
  const atLeast = (x, y, k) =>
    objectives[k] === 'max' ? x[k] >= y[k] : x[k] <= y[k];

  const dominatedBy = options.map(() => []);
  options.forEach((o, i) => {
    options.forEach((p, j) => {
      if (i === j) return;
      if (keys.every((k) => atLeast(p, o, k)) && keys.some((k) => better(p, o, k))) {
        dominatedBy[i].push(p.name);
      }
    });
  });

  return {
    frontier: options.filter((_, i) => dominatedBy[i].length === 0),
    dominated: options
      .map((o, i) => ({ ...o, dominatedBy: dominatedBy[i] }))
      .filter((o) => o.dominatedBy.length > 0),
  };
}

/**
 * Robust choice across model scenarios (robust dynamic programming, eq. 14.14):
 * pick the action whose worst case across plausible models is best.
 * Also reports the regret-minimizing choice, which is usually less paranoid.
 *
 * `matrix` maps action name -> { scenarioName: value }.
 */
export function robust(matrix, { scenarioWeights = null } = {}) {
  const actions = Object.keys(matrix);
  const scenarios = Object.keys(matrix[actions[0]]);
  const bestPerScenario = Object.fromEntries(
    scenarios.map((s) => [s, Math.max(...actions.map((a) => matrix[a][s]))]));

  const rows = actions.map((a) => {
    const values = scenarios.map((s) => matrix[a][s]);
    const regrets = scenarios.map((s) => bestPerScenario[s] - matrix[a][s]);
    const expected = scenarioWeights
      ? scenarios.reduce((sum, s) => sum + (scenarioWeights[s] ?? 0) * matrix[a][s], 0)
      : mean(values);
    return {
      action: a,
      worst: Math.min(...values),
      worstScenario: scenarios[values.indexOf(Math.min(...values))],
      best: Math.max(...values),
      expected,
      maxRegret: Math.max(...regrets),
    };
  });

  return {
    maximin: [...rows].sort((x, y) => y.worst - x.worst)[0],
    minimaxRegret: [...rows].sort((x, y) => x.maxRegret - y.maxRegret)[0],
    maxExpected: [...rows].sort((x, y) => y.expected - x.expected)[0],
    rows: rows.sort((x, y) => y.expected - x.expected),
  };
}
