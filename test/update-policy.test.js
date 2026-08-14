import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function json(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

test('distribution source points at the active fork branch, not a local checkout', () => {
  const manifest = json('skills.sources.json');
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.sources.length, 1);

  const [source] = manifest.sources;
  assert.equal(source.type, 'git');
  assert.equal(source.repository, 'https://github.com/n0namer/skills-for-decision-making.git');
  assert.equal(source.ref, 'refactor/skill-lifecycle-foundations');
  assert.equal(source.subdir, '.');
});

test('consumer update policy forbids normal project checkouts', () => {
  const policy = json('update-policy.json');
  assert.equal(policy.schemaVersion, 1);
  assert.equal(policy.skillSourceManifest, 'skills.sources.json');
  assert.equal(policy.consumerUpdate.repositoryCheckoutPolicy, 'cache-only');
  assert.equal(policy.consumerUpdate.allowCheckoutInsideUserProject, false);
  assert.equal(policy.consumerUpdate.targetPolicy, 'existing-targets-only');
  assert.equal(policy.consumerUpdate.fullRepositoryCheckRequiredBeforeSync, false);
});

test('same-session update-and-run requires the new skill revision', () => {
  const policy = json('update-policy.json');
  const sameSession = policy.consumerUpdate.sameSessionUpdateAndRun;
  assert.equal(sameSession.requirePostSyncSkillReload, true);
  assert.equal(sameSession.allowPreUpdateInMemorySkill, false);
  assert.equal(sameSession.requireRuntimeRevisionMatch, true);
  assert.equal(sameSession.normalDecisionOrchestratorCommand, 'bundle');
  assert.equal(sameSession.planningCommandCompletesUserTask, false);

  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Same-session update \+ run/i);
  assert.match(agents, /bundle\.runtime\.revision/i);
  assert.match(agents, /not trust a skill definition that was loaded before synchronization/i);
});

test('maintainer policy tracks the original upstream through fork master', () => {
  const policy = json('update-policy.json');
  assert.equal(
    policy.maintainerUpdate.upstreamRepository,
    'https://github.com/romainsimon/skills-for-decision-making.git',
  );
  assert.equal(policy.maintainerUpdate.upstreamBranch, 'master');
  assert.equal(policy.maintainerUpdate.forkBaseBranch, 'master');
  assert.equal(policy.maintainerUpdate.upstreamToForkStrategy, 'fast-forward-only');
  assert.equal(policy.maintainerUpdate.allowAutomaticForcePush, false);
});

test('agent instructions distinguish consumer updates from maintainer updates', () => {
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  const update = readFileSync(join(root, 'UPDATE.md'), 'utf8');

  assert.match(agents, /delivery source/i);
  assert.match(agents, /Do \*\*not\*\* clone this repository into the user's project/i);
  assert.match(update, /Consumer update/i);
  assert.match(update, /Maintainer update/i);
  assert.match(update, /Never substitute B for A/i);
});
