import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lgamma, betaCdf, betaQuantile, betaMean, betaMode, probGreater, normalQuantile, rng, sampleBeta,
} from '../lib/stats.js';

const close = (a, b, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) < tol, `expected ${a} within ${tol} of ${b}`);

test('lgamma matches known factorials', () => {
  close(lgamma(5), Math.log(24), 1e-9);   // Gamma(5) = 4!
  close(lgamma(1), 0, 1e-9);
  close(lgamma(0.5), Math.log(Math.sqrt(Math.PI)), 1e-9);
});

test('Beta(1,1) is uniform', () => {
  close(betaCdf(0.3, 1, 1), 0.3, 1e-9);
  close(betaQuantile(0.5, 1, 1), 0.5, 1e-9);
});

test('beta quantiles match Algorithms for Decision Making example 15.3', () => {
  // Beta(2,1) has CDF x^2, so its 0.9 quantile is sqrt(0.9). The book prints 0.949.
  close(betaQuantile(0.9, 2, 1), Math.sqrt(0.9), 1e-6);
  close(betaQuantile(0.9, 5, 2), 0.907, 1e-3);
});

test('posterior win probabilities match example 15.1', () => {
  // 1 win 0 losses -> Beta(2,1), mean 2/3. 4 wins 1 loss -> Beta(5,2), mean 5/7.
  close(betaMean(2, 1), 2 / 3, 1e-9);
  close(betaMean(5, 2), 5 / 7, 1e-9);
});

test('beta mode is undefined unless both shapes exceed 1', () => {
  assert.equal(betaMode(1, 1), null);
  close(betaMode(3, 2), 2 / 3, 1e-9);
});

test('probGreater is symmetric and self-comparison is a coin flip', () => {
  close(probGreater(3, 4, 3, 4), 0.5, 1e-6);
  const p = probGreater(8, 2, 3, 7);
  close(p + probGreater(3, 7, 8, 2), 1, 1e-6);
  assert.ok(p > 0.9, `a strong arm should dominate a weak one, got ${p}`);
});

test('probGreater agrees with simulation on fractional pseudocounts', () => {
  const a1 = 4.5, b1 = 3.5, a2 = 3.2, b2 = 5.8;
  const analytic = probGreater(a1, b1, a2, b2);
  const random = rng(42);
  let hits = 0;
  const draws = 200000;
  for (let i = 0; i < draws; i++) {
    if (sampleBeta(a1, b1, random) > sampleBeta(a2, b2, random)) hits++;
  }
  close(analytic, hits / draws, 0.01);
});

test('normalQuantile hits the textbook z values', () => {
  close(normalQuantile(0.975), 1.959964, 1e-5);
  close(normalQuantile(0.5), 0, 1e-9);
});

test('rng is reproducible for a given seed', () => {
  const a = rng(7), b = rng(7);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
});
