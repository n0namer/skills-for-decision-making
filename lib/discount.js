// Discounting and planning horizon.
// Kochenderfer, Wheeler & Wray, Algorithms for Decision Making, sec. 7.1, 9.1.

/** Discounted return of a reward stream: sum of gamma^(t-1) * r_t. */
export function discountedReturn(rewards, gamma) {
  return rewards.reduce((sum, r, t) => sum + Math.pow(gamma, t) * r, 0);
}

/**
 * Translate a discount factor into something you can argue about.
 * halfLife: periods until a reward is worth half as much.
 * effectiveHorizon: 1/(1-gamma), the period beyond which contributions are noise.
 * A gamma you cannot defend as a half-life is a gamma you picked at random.
 */
export function describeGamma(gamma) {
  if (gamma <= 0 || gamma >= 1) throw new Error('gamma must be in (0,1)');
  return {
    gamma,
    halfLife: Math.log(0.5) / Math.log(gamma),
    effectiveHorizon: 1 / (1 - gamma),
    weightAt: Object.fromEntries(
      [1, 3, 6, 12, 24].map((t) => [t, Math.pow(gamma, t)])),
  };
}

/** Inverse: pick gamma from the half-life you actually believe. */
export function gammaFromHalfLife(halfLife) {
  if (halfLife <= 0) throw new Error('halfLife must be positive');
  return Math.pow(0.5, 1 / halfLife);
}

/**
 * Marginal value of planning one period deeper.
 * Feed it the best estimated return at each depth; it reports where the curve
 * flattens. Depth past the flat point is wasted work, not extra rigour
 * (Algorithms for Decision Making, example 9.1).
 */
export function horizonValue(returnsByDepth, { tolerance = 0.02 } = {}) {
  const depths = Object.keys(returnsByDepth).map(Number).sort((a, b) => a - b);
  const rows = depths.map((d, i) => {
    const prev = i === 0 ? null : returnsByDepth[depths[i - 1]];
    const cur = returnsByDepth[d];
    const gain = prev === null ? null : cur - prev;
    const relative = prev === null || prev === 0 ? null : Math.abs(gain / prev);
    return { depth: d, value: cur, gain, relativeGain: relative };
  });
  // The first depth whose extra gain is negligible tells you the *previous*
  // depth was already deep enough.
  const idx = rows.findIndex((r) => r.relativeGain !== null && r.relativeGain < tolerance);
  return {
    rows,
    sufficientDepth: idx > 0 ? rows[idx - 1].depth : depths[depths.length - 1],
  };
}

/**
 * Branch-and-bound pruning for a candidate list (sec. 9.4).
 * Each candidate needs an optimistic ceiling and, once evaluated, a realized
 * floor. Anything whose ceiling sits below the best known floor can be dropped
 * without further analysis. This is the cheapest backlog triage there is.
 */
export function prune(candidates) {
  const evaluated = candidates.filter((c) => c.floor !== undefined && c.floor !== null);
  const bestFloor = evaluated.length ? Math.max(...evaluated.map((c) => c.floor)) : -Infinity;
  const bestName = evaluated.find((c) => c.floor === bestFloor)?.name ?? null;
  const ordered = [...candidates].sort((a, b) => b.ceiling - a.ceiling);
  return {
    incumbent: bestName,
    incumbentFloor: bestFloor === -Infinity ? null : bestFloor,
    keep: ordered.filter((c) => c.ceiling >= bestFloor),
    prune: ordered
      .filter((c) => c.ceiling < bestFloor)
      .map((c) => ({ ...c, reason: `ceiling ${c.ceiling} below incumbent floor ${bestFloor}` })),
  };
}
