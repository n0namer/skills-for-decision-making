import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  discoverRepositorySkills,
  loadSourceManifest,
  validateSourceManifest,
} from '../lib/skill-source-registry.js';

function temp() {
  return mkdtempSync(join(tmpdir(), 'sdm-source-'));
}

function skill(root, name) {
  mkdirSync(join(root, name), { recursive: true });
  writeFileSync(
    join(root, name, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${name}\n---\n`,
  );
}

test('missing source manifest uses repository source', () => {
  const repo = temp();
  skill(repo, 'a');
  const manifest = loadSourceManifest({ repoRoot: repo });
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(discoverRepositorySkills({ repoRoot: repo, manifest }).length, 1);
});

test('unknown source types fail closed', () => {
  assert.throws(
    () => validateSourceManifest({
      schemaVersion: 1,
      sources: [{ id: 'remote', type: 'magic', path: '.' }],
    }),
    /unsupported skill source type/,
  );
});

test('duplicate source skill names fail closed', () => {
  const repo = temp();
  mkdirSync(join(repo, 'one'));
  mkdirSync(join(repo, 'two'));
  skill(join(repo, 'one'), 'a');
  skill(join(repo, 'two'), 'a');

  const manifest = {
    schemaVersion: 1,
    sources: [
      { id: 'one', type: 'local', path: 'one', maxDepth: 2 },
      { id: 'two', type: 'local', path: 'two', maxDepth: 2 },
    ],
  };
  assert.throws(
    () => discoverRepositorySkills({ repoRoot: repo, manifest }),
    /duplicate skill name/,
  );
});
