import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const CLI = join(ROOT, 'scripts', 'problem-solver.js');

function tempJson(name, value) {
  const dir = mkdtempSync(join(tmpdir(), 'sdm-solve-'));
  const path = join(dir, name);
  writeFileSync(path, JSON.stringify(value));
  return path;
}

test('problem solver CLI selects L0 mode from structured signals', () => {
  const signals = tempJson('signals.json', { hasDirectPrimitive: true });
  const out = JSON.parse(execFileSync(process.execPath, [CLI, 'mode', '--signals', signals], { encoding: 'utf8' }));
  assert.equal(out.mode, 'L0');
});

test('problem solver CLI validates plan contracts', () => {
  const plan = tempJson('plan.json', {
    id: 'p1', version: 1, goal: 'test', constraints: [], assumptions: [], successCriteria: [],
    steps: [{ id: 'a', title: 'A', dependsOn: [], primitiveIds: [], dod: [] }],
  });
  const out = JSON.parse(execFileSync(process.execPath, [CLI, 'validate-plan', '--plan', plan], { encoding: 'utf8' }));
  assert.equal(out.valid, true);
  assert.equal(out.plan.id, 'p1');
});
