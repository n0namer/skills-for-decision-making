import { readFileSync } from 'node:fs';

function registryByName(registry = []) {
  return new Map(registry.map((skill) => [skill.name, skill]));
}

export function materializePipelineExecution({
  pipeline,
  registry = [],
  request = '',
  context = null,
  decisionSpec = null,
} = {}) {
  if (!pipeline || !Array.isArray(pipeline.steps)) {
    throw new Error('pipeline with steps is required');
  }

  const byName = registryByName(registry);
  const steps = pipeline.steps.map((step, index) => {
    if (step.kind === 'skill') {
      const skill = byName.get(step.id);
      if (!skill) throw new Error(`pipeline skill is not installed/discoverable: ${step.id}`);
      if (!skill.path) throw new Error(`pipeline skill has no SKILL.md path: ${step.id}`);

      let instructions;
      try {
        instructions = readFileSync(skill.path, 'utf8');
      } catch (error) {
        throw new Error(`could not read ${step.id} instructions: ${error.message}`);
      }

      return {
        index,
        kind: 'skill',
        id: step.id,
        reason: step.reason,
        path: skill.path,
        capabilities: skill.capabilities ?? [],
        instructions,
      };
    }

    if (step.kind === 'method') {
      return {
        index,
        kind: 'method',
        id: step.id,
        reason: step.reason,
      };
    }

    throw new Error(`unsupported pipeline step kind: ${step.kind}`);
  });

  return {
    schemaVersion: 1,
    request,
    context,
    decisionSpec,
    steps,
  };
}

function nextState(state, step, output) {
  return {
    ...state,
    lastOutput: output,
    outputs: {
      ...(state.outputs ?? {}),
      [`${step.kind}:${step.id}`]: output,
    },
  };
}

export async function executePipeline({
  execution,
  runSkill,
  runMethod,
  initialState = {},
} = {}) {
  if (!execution || !Array.isArray(execution.steps)) {
    throw new Error('materialized execution with steps is required');
  }

  let state = { ...initialState, outputs: { ...(initialState.outputs ?? {}) } };
  const results = [];

  for (const step of execution.steps) {
    const runner = step.kind === 'skill' ? runSkill : runMethod;
    if (typeof runner !== 'function') {
      throw new Error(`no ${step.kind} runner configured for pipeline step: ${step.id}`);
    }

    let output;
    try {
      output = await runner({
        step,
        request: execution.request,
        context: execution.context,
        decisionSpec: execution.decisionSpec,
        state,
        priorResults: [...results],
      });
    } catch (error) {
      const wrapped = new Error(
        `pipeline stopped at step ${step.index} (${step.kind}:${step.id}): ${error.message}`,
      );
      wrapped.cause = error;
      throw wrapped;
    }

    const result = {
      index: step.index,
      kind: step.kind,
      id: step.id,
      status: 'completed',
      output,
    };
    results.push(result);
    state = nextState(state, step, output);
  }

  return {
    schemaVersion: 1,
    status: 'completed',
    request: execution.request,
    results,
    state,
  };
}
