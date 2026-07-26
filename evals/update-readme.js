#!/usr/bin/env node
// Rewrites the results table in README.md from evals/benchmark.json, so the
// published numbers cannot drift from the measured ones.
//
//   node evals/run.js && node evals/update-readme.js
//
// Refuses to write a table from a run that had errors or that covers fewer
// skills than the repo ships, because a partial sweep published as a full one
// is the exact failure this script exists to prevent.

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const bench = JSON.parse(readFileSync(join(ROOT, 'evals/benchmark.json'), 'utf8'));

const skills = readdirSync(ROOT)
  .filter((d) => statSync(join(ROOT, d)).isDirectory())
  .filter((d) => existsSync(join(ROOT, d, 'SKILL.md')));

const problems = [];
if (bench.errors?.length) {
  problems.push(`${bench.errors.length} run(s) errored; the averages exclude them`);
}
if (bench.rows.length < skills.length) {
  problems.push(`benchmark covers ${bench.rows.length} of ${skills.length} skills`);
}
if (problems.length) {
  console.error('refusing to update README:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('\nRun the full sweep first: node evals/run.js --reuse-cache');
  process.exit(1);
}

const pct = (x) => `${(x * 100).toFixed(0)}%`;
const signed = (x) => `${x >= 0 ? '+' : '-'} ${Math.abs(x * 100).toFixed(0)}%`;
const width = Math.max(...bench.rows.map((r) => r.skill.length), 'skill'.length);

const lines = [
  `${'skill'.padEnd(width)}  with   without  delta   assertions`,
  `${'-'.repeat(width)}  -----  -------  ------  ----------`,
  ...bench.rows.map((r) =>
    `${r.skill.padEnd(width)}  ${pct(r.withSkill).padStart(5)}  ` +
    `${pct(r.without).padStart(7)}  ${signed(r.delta).padStart(6)}  ` +
    `${String(r.assertions).padStart(10)}`),
];

const table = '```\n' + lines.join('\n') + '\n```';
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const marker = /Measured with .*?:\n\n```\n[\s\S]*?\n```/;
if (!marker.test(readme)) {
  console.error('could not find the results block in README.md');
  process.exit(1);
}

const subject = bench.model ?? 'the configured model';
const updated = readme.replace(marker,
  `Measured with ${subject} across all ${bench.rows.length} skills, ` +
  `${bench.records.length / 2} cases, ${bench.rows.reduce((s, r) => s + r.assertions, 0)} assertions:\n\n${table}`);

writeFileSync(join(ROOT, 'README.md'), updated);
console.log(table);
console.log(`\noverall: ${pct(bench.overall.withSkill)} with, ${pct(bench.overall.without)} without, ` +
  `delta ${signed(bench.overall.delta)}`);
console.log('README.md updated');
