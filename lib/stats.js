// Numerical primitives used across this repo. No dependencies, deterministic
// unless a seed-consuming RNG is passed in explicitly.

// Lanczos approximation, g=7, n=9. Accurate to ~15 significant digits for x > 0,
// which is far beyond what any business estimate needs.
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

export function lgamma(x) {
  if (x < 0.5) {
    // Reflection formula keeps accuracy for small/negative arguments.
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  }
  x -= 1;
  let a = LANCZOS[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

export function logBeta(a, b) {
  return lgamma(a) + lgamma(b) - lgamma(a + b);
}

// Continued fraction for the incomplete beta function (Lentz's method).
// 200 iterations is well past convergence for the a,b ranges we see (< 1e6).
function betacf(a, b, x) {
  const TINY = 1e-30;
  const EPS = 3e-14;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a,b) = P(Beta(a,b) <= x). */
export function betaCdf(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - logBeta(a, b));
  return x < (a + 1) / (a + b + 2)
    ? (front * betacf(a, b, x)) / a
    : 1 - (front * betacf(b, a, 1 - x)) / b;
}

/** Inverse CDF by bisection. 200 halvings gives ~1e-60 bracket width; we stop at 1e-12. */
export function betaQuantile(p, a, b) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (betaCdf(mid, a, b) < p) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-12) break;
  }
  return (lo + hi) / 2;
}

export function betaMean(a, b) {
  return a / (a + b);
}

/** Mode is only defined when both shape parameters exceed 1. */
export function betaMode(a, b) {
  if (a > 1 && b > 1) return (a - 1) / (a + b - 2);
  return null;
}

export function betaStd(a, b) {
  return Math.sqrt((a * b) / ((a + b) ** 2 * (a + b + 1)));
}

/**
 * P(Beta(a1,b1) > Beta(a2,b2)), exact for integer-ish parameters via the
 * standard summation identity. Falls back to quadrature otherwise, which is
 * what happens whenever a prior uses fractional pseudocounts.
 */
export function probGreater(a1, b1, a2, b2) {
  const integral = Number.isInteger(a1) && Number.isInteger(b1) &&
    Number.isInteger(a2) && Number.isInteger(b2) &&
    a1 + b1 + a2 + b2 < 2000;
  if (integral) {
    let total = 0;
    for (let i = 0; i < a1; i++) {
      total += Math.exp(
        logBeta(a2 + i, b2 + b1) - Math.log(b1 + i) - logBeta(1 + i, b1) - logBeta(a2, b2)
      );
    }
    return Math.min(1, Math.max(0, total));
  }
  // Simpson's rule over the density of arm 1 times the CDF of arm 2.
  const n = 2000;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const x = i / n;
    const w = i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2;
    const logPdf = (a1 - 1) * Math.log(Math.max(x, 1e-300)) +
      (b1 - 1) * Math.log(Math.max(1 - x, 1e-300)) - logBeta(a1, b1);
    sum += w * Math.exp(logPdf) * betaCdf(x, a2, b2);
  }
  return Math.min(1, Math.max(0, (sum / (3 * n))));
}

/** Mulberry32: small, fast, seedable. Reproducible allocations matter more than crypto quality. */
export function rng(seed = 1) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Marsaglia-Tsang gamma sampler; the boost handles shape < 1. */
export function sampleGamma(shape, random) {
  if (shape < 1) {
    return sampleGamma(shape + 1, random) * Math.pow(random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do {
      x = sampleNormal(random);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function sampleBeta(a, b, random) {
  const x = sampleGamma(a, random);
  const y = sampleGamma(b, random);
  return x / (x + y);
}

/** Box-Muller. */
export function sampleNormal(random) {
  const u = Math.max(random(), 1e-12);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Acklam's inverse normal CDF; |error| < 1.15e-9 over the full range. */
export function normalQuantile(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > pHigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5;
  r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export function mean(xs) {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function std(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}
