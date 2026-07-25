// Belief updating over states you cannot observe directly.
// Kochenderfer, Wheeler & Wray, Algorithms for Decision Making, ch. 19.

import { normalQuantile } from './stats.js';

/**
 * Discrete state filter (sec. 19.2):
 *   b'(s') proportional to O(o | a, s') * sum_s T(s' | s, a) b(s)
 *
 * belief:     { state: probability }
 * transition: { state: { nextState: probability } }
 * likelihood: { state: probability of the observation you actually saw }
 */
export function updateBelief(belief, transition, likelihood) {
  const states = Object.keys(belief);
  const predicted = Object.fromEntries(states.map((s2) => [
    s2,
    states.reduce((sum, s) => sum + (transition?.[s]?.[s2] ?? (s === s2 ? 1 : 0)) * belief[s], 0),
  ]));
  const weighted = Object.fromEntries(
    states.map((s) => [s, predicted[s] * (likelihood[s] ?? 0)]));
  const total = Object.values(weighted).reduce((a, b) => a + b, 0);
  if (total === 0) {
    // Every hypothesis was ruled out. In a particle filter this is deprivation;
    // here it means the observation model is wrong, not that the truth vanished.
    throw new Error(
      'observation has zero likelihood under every state: widen the observation model');
  }
  return {
    belief: Object.fromEntries(Object.entries(weighted).map(([s, w]) => [s, w / total])),
    evidence: total,
    predicted,
  };
}

/** Shannon entropy in bits. High entropy means you still do not know. */
export function entropy(belief) {
  return -Object.values(belief)
    .filter((p) => p > 0)
    .reduce((s, p) => s + p * Math.log2(p), 0);
}

/**
 * Scalar Kalman filter over a local-level model: the true value drifts by
 * processVar per period and each reading adds observationVar of noise.
 *
 * This is the honest way to read a weekly metric. Raw week-over-week deltas
 * conflate drift with measurement noise; the filter separates them.
 */
export function trackLevel(observations, {
  processVar,
  observationVar,
  initialMean = observations[0],
  // A deliberately vague starting belief. Sec. 19.1: a confident wrong prior
  // takes many observations to recover from.
  initialVar = observationVar * 100,
  confidence = 0.95,
} = {}) {
  const z = normalQuantile(1 - (1 - confidence) / 2);
  let m = initialMean;
  let v = initialVar;
  const steps = [];

  for (const o of observations) {
    // Predict
    const mPred = m;
    const vPred = v + processVar;
    // How surprising is this reading, given what we believed?
    const innovation = o - mPred;
    const innovationVar = vPred + observationVar;
    const zScore = innovation / Math.sqrt(innovationVar);
    // Update
    const gain = vPred / innovationVar;
    m = mPred + gain * innovation;
    v = (1 - gain) * vPred;
    steps.push({
      observation: o,
      predicted: mPred,
      filtered: m,
      variance: v,
      gain,
      innovation,
      z: zScore,
      // Anything inside the predictive interval is consistent with noise.
      surprising: Math.abs(zScore) > z,
    });
  }

  const last = steps[steps.length - 1];
  return {
    level: m,
    std: Math.sqrt(v),
    interval: [m - z * Math.sqrt(v), m + z * Math.sqrt(v)],
    latestIsSurprising: last.surprising,
    steps,
  };
}

/**
 * Split observed variation into signal and noise given a series.
 * Returns a suggested processVar / observationVar pair for `trackLevel` when
 * you have no better estimate: assumes half the lag-1 differenced variance is
 * measurement noise, which is a crude but stable starting point.
 */
export function suggestVariances(observations) {
  const diffs = observations.slice(1).map((o, i) => o - observations[i]);
  const m = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  const v = diffs.reduce((s, d) => s + (d - m) ** 2, 0) / Math.max(1, diffs.length - 1);
  return {
    processVar: v / 2,
    observationVar: v / 2,
    note: 'crude split of differenced variance; replace with a measured value when you have one',
  };
}
