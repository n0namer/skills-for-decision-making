#!/usr/bin/env node
// calc CLI: deterministic calculators for the decision skills.
// Every command accepts --json for machine-readable output.
//
//   node scripts/calc.js <command> [file.json] [flags]
//   node scripts/calc.js help

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { maximumExpectedUtility, certaintyEquivalent, riskPremium, expectedValue } from '../lib/utility.js';
import { rankObservations, valueOfInformation } from '../lib/voi.js';
import * as bandit from '../lib/bandit.js';
import { precision, sampleSize, importanceGain, pareto, robust } from '../lib/validation.js';
import { describeGamma, gammaFromHalfLife, discountedReturn, horizonValue, prune } from '../lib/discount.js';
import * as game from '../lib/game.js';
import { brier, assignCredit } from '../lib/calibration.js';
import { updateBelief, entropy, trackLevel, suggestVariances } from '../lib/belief.js';
import { probGreater } from '../lib/stats.js';

const COMMANDS = {
  meu: 'Rank actions by expected utility. Input: { actions: [{ action, outcomes: [{ value, p }] }] }',
  voi: 'Value of information for each candidate observation. Input: { states, actions, observations }',
  allocate: 'Split a budget across arms. Input: { arms: [{ name, wins, losses }] }',
  compare: 'P(arm A beats arm B) from wins/losses. Input: { arms: [...] }',
  precision: 'Standard error and interval for a measured rate. Flags: --successes --trials, or a file with { samples }',
  samplesize: 'Trials needed for a target precision. Flags: --p --rse or --se',
  importance: 'Gain from oversampling a rare segment. Flags: --true-rate --proposal-rate --n',
  pareto: 'Pareto frontier. Input: { objectives: { metric: "max"|"min" }, options: [...] }',
  robust: 'Worst-case and regret-minimizing choice. Input: { matrix: { action: { scenario: value } } }',
  discount: 'Interpret a discount factor. Flags: --gamma G or --half-life H',
  horizon: 'Where planning depth stops paying. Input: { returnsByDepth: { "5": 12, "10": 18 } }',
  prune: 'Branch-and-bound backlog triage. Input: { candidates: [{ name, ceiling, floor }] }',
  game: 'Solve a simple game. Input: { players, actions, payoffs }',
  calibrate: 'Score past forecasts. Input: { records: [{ p, outcome }] }',
  credit: 'Split a delayed result over earlier decisions. Input: { decisions: [{ name, periodsAgo }] }',
  belief: 'One Bayesian belief update. Input: { belief, transition, likelihood }',
  track: 'Separate signal from noise in a metric series. Input: { observations: [...] }',
};

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  strict: false,
  options: {
    json: { type: 'boolean', default: false },
    strategy: { type: 'string' },
    budget: { type: 'string' },
    floor: { type: 'string' },
    seed: { type: 'string' },
    m: { type: 'string' },
    c: { type: 'string' },
    alpha: { type: 'string' },
    lambda: { type: 'string' },
    level: { type: 'string' },
    utility: { type: 'string' },
    confidence: { type: 'string' },
    successes: { type: 'string' },
    trials: { type: 'string' },
    p: { type: 'string' },
    rse: { type: 'string' },
    se: { type: 'string' },
    gamma: { type: 'string' },
    'half-life': { type: 'string' },
    'true-rate': { type: 'string' },
    'proposal-rate': { type: 'string' },
    n: { type: 'string' },
  },
});

const num = (v, fallback) => (v === undefined ? fallback : Number(v));

function loadInput(path) {
  if (!path) {
    throw new Error('this command needs an input JSON file (see `calc help`)');
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error(`input file not found: ${path}`);
    throw new Error(`could not parse ${path}: ${err.message}`);
  }
}

function utilityOpts() {
  return flags.utility
    ? { form: flags.utility, lambda: num(flags.lambda, 1) }
    : { form: 'linear' };
}

function out(result, render) {
  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    render(result);
  }
}

const f = (x, d = 4) => (typeof x === 'number' ? Number(x.toFixed(d)) : x);
const pct = (x) => `${(x * 100).toFixed(1)}%`;

function table(rows) {
  if (rows.length === 0) return console.log('(none)');
  const keys = Object.keys(rows[0]);
  const widths = keys.map((k) =>
    Math.max(k.length, ...rows.map((r) => String(r[k] ?? '').length)));
  const line = (cells) => cells.map((c, i) => String(c ?? '').padEnd(widths[i])).join('  ');
  console.log(line(keys));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(keys.map((k) => r[k])));
}

const handlers = {
  meu(file) {
    const input = loadInput(file);
    const opts = utilityOpts();
    const res = maximumExpectedUtility(input.actions, opts);
    out(res, (r) => {
      console.log(`Utility form: ${opts.form}${opts.form === 'power' ? ` (lambda=${opts.lambda})` : ''}\n`);
      table(r.ranked.map((x) => ({
        action: x.action,
        'expected utility': f(x.eu),
        'expected value': f(x.ev, 2),
        'certainty equiv': f(x.ce, 2),
        'advantage': f(x.advantage),
      })));
      console.log(`\nChoose: ${r.best.action}`);
      const second = r.ranked[1];
      if (second) {
        console.log(second.advantage > -1e-9
          ? 'Warning: top two actions are tied. The decision is not driven by the numbers.'
          : `Margin over "${second.action}": ${f(-second.advantage)} utility.`);
      }
    });
  },

  voi(file) {
    const input = loadInput(file);
    const opts = utilityOpts();
    const res = input.observations
      ? rankObservations(input, opts)
      : [valueOfInformation(input, input.observation, opts)];
    out(res, (rows) => {
      table(rows.map((r) => ({
        observation: r.observation,
        VOI: f(r.voi, 2),
        cost: f(r.cost, 2),
        net: f(r.netVoi, 2),
        'changes decision': r.changesDecision ? 'yes' : 'NO',
        'gather?': r.worthObserving ? 'yes' : 'no',
      })));
      const useless = rows.filter((r) => !r.changesDecision);
      if (useless.length) {
        console.log(`\nZero decision value: ${useless.map((r) => r.observation).join(', ')}.`);
        console.log('No outcome of these would change the action. Skip them.');
      }
      const best = rows[0];
      if (best) {
        console.log(`\nDefault action without any new information: ${best.baselineAction}`);
        for (const s of best.switchesTo) {
          console.log(`  if ${best.observation} = ${s.outcome} (p=${f(s.p, 3)}) -> switch to ${s.action}`);
        }
      }
    });
  },

  allocate(file) {
    const input = loadInput(file);
    const strategy = flags.strategy ?? 'thompson';
    const arms = input.arms;
    let scored;
    switch (strategy) {
      case 'thompson':
        scored = bandit.thompson(arms, { seed: num(flags.seed, 1) });
        break;
      case 'ucb1': scored = bandit.ucb1(arms, num(flags.c, 1)); break;
      case 'quantile': scored = bandit.quantile(arms, num(flags.alpha, 0.9)); break;
      case 'greedy': scored = bandit.greedy(arms); break;
      default: throw new Error(`unknown strategy "${strategy}" (thompson|ucb1|quantile|greedy)`);
    }
    const split = bandit.allocate(scored, {
      budget: num(flags.budget, 100),
      floor: num(flags.floor, 0.05),
    });
    const starved = bandit.underExplored(arms, num(flags.m, 30));
    const res = { strategy, allocation: split, scored, underExplored: starved };
    out(res, (r) => {
      console.log(`Strategy: ${r.strategy}\n`);
      table(r.allocation.map((x) => ({
        arm: x.arm,
        share: pct(x.share),
        amount: f(x.amount, 1),
        'posterior mean': f(x.mean, 3),
        observations: x.n,
      })));
      if (r.underExplored.length) {
        console.log('\nToo little evidence to judge (fewer than ' +
          `${num(flags.m, 30)} observations). Do not cut these yet:`);
        for (const u of r.underExplored) console.log(`  ${u.arm}: ${u.n} observations`);
      }
    });
  },

  compare(file) {
    const input = loadInput(file);
    const res = bandit.dominance(input.arms);
    out(res, (rows) => {
      table(rows.map((r) => ({ 'arm A': r.a, 'arm B': r.b, 'P(A > B)': f(r.p, 3) })));
      const weak = rows.filter((r) => r.p > 0.5 && r.p < 0.9);
      if (weak.length) {
        console.log('\nLeads below 90% confidence. Calling these a winner is premature:');
        for (const w of weak) console.log(`  ${w.a} over ${w.b}: ${pct(w.p)}`);
      }
    });
  },

  precision(file) {
    const input = file ? loadInput(file) : {};
    const res = precision({
      successes: num(flags.successes, input.successes),
      trials: num(flags.trials, input.trials),
      samples: input.samples,
      confidence: num(flags.confidence, 0.95),
    });
    out(res, (r) => {
      console.log(`estimate       ${f(r.estimate, 6)}`);
      console.log(`n              ${r.n}`);
      console.log(`standard error ${f(r.se, 6)}`);
      console.log(`interval       [${f(r.interval[0], 6)}, ${f(r.interval[1], 6)}]`);
      console.log(`relative SE    ${f(r.relativeSe, 3)}`);
      if (r.note) console.log(`note           ${r.note}`);
      if (r.relativeSe > 0.2) {
        console.log('\nRelative error above 20%. This estimate cannot separate a real');
        console.log('effect from noise. Report the interval, not the point estimate.');
      }
    });
  },

  samplesize() {
    const res = sampleSize({
      p: num(flags.p),
      targetSe: flags.se ? num(flags.se) : undefined,
      targetRelativeSe: flags.rse ? num(flags.rse) : undefined,
    });
    out({ n: res }, (r) => console.log(`Trials needed: ${r.n.toLocaleString()}`));
  },

  importance() {
    const res = importanceGain({
      trueRate: num(flags['true-rate']),
      proposalRate: num(flags['proposal-rate']),
      n: num(flags.n),
    });
    out(res, (r) => {
      console.log(`hits by direct sampling     ${r.directHits}`);
      console.log(`hits by biased sampling     ${r.expectedHits}`);
      console.log(`worth this many plain runs  ${r.equivalentDirectSamples.toLocaleString()}`);
      console.log(`weight to apply on a hit    ${f(r.weightOnHit, 4)}`);
      console.log(`weight to apply on a miss   ${f(r.weightOnMiss, 4)}`);
    });
  },

  pareto(file) {
    const input = loadInput(file);
    const res = pareto(input.options, input.objectives);
    out(res, (r) => {
      console.log('On the frontier (each is best at something):');
      table(r.frontier);
      if (r.dominated.length) {
        console.log('\nDominated (strictly worse than another option, drop them):');
        table(r.dominated.map((d) => ({ ...d, dominatedBy: d.dominatedBy.join(', ') })));
      }
    });
  },

  robust(file) {
    const input = loadInput(file);
    const res = robust(input.matrix, { scenarioWeights: input.scenarioWeights ?? null });
    out(res, (r) => {
      table(r.rows.map((x) => ({
        action: x.action,
        expected: f(x.expected, 2),
        'worst case': f(x.worst, 2),
        'worst when': x.worstScenario,
        'max regret': f(x.maxRegret, 2),
      })));
      console.log(`\nbest expected      ${r.maxExpected.action}`);
      console.log(`best worst case    ${r.maximin.action}`);
      console.log(`least regret       ${r.minimaxRegret.action}`);
      if (r.maxExpected.action !== r.maximin.action) {
        console.log('\nThese disagree. Say out loud how much downside you are buying');
        console.log('insurance against, then pick. Do not let the disagreement hide.');
      }
    });
  },

  discount() {
    const gamma = flags['half-life']
      ? gammaFromHalfLife(num(flags['half-life']))
      : num(flags.gamma);
    const res = describeGamma(gamma);
    out(res, (r) => {
      console.log(`gamma              ${f(r.gamma, 4)}`);
      console.log(`half-life          ${f(r.halfLife, 2)} periods`);
      console.log(`effective horizon  ${f(r.effectiveHorizon, 1)} periods`);
      console.log('\nweight of a reward received in:');
      for (const [t, w] of Object.entries(r.weightAt)) {
        console.log(`  ${String(t).padStart(3)} periods   ${pct(w)}`);
      }
    });
  },

  horizon(file) {
    const input = loadInput(file);
    const res = horizonValue(input.returnsByDepth, { tolerance: num(flags.p, 0.02) });
    out(res, (r) => {
      table(r.rows.map((x) => ({
        depth: x.depth,
        value: f(x.value, 2),
        gain: x.gain === null ? '' : f(x.gain, 2),
        'relative gain': x.relativeGain === null ? '' : pct(x.relativeGain),
      })));
      console.log(`\nPlan to depth ${r.sufficientDepth}. Deeper is spend without return.`);
    });
  },

  prune(file) {
    const input = loadInput(file);
    const res = prune(input.candidates);
    out(res, (r) => {
      console.log(`Incumbent: ${r.incumbent ?? '(none evaluated yet)'}` +
        (r.incumbentFloor === null ? '' : ` with a floor of ${f(r.incumbentFloor, 2)}`));
      console.log('\nStill worth evaluating, best ceiling first:');
      table(r.keep.map((c) => ({ name: c.name, ceiling: c.ceiling, floor: c.floor ?? '' })));
      if (r.prune.length) {
        console.log('\nPrune without further analysis:');
        table(r.prune.map((c) => ({ name: c.name, ceiling: c.ceiling, reason: c.reason })));
      }
    });
  },

  game(file) {
    const input = loadInput(file);
    const res = {
      dominant: game.dominantStrategies(input),
      nash: game.pureNash(input),
      iterated: game.iteratedBestResponse(input),
      levelK: game.hierarchicalSoftmax(input, {
        lambda: num(flags.lambda, 1),
        k: num(flags.level, 2),
      }),
      fictitious: input.observedCounts
        ? game.fictitiousPlay(input, input.observedCounts)
        : null,
    };
    out(res, (r) => {
      console.log('Dominant strategies:',
        Object.keys(r.dominant).length ? JSON.stringify(r.dominant) : '(none)');
      console.log('\nPure Nash equilibria:');
      if (r.nash.length === 0) console.log('  (none in pure strategies; the equilibrium is mixed)');
      for (const n of r.nash) console.log(`  ${n.joint.join(' / ')} -> ${JSON.stringify(n.payoffs)}`);
      console.log('\nIterated best response:');
      if (r.iterated.converged) console.log(`  settles on ${r.iterated.joint.join(' / ')}`);
      else if (r.iterated.cycle) {
        console.log(`  cycles: ${r.iterated.cycle.join(' -> ')}`);
        console.log('  A cycle means repeated retaliation with no stable end. In pricing,');
        console.log('  that is a price war. Change the game rather than play it out.');
      } else console.log('  did not settle within the iteration limit');
      console.log(`\nLevel-${num(flags.level, 2)} softmax play (lambda=${num(flags.lambda, 1)}):`);
      for (const [player, dist] of Object.entries(r.levelK)) {
        console.log(`  ${player}: ${Object.entries(dist)
          .map(([a, p]) => `${a} ${pct(p)}`).join(', ')}`);
      }
      if (r.fictitious) {
        console.log(`\nFrom observed history, best response: ${r.fictitious.bestResponse.action}`);
      }
    });
  },

  calibrate(file) {
    const input = loadInput(file);
    const res = brier(input.records, { bins: num(flags.n, 5) });
    out(res, (r) => {
      console.log(`forecasts scored   ${r.n}`);
      console.log(`Brier score        ${f(r.brier, 4)} (lower is better)`);
      console.log(`base rate          ${f(r.baseRate, 3)}`);
      console.log(`always-base-rate   ${f(r.uncertainty, 4)}`);
      console.log(`skill vs base rate ${f(r.skillVsBaseRate, 4)}`);
      console.log(`verdict            ${r.verdict}\n`);
      table(r.bins.map((b) => ({
        'stated range': `${b.range[0]}-${b.range[1]}`,
        n: b.n,
        'you said': f(b.statedMean, 3),
        'actually happened': f(b.observedRate, 3),
        gap: f(b.gap, 3),
      })));
    });
  },

  credit(file) {
    const input = loadInput(file);
    const res = assignCredit(input.decisions, {
      lambda: num(flags.lambda, 0.7),
      total: num(flags.n, 1),
    });
    out(res, (rows) => table(rows.map((r) => ({
      decision: r.decision,
      'periods ago': r.periodsAgo,
      share: pct(r.share),
      credit: f(r.credit, 3),
    }))));
  },

  belief(file) {
    const input = loadInput(file);
    const res = updateBelief(input.belief, input.transition, input.likelihood);
    const before = entropy(input.belief);
    const after = entropy(res.belief);
    out({ ...res, entropyBefore: before, entropyAfter: after }, (r) => {
      table(Object.keys(input.belief).map((s) => ({
        state: s,
        prior: f(input.belief[s], 4),
        'after update': f(r.belief[s], 4),
      })));
      console.log(`\nuncertainty ${f(before, 3)} -> ${f(after, 3)} bits ` +
        `(${f(before - after, 3)} bits learned)`);
    });
  },

  track(file) {
    const input = loadInput(file);
    const guess = suggestVariances(input.observations);
    const res = trackLevel(input.observations, {
      processVar: input.processVar ?? guess.processVar,
      observationVar: input.observationVar ?? guess.observationVar,
      confidence: num(flags.confidence, 0.95),
    });
    out(res, (r) => {
      table(r.steps.map((s, i) => ({
        t: i + 1,
        observed: f(s.observation, 2),
        'filtered level': f(s.filtered, 2),
        z: f(s.z, 2),
        'real move?': s.surprising ? 'YES' : 'noise',
      })));
      console.log(`\nlevel now  ${f(r.level, 2)} +/- ${f(r.std * 1.96, 2)}`);
      console.log(r.latestIsSurprising
        ? 'The latest reading is outside what drift alone explains. Investigate.'
        : 'The latest reading is inside the noise band. Do not act on it alone.');
      if (input.processVar === undefined) {
        console.log('\nVariances were guessed from the series itself. Supply processVar and');
        console.log('observationVar once you know them; the guess is only a starting point.');
      }
    });
  },

  help() {
    console.log('calc <command> [file.json] [--json]\n');
    for (const [name, desc] of Object.entries(COMMANDS)) {
      console.log(`  ${name.padEnd(11)} ${desc}`);
    }
    console.log('\nCommon flags:');
    console.log('  --json              machine-readable output');
    console.log('  --utility <form>    linear (default) | log | power | exponential');
    console.log('  --lambda <n>        risk aversion, or softmax precision, or trace decay');
    console.log('\nExamples in examples/ at the repo root.');
  },
};

const command = positionals[0] ?? 'help';
const handler = handlers[command];

if (!handler) {
  console.error(`unknown command "${command}". Run \`calc help\`.`);
  process.exit(2);
}

try {
  handler(positionals[1]);
} catch (err) {
  console.error(`error: ${err.message}`);
  process.exit(1);
}
