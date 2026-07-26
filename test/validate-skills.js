#!/usr/bin/env node
// Checks every skill against the Agent Skills specification and this repo's own
// conventions. Run before opening a PR: node test/validate-skills.js

import { readFileSync, readdirSync, existsSync, statSync, lstatSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_NAME = 64;
const MAX_DESC = 1024;
const MAX_LINES = 500;

let errors = 0, warnings = 0;
const fail = (skill, msg) => { console.log(`  FAIL  ${skill}: ${msg}`); errors++; };
const warn = (skill, msg) => { console.log(`  warn  ${skill}: ${msg}`); warnings++; };

function parseFrontmatter(text, skill) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) { fail(skill, 'no YAML frontmatter'); return null; }
  const fm = {};
  let key = null;
  for (const line of m[1].split('\n')) {
    const top = line.match(/^([a-zA-Z-]+):\s*(.*)$/);
    if (top) { key = top[1]; fm[key] = top[2]; }
    else if (key && line.startsWith('  ')) fm[key] += ` ${line.trim()}`;
  }
  return { fm, body: text.slice(m[0].length) };
}

const skills = readdirSync(ROOT)
  .filter((d) => statSync(join(ROOT, d)).isDirectory())
  .filter((d) => existsSync(join(ROOT, d, 'SKILL.md')))
  .sort();

console.log(`validating ${skills.length} skills\n`);

for (const skill of skills) {
  const path = join(ROOT, skill, 'SKILL.md');
  const parsed = parseFrontmatter(readFileSync(path, 'utf8'), skill);
  if (!parsed) continue;
  const { fm, body } = parsed;

  // Spec: name
  if (!fm.name) fail(skill, 'frontmatter missing name');
  else {
    if (fm.name !== skill) fail(skill, `name "${fm.name}" does not match directory`);
    if (fm.name.length > MAX_NAME) fail(skill, `name exceeds ${MAX_NAME} characters`);
    if (!NAME_RE.test(fm.name)) fail(skill, `name "${fm.name}" is not lowercase-hyphenated`);
  }

  // Spec: description
  if (!fm.description) fail(skill, 'frontmatter missing description');
  else {
    if (fm.description.length > MAX_DESC) fail(skill, `description exceeds ${MAX_DESC} characters`);
    if (/<[a-zA-Z/]/.test(fm.description)) fail(skill, 'description contains XML tags');
    if (/\b(I |I'|you can use this|we can help)\b/i.test(fm.description)) {
      fail(skill, 'description is not written in third person');
    }
    if (!/\buse (when|before|during|after|for)\b/i.test(fm.description)) {
      warn(skill, 'description does not say when to use the skill');
    }
    if (fm.description.length < 120) warn(skill, 'description is very short; add trigger words');
  }

  // Repo convention: cite the source
  if (!/metadata/.test(readFileSync(path, 'utf8'))) warn(skill, 'no metadata.source citing the book');

  // Progressive disclosure
  const lines = body.split('\n').length;
  if (lines > MAX_LINES) fail(skill, `body is ${lines} lines, over the ${MAX_LINES} limit`);
  else if (lines > MAX_LINES * 0.85) warn(skill, `body is ${lines} lines, approaching ${MAX_LINES}`);

  // Repo convention: the sections that made the evals improve
  if (!/^## Gotchas/m.test(body)) fail(skill, 'no Gotchas section');
  if (!/^## Output template/m.test(body)) fail(skill, 'no Output template section');
  if (!/^## Workflow/m.test(body)) warn(skill, 'no Workflow section');

  // References must resolve, and stay one level deep
  for (const ref of body.matchAll(/`(references\/[\w./-]+\.md)`/g)) {
    if (!existsSync(join(ROOT, skill, ref[1]))) fail(skill, `broken reference: ${ref[1]}`);
  }
  const refDir = join(ROOT, skill, 'references');
  if (existsSync(refDir)) {
    for (const f of readdirSync(refDir)) {
      if (!f.endsWith('.md')) continue;
      const text = readFileSync(join(refDir, f), 'utf8');
      if (/\[[^\]]+\]\(\.\.?\/.*\.md\)/.test(text)) {
        warn(skill, `references/${f} links to another file; keep references one level deep`);
      }
      if (text.split('\n').length > 100 && !/^## Contents/m.test(text)) {
        warn(skill, `references/${f} is over 100 lines with no table of contents`);
      }
    }
  }

  // Windows paths
  if (/`[\w./-]*\\[\w./-]+`/.test(body)) fail(skill, 'backslash path found; use forward slashes');

  // Shared resources must be reachable. A flattened symlink is a hard failure, not a
  // warning: installers that fetch files one at a time through the GitHub API turn these
  // into small text files, and then the calculators silently do not run.
  for (const link of ['scripts', 'examples']) {
    const p = join(ROOT, skill, link);
    if (!existsSync(p)) fail(skill, `missing ${link} symlink to shared resources`);
    else if (!lstatSync(p).isSymbolicLink()) {
      fail(skill, `${link} is not a symlink; a flattened install breaks the calculators`);
    }
  }

  // Every command the skill tells the agent to run must exist
  for (const cmd of body.matchAll(/calc\.js (\w+)/g)) {
    const cli = readFileSync(join(ROOT, 'scripts/calc.js'), 'utf8');
    if (!new RegExp(`^  ${cmd[1]}\\(`, 'm').test(cli)) {
      fail(skill, `references a CLI command that does not exist: ${cmd[1]}`);
    }
  }

  // Evals
  const evalPath = join(ROOT, skill, 'evals/evals.json');
  if (!existsSync(evalPath)) fail(skill, 'no evals/evals.json');
  else {
    const { skill_name, evals } = JSON.parse(readFileSync(evalPath, 'utf8'));
    if (skill_name !== skill) fail(skill, `evals skill_name "${skill_name}" does not match`);
    if (evals.length < 3) fail(skill, `only ${evals.length} evals; at least 3 required`);
    const ids = new Set();
    for (const e of evals) {
      if (ids.has(e.id)) fail(skill, `duplicate eval id ${e.id}`);
      ids.add(e.id);
      for (const field of ['name', 'prompt', 'expected_output', 'assertions']) {
        if (!e[field]) fail(skill, `eval ${e.id} missing ${field}`);
      }
      if ((e.assertions ?? []).length < 3) warn(skill, `eval ${e.id} has under 3 assertions`);
      for (const f of e.files ?? []) {
        if (!existsSync(join(ROOT, f))) fail(skill, `eval ${e.id} references missing file ${f}`);
      }
    }
  }

  console.log(`  ok    ${skill} (${lines} lines)`);
}

// Registry coverage
const listed = new Set(JSON.parse(readFileSync(join(ROOT, 'marketplace.json'), 'utf8'))
  .skills.map((s) => s.slug));
const configured = new Set(Object.keys(
  JSON.parse(readFileSync(join(ROOT, 'evals/config.json'), 'utf8')).skills));
for (const s of skills) {
  if (!listed.has(s)) fail(s, 'not listed in marketplace.json');
  if (!configured.has(s)) fail(s, 'not configured in evals/config.json');
}

console.log(`\n${errors} errors, ${warnings} warnings`);
process.exit(errors > 0 ? 1 : 0);
