import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { SkillLifecycleManager } from '../lib/skill-lifecycle-manager.js';
import { readSkillLock } from '../lib/skill-lock.js';
import { resolveSkillLockPath } from '../lib/skill-targets.js';

function temp(prefix = 'sdm-life-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeSkill(repo, name, payload = 'v1') {
  const dir = join(repo, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${name}\n---\n# ${name}\n`,
  );
  writeFileSync(join(dir, 'payload.txt'), payload);
  return dir;
}

function manager(repo, project) {
  let id = 0;
  return new SkillLifecycleManager({
    repoRoot: repo,
    projectRoot: project,
    homeDir: join(project, 'home'),
    clock: () => new Date('2026-08-09T12:00:00.000Z'),
    idFactory: () => `tx-${++id}`,
  });
}

test('sync installs skills and writes versioned lock', () => {
  const repo = temp();
  const project = temp();
  writeSkill(repo, 'skill-a');
  const lifecycle = manager(repo, project);

  const result = lifecycle.sync({ targetName: 'agents', mode: 'copy' });
  assert.equal(result.results[0].action, 'copy');

  const target = join(project, '.agents', 'skills', 'skill-a');
  assert.equal(readFileSync(join(target, 'payload.txt'), 'utf8'), 'v1');

  const lock = readSkillLock(resolveSkillLockPath({ projectRoot: project }));
  assert.equal(lock.schemaVersion, 1);
  assert.equal(lock.installations.length, 1);
  assert.equal(lock.history.length, 1);
});

test('second sync is idempotent when symlink is unchanged', () => {
  const repo = temp();
  const project = temp();
  writeSkill(repo, 'skill-a');
  const lifecycle = manager(repo, project);

  const first = lifecycle.sync({ targetName: 'agents', mode: 'symlink' });
  const second = lifecycle.sync({ targetName: 'agents', mode: 'symlink' });

  assert.equal(first.transactionId, 'tx-1');
  assert.equal(second.transactionId, null);
  assert.equal(second.results[0].action, 'unchanged');
  const lock = readSkillLock(resolveSkillLockPath({ projectRoot: project }));
  assert.equal(lock.history.length, 1);
});

test('sync fails closed on unmanaged target by default', () => {
  const repo = temp();
  const project = temp();
  writeSkill(repo, 'skill-a');
  const target = join(project, '.agents', 'skills', 'skill-a');
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'SKILL.md'), 'foreign');

  const lifecycle = manager(repo, project);
  assert.throws(
    () => lifecycle.sync({ targetName: 'agents', mode: 'copy' }),
    /refusing to overwrite unmanaged/,
  );
  assert.equal(readFileSync(join(target, 'SKILL.md'), 'utf8'), 'foreign');
});

test('compatibility conflict policy skips unmanaged target', () => {
  const repo = temp();
  const project = temp();
  writeSkill(repo, 'skill-a');
  const target = join(project, '.agents', 'skills', 'skill-a');
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'SKILL.md'), 'foreign');

  const lifecycle = manager(repo, project);
  const result = lifecycle.sync({
    targetName: 'agents',
    mode: 'copy',
    conflictPolicy: 'skip',
  });

  assert.equal(result.results[0].action, 'exists');
  assert.equal(readFileSync(join(target, 'SKILL.md'), 'utf8'), 'foreign');
});

test('force update is rollback-safe', () => {
  const repo = temp();
  const project = temp();
  writeSkill(repo, 'skill-a', 'v1');
  const lifecycle = manager(repo, project);
  lifecycle.sync({ targetName: 'agents', mode: 'copy' });

  writeFileSync(join(repo, 'skill-a', 'payload.txt'), 'v2');
  const updated = lifecycle.sync({ targetName: 'agents', mode: 'copy', force: true });
  assert.equal(updated.transactionId, 'tx-2');

  const target = join(project, '.agents', 'skills', 'skill-a');
  assert.equal(readFileSync(join(target, 'payload.txt'), 'utf8'), 'v2');

  const rolled = lifecycle.rollback();
  assert.equal(rolled.transactionId, 'tx-2');
  assert.equal(readFileSync(join(target, 'payload.txt'), 'utf8'), 'v1');

  const lock = readSkillLock(resolveSkillLockPath({ projectRoot: project }));
  assert.equal(lock.history.length, 1);
});

test('rollback removes a target that did not exist before install', () => {
  const repo = temp();
  const project = temp();
  writeSkill(repo, 'skill-a');
  const lifecycle = manager(repo, project);
  lifecycle.sync({ targetName: 'agents', mode: 'copy' });

  const target = join(project, '.agents', 'skills', 'skill-a');
  assert.equal(existsSync(target), true);
  lifecycle.rollback();
  assert.equal(existsSync(target), false);
});

test('dry run does not write target or lock', () => {
  const repo = temp();
  const project = temp();
  writeSkill(repo, 'skill-a');
  const lifecycle = manager(repo, project);
  const result = lifecycle.sync({ targetName: 'agents', mode: 'copy', dryRun: true });

  assert.equal(result.results[0].action, 'copy');
  assert.equal(existsSync(join(project, '.agents', 'skills', 'skill-a')), false);
  assert.equal(existsSync(resolveSkillLockPath({ projectRoot: project })), false);
});

test('managed copy sync is idempotent and updates source changes without force', () => {
  const repo = temp();
  const project = temp();
  writeSkill(repo, 'skill-a', 'v1');
  const lifecycle = manager(repo, project);

  lifecycle.sync({ targetName: 'agents', mode: 'copy' });
  const second = lifecycle.sync({ targetName: 'agents', mode: 'copy' });
  assert.equal(second.transactionId, null);
  assert.equal(second.results[0].action, 'unchanged');

  writeFileSync(join(repo, 'skill-a', 'payload.txt'), 'v2');
  const third = lifecycle.sync({ targetName: 'agents', mode: 'copy' });
  assert.equal(third.transactionId, 'tx-2');
  assert.equal(third.results[0].action, 'copy');
  assert.equal(
    readFileSync(join(project, '.agents', 'skills', 'skill-a', 'payload.txt'), 'utf8'),
    'v2',
  );
});

test('status detects copy source changes before sync', () => {
  const repo = temp();
  const project = temp();
  writeSkill(repo, 'skill-a', 'v1');
  const lifecycle = manager(repo, project);
  lifecycle.sync({ targetName: 'agents', mode: 'copy' });

  writeFileSync(join(repo, 'skill-a', 'payload.txt'), 'v2');
  const status = lifecycle.status();
  assert.equal(status.items[0].state, 'source-changed');
});
