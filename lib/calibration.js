// Scoring past predictions, and assigning credit for delayed outcomes.
// Kochenderfer, Wheeler & Wray, Algorithms for Decision Making, sec. 14.1, 17.4.

/**
 * Brier score over binary forecasts: mean squared error between the stated
 * probability and what happened. Lower is better; 0.25 is what you get by
 * always saying 50%.
 *
 * Decomposed into reliability (are your 70% claims right 70% of the time),
 * resolution (do you say anything other than the base rate), and uncertainty.
 */
export function brier(records, { bins = 5 } = {}) {
  const n = records.length;
  if (n === 0) throw new Error('no records to score');
  const score = records.reduce((s, r) => s + (r.p - (r.outcome ? 1 : 0)) ** 2, 0) / n;
  const base = records.filter((r) => r.outcome).length / n;

  const buckets = Array.from({ length: bins }, (_, i) => ({
    range: [i / bins, (i + 1) / bins],
    records: records.filter((r) => {
      const lo = i / bins, hi = (i + 1) / bins;
      return i === bins - 1 ? r.p >= lo && r.p <= hi : r.p >= lo && r.p < hi;
    }),
  })).filter((b) => b.records.length > 0);

  let reliability = 0, resolution = 0;
  const table = buckets.map((b) => {
    const k = b.records.length;
    const meanP = b.records.reduce((s, r) => s + r.p, 0) / k;
    const observed = b.records.filter((r) => r.outcome).length / k;
    reliability += (k / n) * (meanP - observed) ** 2;
    resolution += (k / n) * (observed - base) ** 2;
    return { range: b.range, n: k, statedMean: meanP, observedRate: observed, gap: meanP - observed };
  });

  return {
    n,
    brier: score,
    baseRate: base,
    uncertainty: base * (1 - base),
    reliability,
    resolution,
    skillVsBaseRate: base * (1 - base) - score,
    bins: table,
    verdict: reliability > 0.02
      ? (table.reduce((s, b) => s + b.gap * b.n, 0) / n > 0 ? 'overconfident' : 'underconfident')
      : 'well calibrated',
  };
}

/**
 * Eligibility-trace credit assignment (sec. 17.4). A result observed today is
 * split back over the decisions that preceded it, with weight decaying by
 * `lambda` per period. Use it when attribution is contested and recency bias
 * is doing the arguing.
 *
 * decisions: [{ name, periodsAgo }]
 */
export function assignCredit(decisions, { lambda = 0.7, total = 1 } = {}) {
  const weights = decisions.map((d) => Math.pow(lambda, d.periodsAgo));
  const sum = weights.reduce((s, w) => s + w, 0);
  return decisions.map((d, i) => ({
    decision: d.name,
    periodsAgo: d.periodsAgo,
    share: weights[i] / sum,
    credit: (weights[i] / sum) * total,
  })).sort((a, b) => b.share - a.share);
}
