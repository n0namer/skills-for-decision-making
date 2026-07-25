// Value of information: how much is it worth to observe something before deciding.
// Kochenderfer, Wheeler & Wray, Algorithms for Decision Making, sec. 6.6.
//
// VOI(O) = sum_o P(o) * max_a EU(a | o)  -  max_a EU(a)
//
// It is never negative, and it is exactly zero whenever no observation outcome
// would change which action you take. That zero is the point of the whole module.

import { utility } from './utility.js';

function normalize(weights) {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  if (total <= 0) throw new Error('cannot normalize an all-zero distribution');
  const out = {};
  for (const [k, w] of Object.entries(weights)) out[k] = w / total;
  return out;
}

function expectedUtilityGivenBelief(action, belief, states, opts) {
  return states.reduce((sum, s) => {
    const value = action.utility[s.name];
    if (value === undefined) {
      throw new Error(`action "${action.name}" has no utility for state "${s.name}"`);
    }
    return sum + belief[s.name] * utility(value, opts);
  }, 0);
}

/** Best action and its expected utility under a given belief over states. */
export function bestAction(actions, belief, states, opts) {
  let best = null;
  for (const a of actions) {
    const eu = expectedUtilityGivenBelief(a, belief, states, opts);
    if (!best || eu > best.eu) best = { name: a.name, eu };
  }
  return best;
}

/**
 * Value of observing one variable.
 *
 * observation.outcomes[i].likelihood maps state name -> P(outcome | state).
 * Likelihoods do not have to be normalized across outcomes; they are checked,
 * because a likelihood table that does not sum to 1 per state is the single
 * most common input error here.
 */
export function valueOfInformation(problem, observation, opts = {}) {
  const { states, actions } = problem;
  const prior = normalize(Object.fromEntries(states.map((s) => [s.name, s.p])));

  for (const s of states) {
    const total = observation.outcomes.reduce(
      (sum, o) => sum + (o.likelihood[s.name] ?? 0), 0);
    if (Math.abs(total - 1) > 1e-6) {
      throw new Error(
        `likelihoods for state "${s.name}" in observation "${observation.name}" ` +
        `sum to ${total.toFixed(4)}, expected 1`);
    }
  }

  const baseline = bestAction(actions, prior, states, opts);
  const branches = [];
  let expected = 0;

  for (const o of observation.outcomes) {
    // P(o) = sum_h P(o|h) P(h)
    const pOutcome = states.reduce(
      (sum, s) => sum + (o.likelihood[s.name] ?? 0) * prior[s.name], 0);
    if (pOutcome <= 0) {
      branches.push({ outcome: o.name, p: 0, action: null, eu: 0, posterior: {} });
      continue;
    }
    // Bayes: P(h|o) proportional to P(o|h) P(h)
    const posterior = normalize(Object.fromEntries(
      states.map((s) => [s.name, (o.likelihood[s.name] ?? 0) * prior[s.name]])));
    const best = bestAction(actions, posterior, states, opts);
    expected += pOutcome * best.eu;
    branches.push({ outcome: o.name, p: pOutcome, action: best.name, eu: best.eu, posterior });
  }

  const voi = Math.max(0, expected - baseline.eu);
  const cost = observation.cost ?? 0;
  const switches = branches.filter((b) => b.p > 0 && b.action !== baseline.name);

  return {
    observation: observation.name,
    baselineAction: baseline.name,
    baselineEu: baseline.eu,
    voi,
    cost,
    netVoi: voi - cost,
    worthObserving: voi - cost > 0,
    // If nothing flips the action, the observation is decoration.
    changesDecision: switches.length > 0,
    switchesTo: switches.map((b) => ({ outcome: b.outcome, p: b.p, action: b.action })),
    branches,
  };
}

/**
 * Score every candidate observation and rank by net value.
 * This is the myopic (greedy) heuristic from sec. 6.6: observe the highest
 * net-value variable, then recompute. It is not guaranteed optimal for a
 * sequence of observations, only for the next one.
 */
export function rankObservations(problem, opts = {}) {
  const results = (problem.observations ?? [])
    .map((o) => valueOfInformation(problem, o, opts));
  results.sort((a, b) => b.netVoi - a.netVoi);
  return results;
}
