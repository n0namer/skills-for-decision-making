// High-level orchestrator: request -> signals -> context -> skills -> math methods -> pipeline.

import { discoverSkills } from './skill-registry.js';
import { loadContextRegistry, selectRelevantContext } from './context-registry.js';
import { inferSignals, routeSkills } from './skill-router.js';
import { planPipeline } from './pipeline-planner.js';
import { selectDecisionMethods } from './method-router.js';

export function orchestrate({
  request = '',
  signals = null,
  decisionSpec = null,
  skillRoots = null,
  contextDir = null,
} = {}) {
  const effectiveSignals = signals ?? inferSignals(request);
  const registry = discoverSkills(skillRoots ? { roots: skillRoots } : undefined);
  const context = loadContextRegistry(contextDir ?? undefined);
  const relevantContext = selectRelevantContext(context, effectiveSignals);
  const routedSkills = routeSkills(effectiveSignals, registry);
  const methods = decisionSpec ? selectDecisionMethods(decisionSpec) : [];
  const pipeline = planPipeline({ routedSkills, methods });

  return {
    request,
    signals: effectiveSignals,
    registry: {
      count: registry.length,
      skills: registry.map(({ name, description, capabilities, path }) => ({
        name, description, capabilities, path,
      })),
    },
    context: relevantContext,
    routing: routedSkills,
    pipeline,
  };
}
