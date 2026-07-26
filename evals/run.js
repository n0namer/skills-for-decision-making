#!/usr/bin/env node
// Eval runner. Answers one question: does the skill make the agent better?
//
// For every eval it runs the same prompt twice - once with the skill available
// and once with only a generic expert framing - then grades both against the
// same assertions with an LLM judge. The delta is the number that matters; a
// high with-skill score alone proves nothing, because the model may already
// have known the answer.
//
//   node evals/run.js                     # everything
//   node evals/run.js --skill valuing-information
//   node evals/run.js --plan-only         # show what would run, spend nothing
//   node evals/run.js --reuse-cache       # skip runs already recorded
//   node evals/run.js --config other.json # a different model or provider
//
// Requires a `claude` CLI on PATH (see runCommand in config.json) and
// ANTHROPIC_API_KEY in the environment, or provider: "openrouter" and
// OPENROUTER_API_KEY. See providers.js for what the two actually measure.

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPrompt, complete, grade, skillFingerprint } from './providers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { values: flags } = parseArgs({
  strict: false,
  options: {
    skill: { type: 'string' },
    eval: { type: 'string' },
    workers: { type: 'string', default: '4' },
    config: { type: 'string' },
    'reuse-cache': { type: 'boolean', default: false },
    'plan-only': { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
  },
});

// Config is read after flag parsing so --config can point elsewhere. Never mutate
// evals/config.json while a run is in flight: a second run reading it mid-swap will
// silently use the wrong model and the numbers will look real.
const config = JSON.parse(readFileSync(
  flags.config ? join(process.cwd(), flags.config) : join(ROOT, 'evals/config.json'), 'utf8'));

const WORKERS = Number(flags.workers);
const CACHE = join(ROOT, config.cacheDir);
const WORKSPACE = join(ROOT, config.workspace);

function hash(...parts) {
  return createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 16);
}

function log(msg) {
  if (!flags.json) console.log(msg);
}

/**
 * Build an isolated workspace. In with_skill mode the skill directory and the
 * shared scripts land in it; in without_skill mode only the eval fixtures do,
 * so the baseline cannot accidentally read the skill.
 */
function prepareWorkspace(skill, evalCase, mode) {
  const dir = join(WORKSPACE, `${skill}-${evalCase.id}-${mode}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  if (mode === 'with_skill') {
    cpSync(join(ROOT, skill), join(dir, skill), { recursive: true, dereference: true });
    cpSync(join(ROOT, 'scripts'), join(dir, 'scripts'), { recursive: true });
    cpSync(join(ROOT, 'lib'), join(dir, 'lib'), { recursive: true });
    cpSync(join(ROOT, 'examples'), join(dir, 'examples'), { recursive: true });
  }
  for (const f of evalCase.files ?? []) {
    const src = join(ROOT, f);
    if (existsSync(src)) {
      const dest = join(dir, f);
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(src, dest, { recursive: true });
    }
  }
  return dir;
}

const GRADE_INSTRUCTIONS = `You are grading an assistant's answer against a checklist.

For each numbered assertion, decide whether the answer satisfies it. Be strict:
an assertion is satisfied only if the answer actually does the thing, not if it
gestures at it. Partial credit does not exist.

Respond with ONLY a JSON object, no prose and no code fence:
{"results": [{"n": 1, "pass": true, "why": "one short clause"}, ...]}`;

async function gradeOne(evalCase, output) {
  const prompt = [
    GRADE_INSTRUCTIONS,
    '',
    '## Task the assistant was given',
    evalCase.prompt,
    '',
    '## What a good answer does',
    evalCase.expected_output,
    '',
    '## Assertions',
    ...evalCase.assertions.map((a, i) => `${i + 1}. ${a}`),
    '',
    '## The answer to grade',
    output.slice(0, 60000),
  ].join('\n');

  const raw = await grade(config, prompt, ROOT);

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`judge returned no JSON: ${raw.slice(0, 200)}`);
  const parsed = JSON.parse(match[0]);
  const results = parsed.results ?? [];
  return {
    passed: results.filter((r) => r.pass).length,
    total: evalCase.assertions.length,
    results,
  };
}

function cached(key) {
  const path = join(CACHE, `${key}.json`);
  if (flags['reuse-cache'] && existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
  return null;
}

function cache(key, value) {
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(join(CACHE, `${key}.json`), JSON.stringify(value, null, 2));
  return value;
}

async function runCase(skill, evalCase, mode) {
  const prompt = buildPrompt(config, skill, evalCase, mode, ROOT);
  // Provider and model are in the key so a cross-model run never reuses another
  // model's answer. The skill fingerprint is in it so editing a SKILL.md or any of
  // its references invalidates the with_skill entry.
  const key = hash(config.provider ?? 'claude-cli', config.model, skill,
    String(evalCase.id), mode, prompt, JSON.stringify(evalCase.assertions),
    mode === 'with_skill' ? skillFingerprint(ROOT, skill) : 'baseline');
  const hit = cached(key);
  if (hit) {
    log(`  cached  ${skill}/${evalCase.name} [${mode}] ${hit.passed}/${hit.total}`);
    return hit;
  }

  // Inline providers have no filesystem, so there is nothing to prepare.
  const dir = config.provider === 'openrouter' ? ROOT : prepareWorkspace(skill, evalCase, mode);
  try {
    const output = await complete(config, prompt,
      { cwd: dir, tools: config.skills[skill].tools });
    const grading = await gradeOne(evalCase, output);
    const record = {
      skill, id: evalCase.id, name: evalCase.name, mode, output,
      provider: config.provider ?? 'claude-cli', model: config.model, ...grading,
    };
    log(`  ${grading.passed === grading.total ? 'pass' : 'part'}    ` +
      `${skill}/${evalCase.name} [${mode}] ${grading.passed}/${grading.total}`);
    return cache(key, record);
  } catch (err) {
    log(`  ERROR   ${skill}/${evalCase.name} [${mode}]: ${err.message}`);
    return {
      skill, id: evalCase.id, name: evalCase.name, mode,
      provider: config.provider ?? 'claude-cli', model: config.model,
      error: err.message, passed: null, total: evalCase.assertions.length,
    };
  }
}

/** Run tasks with a bounded number in flight. */
async function pool(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= tasks.length) return;
      results[i] = await tasks[i]();
    }
  }));
  return results;
}

function loadEvals() {
  const skills = flags.skill ? [flags.skill] : Object.keys(config.skills);
  const jobs = [];
  for (const skill of skills) {
    const path = join(ROOT, skill, 'evals/evals.json');
    if (!existsSync(path)) {
      log(`  skip    ${skill}: no evals/evals.json`);
      continue;
    }
    const { evals } = JSON.parse(readFileSync(path, 'utf8'));
    for (const e of evals) {
      if (flags.eval && String(e.id) !== flags.eval && e.name !== flags.eval) continue;
      jobs.push({ skill, evalCase: e });
    }
  }
  return jobs;
}

function report(allRecords) {
  const errored = allRecords.filter((r) => r.error);
  const records = allRecords.filter((r) => !r.error);

  if (records.length === 0) {
    console.error(`\nevery run failed (${errored.length} errors). No scores to report.`);
    const seen = new Set();
    for (const e of errored) {
      if (seen.has(e.error)) continue;
      seen.add(e.error);
      console.error(`  ${e.error}`);
    }
    process.exit(1);
  }

  const bySkill = {};
  for (const r of records) {
    bySkill[r.skill] ??= { with_skill: [0, 0], without_skill: [0, 0] };
    const bucket = bySkill[r.skill][r.mode];
    bucket[0] += r.passed;
    bucket[1] += r.total;
  }

  const rows = Object.entries(bySkill).map(([skill, m]) => {
    const w = m.with_skill[1] ? m.with_skill[0] / m.with_skill[1] : 0;
    const b = m.without_skill[1] ? m.without_skill[0] / m.without_skill[1] : 0;
    return { skill, withSkill: w, without: b, delta: w - b, assertions: m.with_skill[1] };
  }).sort((a, b) => b.delta - a.delta);

  const totalW = records.filter((r) => r.mode === 'with_skill');
  const totalB = records.filter((r) => r.mode === 'without_skill');
  const sum = (rs, i) => rs.reduce((s, r) => s + (i === 0 ? r.passed : r.total), 0);
  const overall = {
    withSkill: sum(totalW, 1) ? sum(totalW, 0) / sum(totalW, 1) : 0,
    without: sum(totalB, 1) ? sum(totalB, 0) / sum(totalB, 1) : 0,
  };
  overall.delta = overall.withSkill - overall.without;

  const out = {
    provider: records[0].provider, model: records[0].model,
    errors: errored.map(({ output, ...r }) => r),
    rows, overall, records: records.map(({ output, ...r }) => r),
  };
  writeFileSync(join(ROOT, 'evals/benchmark.json'), JSON.stringify(out, null, 2));

  if (flags.json) {
    console.log(JSON.stringify(out, null, 2));
    return out;
  }

  const pct = (x) => `${(x * 100).toFixed(0)}%`;
  console.log('\nskill                    with   without  delta   assertions');
  console.log('-----------------------  -----  -------  ------  ----------');
  for (const r of rows) {
    console.log(
      `${r.skill.padEnd(23)}  ${pct(r.withSkill).padStart(5)}  ` +
      `${pct(r.without).padStart(7)}  ${(r.delta >= 0 ? '+' : '') + pct(r.delta).padStart(5)}  ` +
      `${String(r.assertions).padStart(10)}`);
  }
  console.log(`\noverall: ${pct(overall.withSkill)} with skill, ${pct(overall.without)} without, ` +
    `delta ${overall.delta >= 0 ? '+' : ''}${pct(overall.delta)}`);
  console.log(`subject: ${records[0].model} via ${records[0].provider}`);
  if (errored.length) {
    // A partial run is not a result. Say so rather than letting the average lie.
    console.log(`\n${errored.length} run(s) errored and are excluded from the scores above.`);
    console.log('These numbers cover only the runs that completed. Fix and re-run before quoting them.');
    for (const e of [...new Set(errored.map((x) => x.error))].slice(0, 3)) console.log(`  ${e}`);
  }
  console.log('written to evals/benchmark.json');
  if (overall.delta <= 0) {
    console.log('\nA delta at or below zero means the skill is not earning its context.');
    console.log('Either the guidance is not adding anything the model lacked, or the');
    console.log('assertions are testing something the skill does not actually cover.');
  }
  return out;
}

const jobs = loadEvals();

if (flags['plan-only']) {
  log(`${jobs.length} evals x 2 modes = ${jobs.length * 2} runs, plus ${jobs.length * 2} gradings`);
  for (const j of jobs) log(`  ${j.skill}/${j.evalCase.name}`);
  process.exit(0);
}

if (jobs.length === 0) {
  console.error('no evals matched');
  process.exit(1);
}

log(`running ${jobs.length * 2} evals with ${WORKERS} workers\n`);
const tasks = jobs.flatMap(({ skill, evalCase }) => [
  () => runCase(skill, evalCase, 'with_skill'),
  () => runCase(skill, evalCase, 'without_skill'),
]);
const records = await pool(tasks, WORKERS);
report(records);
