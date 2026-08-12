// Adapter boundary between the general Adaptive Problem Solver and the existing
// decision-specific orchestration engine. Keeping this wrapper prevents the
// general controller/registry layer from depending on decision-engine internals.

import { executeOrchestration } from '../../orchestrator.js';

export async function runDecisionFlow(options = {}) {
  return executeOrchestration(options);
}
