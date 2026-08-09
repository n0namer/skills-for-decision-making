import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { materializePipelineExecution, executePipeline } from '../lib/pipeline-executor.js';
import { executeOrchestration, prepareOrchestrationExecution } from '../lib/orchestrator.js';

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'sdm-executor-'));
}

function writeSkill(root, name, body = '') {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'SKILL.md');
  writeFileSync(
    path,
    `---\nname: ${name}\ndescription: ${name}\nmetadata:\n  capabilities: test\n---\n# ${name}\n${body}\n`,
  );
  return path;
}

test('materialized execution embeds selected SKILL.md instructions', () => {
  const root = tempDir();
  const path = writeSkill(root, 'framing-decisions', 'FRAME IT');
  const execution = materializePipelineExecution({
    pipeline: {
      steps: [{ kind: 'skill', id: 'framing-decisions', reason: 'frame first' }],
    },
    registry: [{ name: 'framing-decisions', path, capabilities: ['test'] }],
    request: 'choose',
  });

  assert.equal(execution.steps.length, 1);
  assert.equal(execution.steps[0].id, 'framing-decisions');
  assert.match(execution.steps[0].instructions, /FRAME IT/);
});

test('materialization fails closed when a routed skill is unavailable', () => {
  assert.throws(
    () => materializePipelineExecution({
      pipeline: { steps: [{ kind: 'skill', id: 'missing', reason: 'needed' }] },
      registry: [],
    }),
    /not installed\/discoverable/,
  );
});

test('pipeline executor runs steps in order and passes prior outputs forward', async () => {
  const seen = [];
  const execution = {
    schemaVersion: 1,
    request: 'demo',
    context: { project: 'x' },
    decisionSpec: null,
    steps: [
      { index: 0, kind: 'skill', id: 'a', instructions: '# a' },
      { index: 1, kind: 'method', id: 'm' },
      { index: 2, kind: 'skill', id: 'b', instructions: '# b' },
    ],
  };

  const result = await executePipeline({
    execution,
    runSkill: async ({ step, state }) => {
      seen.push(`${step.kind}:${step.id}`);
      if (step.id === 'b') assert.equal(state.outputs['method:m'].value, 2);
      return { value: step.id === 'a' ? 1 : 3 };
    },
    runMethod: async ({ step, state }) => {
      seen.push(`${step.kind}:${step.id}`);
      assert.equal(state.outputs['skill:a'].value, 1);
      return { value: 2 };
    },
  });

  assert.deepEqual(seen, ['skill:a', 'method:m', 'skill:b']);
  assert.equal(result.status, 'completed');
  assert.equal(result.state.outputs['skill:b'].value, 3);
});

test('pipeline executor stops immediately when a step fails', async () => {
  const seen = [];
  await assert.rejects(
    executePipeline({
      execution: {
        steps: [
          { index: 0, kind: 'skill', id: 'a' },
          { index: 1, kind: 'skill', id: 'b' },
        ],
      },
      runSkill: async ({ step }) => {
        seen.push(step.id);
        if (step.id === 'a') throw new Error('boom');
        return {};
      },
      runMethod: async () => ({}),
    }),
    /pipeline stopped at step 0 \(skill:a\): boom/,
  );
  assert.deepEqual(seen, ['a']);
});

test('decision orchestration can be executed through one entrypoint', async () => {
  const skillRoot = tempDir();
  writeSkill(skillRoot, 'framing-decisions', 'FRAME');
  writeSkill(skillRoot, 'allocating-effort', 'ALLOCATE');
  const contextRoot = tempDir();

  const prepared = prepareOrchestrationExecution({
    request: 'allocate limited time',
    signals: { resourceAllocation: true },
    skillRoots: [skillRoot],
    contextDir: contextRoot,
  });
  assert.deepEqual(
    prepared.execution.steps.map((step) => step.id),
    ['framing-decisions', 'allocating-effort'],
  );
  assert.match(prepared.execution.steps[1].instructions, /ALLOCATE/);

  const seen = [];
  const completed = await executeOrchestration({
    request: 'allocate limited time',
    signals: { resourceAllocation: true },
    skillRoots: [skillRoot],
    contextDir: contextRoot,
    runSkill: async ({ step, state }) => {
      seen.push(step.id);
      return { applied: step.id, previous: state.lastOutput?.applied ?? null };
    },
    runMethod: async () => ({}),
  });

  assert.deepEqual(seen, ['framing-decisions', 'allocating-effort']);
  assert.equal(completed.execution.status, 'completed');
  assert.equal(
    completed.execution.state.outputs['skill:allocating-effort'].previous,
    'framing-decisions',
  );
});
