// Simple (normal-form) games for reasoning about rivals.
// Kochenderfer, Wheeler & Wray, Algorithms for Decision Making, ch. 24.
//
// Game shape:
//   players: ["us", "rival"]
//   actions: { us: [...], rival: [...] }
//   payoffs: { "actionUs|actionRival": [payoffUs, payoffRival], ... }

export function jointActions(game) {
  const lists = game.players.map((p) => game.actions[p]);
  return lists.reduce(
    (acc, list) => acc.flatMap((prefix) => list.map((a) => [...prefix, a])),
    [[]]);
}

export function payoff(game, joint, i) {
  const key = joint.join('|');
  const v = game.payoffs[key];
  if (!v) throw new Error(`no payoff defined for joint action "${key}"`);
  return v[i];
}

/** Expected payoff to player i under a joint policy (per-player action distributions). */
export function utilityOf(game, policy, i) {
  return jointActions(game).reduce((sum, joint) => {
    const p = joint.reduce((prod, a, j) => prod * (policy[j][a] ?? 0), 1);
    return p === 0 ? sum : sum + p * payoff(game, joint, i);
  }, 0);
}

function pure(action) {
  return { [action]: 1 };
}

function withPlayer(policy, i, pi) {
  return policy.map((p, j) => (j === i ? pi : p));
}

/** Deterministic best response of player i to fixed policies for the others. */
export function bestResponse(game, policy, i) {
  let best = null;
  for (const a of game.actions[game.players[i]]) {
    const u = utilityOf(game, withPlayer(policy, i, pure(a)), i);
    if (!best || u > best.u) best = { action: a, u };
  }
  return best;
}

/**
 * Softmax (quantal) response: probability proportional to exp(lambda * U).
 * lambda -> 0 is a coin flip, lambda -> infinity is the best response.
 * Models a rival who is trying to optimize but makes cheap mistakes.
 */
export function softmaxResponse(game, policy, i, lambda) {
  const acts = game.actions[game.players[i]];
  const us = acts.map((a) => utilityOf(game, withPlayer(policy, i, pure(a)), i));
  const max = Math.max(...us);
  const weights = us.map((u) => Math.exp(lambda * (u - max)));
  const total = weights.reduce((s, w) => s + w, 0);
  return Object.fromEntries(acts.map((a, k) => [a, weights[k] / total]));
}

/** An action that is best no matter what the others do. Rare, and decisive when present. */
export function dominantStrategies(game) {
  const out = {};
  game.players.forEach((player, i) => {
    const others = jointActions(game).map((j) => j.filter((_, k) => k !== i).join('|'));
    const unique = [...new Set(others)];
    for (const a of game.actions[player]) {
      const dominant = unique.every((ctx) => {
        const build = (act) => {
          const parts = ctx === '' ? [] : ctx.split('|');
          const joint = [...parts];
          joint.splice(i, 0, act);
          return joint;
        };
        const mine = payoff(game, build(a), i);
        return game.actions[player].every((b) => mine >= payoff(game, build(b), i));
      });
      if (dominant) out[player] = a;
    }
  });
  return out;
}

/** All pure-strategy Nash equilibria: joint actions where nobody wants to move alone. */
export function pureNash(game) {
  return jointActions(game).filter((joint) =>
    game.players.every((player, i) => {
      const mine = payoff(game, joint, i);
      return game.actions[player].every((b) => {
        const alt = [...joint];
        alt[i] = b;
        return payoff(game, alt, i) <= mine;
      });
    })).map((joint) => ({
      joint,
      payoffs: game.payoffs[joint.join('|')],
    }));
}

/**
 * Iterated best response. Converges for some game classes and cycles for others;
 * a detected cycle is a real finding, not a failure. In pricing games a cycle is
 * the formal shape of a price war.
 */
export function iteratedBestResponse(game, { kMax = 20 } = {}) {
  let policy = game.players.map((p) =>
    Object.fromEntries(game.actions[p].map((a) => [a, 1 / game.actions[p].length])));
  const seen = new Map();
  const path = [];
  for (let k = 0; k < kMax; k++) {
    policy = game.players.map((_, i) => pure(bestResponse(game, policy, i).action));
    const key = policy.map((p) => Object.keys(p)[0]).join('|');
    path.push(key);
    if (seen.has(key)) {
      const start = seen.get(key);
      return { converged: false, cycle: path.slice(start), path, iterations: k + 1 };
    }
    seen.set(key, k);
    if (k > 0 && path[k] === path[k - 1]) {
      return { converged: true, joint: policy.map((p) => Object.keys(p)[0]), path, iterations: k + 1 };
    }
  }
  return { converged: false, cycle: null, path, iterations: kMax };
}

/**
 * Hierarchical softmax (level-k). Level 0 plays uniformly at random; level k
 * softmax-responds to level k-1. Use it when a rival plainly is not playing the
 * equilibrium, which is most of the time.
 */
export function hierarchicalSoftmax(game, { lambda = 1, k = 2 } = {}) {
  let policy = game.players.map((p) =>
    Object.fromEntries(game.actions[p].map((a) => [a, 1 / game.actions[p].length])));
  for (let level = 1; level <= k; level++) {
    policy = game.players.map((_, i) => softmaxResponse(game, policy, i, lambda));
  }
  return Object.fromEntries(game.players.map((p, i) => [p, policy[i]]));
}

/**
 * Fictitious play from observed history: model each rival by the empirical
 * frequency of their past actions, then best-respond. `counts` maps player ->
 * action -> times observed. Counts start at 1 so an unobserved action is
 * merely unlikely, not impossible.
 */
export function fictitiousPlay(game, counts, { me = 0 } = {}) {
  const policy = game.players.map((p) => {
    const c = counts[p] ?? {};
    const acts = game.actions[p];
    const vals = acts.map((a) => (c[a] ?? 0) + 1);
    const total = vals.reduce((s, v) => s + v, 0);
    return Object.fromEntries(acts.map((a, i) => [a, vals[i] / total]));
  });
  const br = bestResponse(game, policy, me);
  return { beliefs: Object.fromEntries(game.players.map((p, i) => [p, policy[i]])), bestResponse: br };
}
