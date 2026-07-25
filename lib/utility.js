// Utility functions and the maximum expected utility principle.
// Kochenderfer, Wheeler & Wray, Algorithms for Decision Making, ch. 6.

/**
 * Utility of a monetary (or otherwise scalar) outcome.
 *
 * linear      risk neutral. Only correct when the stake is small next to the bankroll.
 * log         constant relative risk aversion of 1. Sensible default for runway,
 *             because halving cash hurts as much as doubling it helps.
 * power       CRRA with parameter lambda; lambda -> 1 recovers log.
 * exponential CARA with parameter lambda. Convenient, but a poor model of wealth.
 * quadratic   U = lambda*x - x^2. Only monotone below x = lambda/2.
 */
export function utility(x, { form = 'log', lambda = 1, shift = 0 } = {}) {
  const v = x + shift;
  switch (form) {
    case 'linear':
      return v;
    case 'log':
      if (v <= 0) return -Infinity;
      return Math.log(v);
    case 'power': {
      if (v <= 0) return -Infinity;
      if (Math.abs(lambda - 1) < 1e-9) return Math.log(v);
      return (Math.pow(v, 1 - lambda) - 1) / (1 - lambda);
    }
    case 'exponential':
      return 1 - Math.exp(-lambda * v);
    case 'quadratic':
      return lambda * v - v * v;
    default:
      throw new Error(`unknown utility form: ${form}`);
    }
}

/** Inverse of `utility`. Used to express expected utility back in currency. */
export function inverseUtility(u, { form = 'log', lambda = 1, shift = 0 } = {}) {
  let v;
  switch (form) {
    case 'linear': v = u; break;
    case 'log': v = Math.exp(u); break;
    case 'power':
      v = Math.abs(lambda - 1) < 1e-9
        ? Math.exp(u)
        : Math.pow(u * (1 - lambda) + 1, 1 / (1 - lambda));
      break;
    case 'exponential':
      // 1 - exp(-lambda*x) saturates at 1. Past that the inverse is meaningless,
      // which is the practical reason exponential utility is a poor model of wealth.
      if (u >= 1) {
        throw new Error(
          'exponential utility has saturated: lambda is too large for these values. ' +
          'Rescale the outcomes or use log/power utility.');
      }
      v = -Math.log(1 - u) / lambda;
      break;
    case 'quadratic': v = (lambda - Math.sqrt(lambda * lambda - 4 * u)) / 2; break;
    default: throw new Error(`unknown utility form: ${form}`);
  }
  return v - shift;
}

/** Expected utility of a lottery: outcomes with probabilities. */
export function expectedUtility(lottery, opts) {
  const total = lottery.reduce((s, o) => s + o.p, 0);
  if (Math.abs(total - 1) > 1e-6) {
    throw new Error(`lottery probabilities sum to ${total.toFixed(6)}, expected 1`);
  }
  return lottery.reduce((s, o) => s + o.p * utility(o.value, opts), 0);
}

/** Expected monetary value: the risk-neutral benchmark. */
export function expectedValue(lottery) {
  return lottery.reduce((s, o) => s + o.p * o.value, 0);
}

/** The guaranteed amount you would swap the lottery for. */
export function certaintyEquivalent(lottery, opts) {
  return inverseUtility(expectedUtility(lottery, opts), opts);
}

/** EV minus certainty equivalent: what risk aversion costs you, in currency. */
export function riskPremium(lottery, opts) {
  return expectedValue(lottery) - certaintyEquivalent(lottery, opts);
}

/**
 * Maximum expected utility over a set of actions.
 * Each action carries its own lottery over outcomes.
 * Returns every action scored and sorted, plus the advantage of each over the best,
 * because "how much worse is second place" is usually the decision-relevant number.
 */
export function maximumExpectedUtility(actions, opts) {
  const scored = actions.map((a) => ({
    action: a.action,
    eu: expectedUtility(a.outcomes, opts),
    ev: expectedValue(a.outcomes),
    ce: certaintyEquivalent(a.outcomes, opts),
  }));
  scored.sort((x, y) => y.eu - x.eu);
  const best = scored[0];
  for (const s of scored) {
    s.advantage = s.eu - best.eu;
    s.ceGap = s.ce - best.ce;
  }
  return { best, ranked: scored };
}
