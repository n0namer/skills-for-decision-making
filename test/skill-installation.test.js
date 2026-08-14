import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { installSkill } from '../lib/skill-installer.js';
import { discoverRepositorySkills } from '../lib/skill-source-registry.js';
import { expandTargetProfiles, resolveTargetBase } from '../lib/skill-targets.js';

function tempDir(prefix = 'sdm-skill-install-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeSkill(root, name) {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} description\n---\n# ${name}\n`);
  writeFileSync(join(dir, 'payload.txt'), name);
  return dir;
}

test('target resolver preserves existing project and global paths', () => {
  assert.equal(
    resolveTargetBase({ target: 'codex', scope: 'project', projectRoot: '/workspace/project', homeDir: '/home/test' }),
    resolve('/workspace/project/.agents/skills'),
  );
  assert.equal(
    resolveTargetBase({ target: 'opencode', scope: 'global', projectRoot: '/workspace/project', homeDir: '/home/test' }),
    resolve('/home/test/.config/opencode/skills'),
  );
  assert.equal(
    resolveTargetBase({ target: 'cline', scope: 'project', projectRoot: '/workspace/project', homeDir: '/home/test' }),
    resolve('/workspace/project/.cline/skills'),
  );
});

test('all target preserves existing profile expansion without codex duplicate', () => {
  assert.deepEqual(expandTargetProfiles('all'), ['agents', 'opencode', 'cline', 'claude']);
});

test('target resolver fails closed for unknown target and scope', () => {
  assert.throws(() => expandTargetProfiles('unknown'), /unknown target/);
  assert.throws(
    () => resolveTargetBase({ target: 'agents', scope: 'workspace' }),
    /scope must be project or global/,
  );
});

test('repository source registry returns installable skill source directories', () => {
  const root = tempDir();
  const skillDir = writeSkill(root, 'framing-decisions');
  const skills = discoverRepositorySkills({ repoRoot: root });
  assert.equal(skills.length, 1);
  assert.equal(skills[0].name, 'framing-decisions');
  assert.equal(skills[0].sourceDir, skillDir);
});

test('symlink install is idempotent', () => {
  const root = tempDir();
  const source = writeSkill(root, 'skill-a');
  const target = join(root, 'target', 'skill-a');

  assert.equal(installSkill({ sourceDir: source, targetDir: target, mode: 'symlink' }), 'symlink');
  assert.equal(lstatSync(target).isSymbolicLink(), true);
  assert.equal(installSkill({ sourceDir: source, targetDir: target, mode: 'symlink' }), 'unchanged');
});

test('copy install preserves existing no-force behavior', () => {
  const root = tempDir();
  const source = writeSkill(root, 'skill-a');
  const target = join(root, 'target', 'skill-a');

  assert.equal(installSkill({ sourceDir: source, targetDir: target, mode: 'copy' }), 'copy');
  assert.equal(readFileSync(join(target, 'payload.txt'), 'utf8'), 'skill-a');
  assert.equal(installSkill({ sourceDir: source, targetDir: target, mode: 'copy' }), 'exists');
});

test('force replaces an existing install', () => {
  const root = tempDir();
  const source = writeSkill(root, 'skill-a');
  const target = join(root, 'target', 'skill-a');
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'stale.txt'), 'stale');

  assert.equal(installSkill({ sourceDir: source, targetDir: target, mode: 'copy', force: true }), 'copy');
  assert.equal(existsSync(join(target, 'stale.txt')), false);
  assert.equal(readFileSync(join(target, 'payload.txt'), 'utf8'), 'skill-a');
});

test('dry run preserves action reporting without filesystem writes', () => {
  const root = tempDir();
  const source = writeSkill(root, 'skill-a');
  const target = join(root, 'target', 'skill-a');

  assert.equal(installSkill({ sourceDir: source, targetDir: target, dryRun: true }), 'symlink');
  assert.equal(existsSync(target), false);
  assert.equal(installSkill({ sourceDir: source, targetDir: target, mode: 'copy', dryRun: true }), 'copy');
  assert.equal(existsSync(target), false);
});

test('invalid install mode fails closed', () => {
  const root = tempDir();
  const source = writeSkill(root, 'skill-a');
  assert.throws(
    () => installSkill({ sourceDir: source, targetDir: join(root, 'target'), mode: 'move' }),
    /mode must be auto, symlink or copy/,
  );
});
