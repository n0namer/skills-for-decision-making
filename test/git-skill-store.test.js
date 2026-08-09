import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { GitSkillStore } from '../lib/git-skill-store.js';

function temp(prefix = 'sdm-git-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function commit(repo, payload) {
  mkdirSync(join(repo, 'skill-a'), { recursive: true });
  writeFileSync(
    join(repo, 'skill-a', 'SKILL.md'),
    '---\nname: skill-a\ndescription: a\n---\n',
  );
  writeFileSync(join(repo, 'skill-a', 'payload.txt'), payload);
  git(repo, ['add', '.']);
  git(repo, ['commit', '-m', payload]);
  return git(repo, ['rev-parse', 'HEAD']);
}

test('GitSkillStore materializes and updates a branch through its cache', () => {
  const origin = temp();
  git(origin, ['init']);
  git(origin, ['config', 'user.email', 'test@example.com']);
  git(origin, ['config', 'user.name', 'Test']);

  const v1 = commit(origin, 'v1');
  const store = new GitSkillStore({ cacheRoot: temp() });
  const first = store.materialize({ repository: origin, ref: 'master' });
  assert.equal(first.revision, v1);
  assert.equal(readFileSync(join(first.root, 'skill-a', 'payload.txt'), 'utf8'), 'v1');

  const v2 = commit(origin, 'v2');
  const second = store.materialize({ repository: origin, ref: 'master' });
  assert.equal(second.revision, v2);
  assert.equal(readFileSync(join(second.root, 'skill-a', 'payload.txt'), 'utf8'), 'v2');
});
