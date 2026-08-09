// High-level orchestrator: request -> signals -> context -> skills -> math methods -> pipeline.

import { discoverSkills } from './skill-registry.js';
import {
  loadContextRegistry,
  normalizeContextRegistry,
  selectRelevantContext,
} from './context-registry.js';
import { inferSignals, routeSkills } from './skill-router.js';
import { planPipeline } from './pipeline-planner.js';
import { selectDecisionMethods } from './method-router.js';
import { executePipeline, materializePipelineExecution } from './pipeline-executor.js';

function buildOrchestration({
  request = '',
  signals = null,
  decisionSpec = null,
  skillRoots = null,
  contextDir = null,
  contextData = null,
  runtime = null,
} = {}) {
  const effectiveSignals = signals ?? inferSignals(request);
  const registry = discoverSkills(skillRoots ? { roots: skillRoots } : undefined);
  const context = contextData
    ? normalizeContextRegistry(contextData, { contextDir: 'host-agent' })
    : loadContextRegistry(contextDir ?? undefined);
  const relevantContext = selectRelevantContext(context, effectiveSignals);
  const routedSkills = routeSkills(effectiveSignals, registry);
  const methods = decisionSpec ? selectDecisionMethods(decisionSpec) : [];
  const pipeline = planPipeline({ routedSkills, methods });

  return {
    registry,
    result: {
      request,
      signals: effectiveSignals,
      runtime,
      registry: {
        count: registry.length,
        skills: registry.map(({ name, description, capabilities, path }) => ({
          name, description, capabilities, path,
        })),
      },
      context: relevantContext,
      routing: routedSkills,
      pipeline,
    },
  };
}

export function orchestrate(options = {}) {
  return buildOrchestration(options).result;
}

export function prepareOrchestrationExecution(options = {}) {
  const built = buildOrchestration(options);
  return {
    ...built.result,
    execution: materializePipelineExecution({
      pipeline: built.result.pipeline,
      registry: built.registry,
      request: built.result.request,
      context: built.result.context,
      decisionSpec: options.decisionSpec ?? null,
    }),
  };
}

export async function executeOrchestration({
  runSkill,
  runMethod,
  initialState = {},
  ...options
} = {}) {
  const prepared = prepareOrchestrationExecution(options);
  const completed = await executePipeline({
    execution: prepared.execution,
    runSkill,
    runMethod,
    initialState,
  });

  return {
    ...prepared,
    execution: completed,
  };
}
