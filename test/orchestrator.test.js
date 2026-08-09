import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { discoverSkills, parseSkillFrontmatter } from '../lib/skill-registry.js';
import { loadContextRegistry, selectRelevantContext } from '../lib/context-registry.js';
import { inferSignals, routeSkills } from '../lib/skill-router.js';
import { planPipeline } from '../lib/pipeline-planner.js';
import { orchestrate, prepareOrchestrationExecution } from '../lib/orchestrator.js';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'sdm-orchestrator-'));
}

function writeSkill(root, name, description = 'test skill') {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\nmetadata:\n  capabilities: one,two\n---\n# ${name}\n`);
}

test('frontmatter parser reads metadata capabilities source', () => {
  const fm = parseSkillFrontmatter('---\nname: demo\ndescription: Demo skill\nmetadata:\n  capabilities: a,b\n---\n');
  assert.equal(fm.name, 'demo');
  assert.equal(fm.metadata.capabilities, 'a,b');
});

test('skill registry discovers SKILL.md and capabilities', () => {
  const root = tempDir();
  writeSkill(root, 'framing-decisions');
  const skills = discoverSkills({ roots: [root] });
  assert.equal(skills.length, 1);
  assert.equal(skills[0].name, 'framing-decisions');
  assert.deepEqual(skills[0].capabilities, ['one', 'two']);
});

test('Russian allocation request infers portfolio/resource signals', () => {
  const signals = inferSignals('Как распределить 20 часов между несколькими проектами?');
  assert.equal(signals.resourceAllocation, true);
  assert.equal(signals.portfolioDecision, true);
});

test('resource allocation routes to framing plus allocating effort', () => {
  const routed = routeSkills({ resourceAllocation: true }, []);
  assert.deepEqual(routed.map((x) => x.skill), ['framing-decisions', 'allocating-effort']);
});

test('routing does not silently drop a required skill when registry is incomplete', () => {
  const routed = routeSkills(
    { resourceAllocation: true },
    [{ name: 'framing-decisions' }],
  );
  assert.deepEqual(routed.map((x) => x.skill), ['framing-decisions', 'allocating-effort']);
});

test('execution materialization fails closed when a routed skill is missing', () => {
  const skillRoot = tempDir();
  writeSkill(skillRoot, 'framing-decisions');
  assert.throws(
    () => prepareOrchestrationExecution({
      request: 'Как распределить 20 часов между проектами?',
      skillRoots: [skillRoot],
    }),
    /pipeline skill is not installed\/discoverable: allocating-effort/,
  );
});

test('research-vs-act routes to framing plus value of information', () => {
  const routed = routeSkills({ needsMoreInformation: true }, []);
  assert.deepEqual(routed.map((x) => x.skill), ['framing-decisions', 'valuing-information']);
});

test('pipeline planner inserts framing dependency and keeps deterministic order', () => {
  const pipeline = planPipeline({
    routedSkills: [{ skill: 'allocating-effort', reason: 'limited resource' }],
  });
  assert.deepEqual(pipeline.skills, ['framing-decisions', 'allocating-effort']);
});

test('context registry selects all active projects in portfolio mode', () => {
  const root = tempDir();
  writeFileSync(join(root, 'projects.json'), JSON.stringify({ projects: [
    { id: 'a', status: 'active' },
    { id: 'b', status: 'stopped' },
    { id: 'c', status: 'active' },
  ] }));
  writeFileSync(join(root, 'resources.json'), JSON.stringify({ resources: { time: { available: 10 } } }));
  const context = loadContextRegistry(root);
  const selected = selectRelevantContext(context, { portfolioDecision: true });
  assert.deepEqual(selected.projects.map((p) => p.id), ['a', 'c']);
  assert.equal(selected.resources.time.available, 10);
});

test('orchestrator composes registry context and minimal pipeline', () => {
  const skillRoot = tempDir();
  writeSkill(skillRoot, 'framing-decisions');
  writeSkill(skillRoot, 'allocating-effort');

  const contextRoot = tempDir();
  writeFileSync(join(contextRoot, 'projects.json'), JSON.stringify({ projects: [
    { id: 'a', status: 'active' },
    { id: 'b', status: 'active' },
  ] }));
  writeFileSync(join(contextRoot, 'resources.json'), JSON.stringify({ resources: { time: { available: 20 } } }));

  const result = orchestrate({
    request: 'Как распределить 20 часов между несколькими проектами?',
    skillRoots: [skillRoot],
    contextDir: contextRoot,
  });

  assert.deepEqual(result.pipeline.skills, ['framing-decisions', 'allocating-effort']);
  assert.deepEqual(result.context.projects.map((p) => p.id), ['a', 'b']);
  assert.equal(result.context.resources.time.available, 20);
});
