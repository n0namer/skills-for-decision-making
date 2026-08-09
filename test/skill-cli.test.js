import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runSkillCli } from '../lib/skill-cli.js';

function temp() {
  return mkdtempSync(join(tmpdir(), 'sdm-cli-'));
}

function skill(repo) {
  mkdirSync(join(repo, 'skill-a'), { recursive: true });
  writeFileSync(
    join(repo, 'skill-a', 'SKILL.md'),
    '---\nname: skill-a\ndescription: a\n---\n',
  );
}

test('legacy install keeps old result shape and does not create lifecycle lock', () => {
  const repo = temp();
  const project = temp();
  skill(repo);

  const result = runSkillCli({
    argv: ['--project-root', project, '--mode', 'copy'],
    repoRoot: repo,
    legacyInstall: true,
  });

  assert.equal(result.source, repo);
  assert.equal(result.scope, 'project');
  assert.equal(result.results[0].action, 'copy');
  assert.equal(existsSync(join(project, '.agents', 'skills.lock.json')), false);
});

test('new sync writes lifecycle lock', () => {
  const repo = temp();
  const project = temp();
  skill(repo);

  runSkillCli({
    argv: ['sync', '--project-root', project, '--mode', 'copy'],
    repoRoot: repo,
  });

  assert.equal(existsSync(join(project, '.agents', 'skills.lock.json')), true);
});

test('help is explicit and unknown commands fail closed', () => {
  const repo = temp();
  assert.match(runSkillCli({ argv: ['help'], repoRoot: repo }).help, /sync/);
  assert.throws(
    () => runSkillCli({ argv: ['destroy'], repoRoot: repo }),
    /unknown sdm-skills command/,
  );
});
