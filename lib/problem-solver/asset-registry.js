import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FLOW_STATUSES = new Set(['draft', 'tested', 'candidate', 'stable', 'deprecated']);
const PRIMITIVE_STATUSES = new Set(['draft', 'tested', 'candidate', 'stable', 'deprecated']);

function clone(value) {
  return structuredClone(value);
}

function requireArray(value, name) {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value;
}

function assertAssetCommon(asset, statusSet, label) {
  if (!asset || typeof asset !== 'object' || Array.isArray(asset)) throw new Error(`${label} must be an object`);
  if (typeof asset.id !== 'string' || !asset.id) throw new Error(`${label}.id is required`);
  if (!Number.isInteger(asset.version) || asset.version < 1) throw new Error(`${label}.version must be an integer >= 1`);
  if (!statusSet.has(asset.status)) throw new Error(`${label}.status is invalid`);
  requireArray(asset.capabilities ?? [], `${label}.capabilities`);
}

export function assertPrimitive(primitive) {
  assertAssetCommon(primitive, PRIMITIVE_STATUSES, 'Primitive');
  if (typeof primitive.entrypoint !== 'string' || !primitive.entrypoint) throw new Error('Primitive.entrypoint is required');
  return clone(primitive);
}

export function assertFlow(flow) {
  assertAssetCommon(flow, FLOW_STATUSES, 'Flow');
  if (typeof flow.taskFamily !== 'string' || !flow.taskFamily) throw new Error('Flow.taskFamily is required');
  if (typeof flow.entrypoint !== 'string' || !flow.entrypoint) throw new Error('Flow.entrypoint is required');
  const metrics = flow.metrics ?? {};
  for (const key of ['quality', 'reliability']) {
    if (metrics[key] !== undefined && (typeof metrics[key] !== 'number' || metrics[key] < 0 || metrics[key] > 1)) {
      throw new Error(`Flow.metrics.${key} must be between 0 and 1`);
    }
  }
  if (metrics.medianDurationMinutes !== undefined && (typeof metrics.medianDurationMinutes !== 'number' || metrics.medianDurationMinutes < 0)) {
    throw new Error('Flow.metrics.medianDurationMinutes must be >= 0');
  }
  if (metrics.medianCostUsd !== undefined && (typeof metrics.medianCostUsd !== 'number' || metrics.medianCostUsd < 0)) {
    throw new Error('Flow.metrics.medianCostUsd must be >= 0');
  }
  return clone(flow);
}

export function loadAssetRegistry(root = resolve(process.cwd(), 'registry')) {
  const primitivesDoc = JSON.parse(readFileSync(join(root, 'primitives.json'), 'utf8'));
  const flowsDoc = JSON.parse(readFileSync(join(root, 'flows.json'), 'utf8'));
  const evalsDoc = JSON.parse(readFileSync(join(root, 'evals.json'), 'utf8'));
  return {
    primitives: requireArray(primitivesDoc.primitives, 'primitives').map(assertPrimitive),
    flows: requireArray(flowsDoc.flows, 'flows').map(assertFlow),
    evals: requireArray(evalsDoc.evals, 'evals').map(clone),
  };
}

function hasAllCapabilities(asset, required) {
  const own = new Set(asset.capabilities ?? []);
  return required.every((capability) => own.has(capability));
}

export function rankFlowCandidates(flows, {
  taskFamily,
  requiredCapabilities = [],
  qualityMin = 0,
  reliabilityMin = 0,
  slaMinutes = Infinity,
  allowCandidate = false,
} = {}) {
  if (!taskFamily) throw new Error('taskFamily is required');
  const allowedStatuses = allowCandidate ? new Set(['stable', 'candidate']) : new Set(['stable']);

  return flows
    .map(assertFlow)
    .filter((flow) => allowedStatuses.has(flow.status))
    .filter((flow) => flow.taskFamily === taskFamily || flow.taskFamily === '*')
    .filter((flow) => hasAllCapabilities(flow, requiredCapabilities))
    .filter((flow) => (flow.metrics?.quality ?? -Infinity) >= qualityMin)
    .filter((flow) => (flow.metrics?.reliability ?? -Infinity) >= reliabilityMin)
    .filter((flow) => (flow.metrics?.medianDurationMinutes ?? Infinity) <= slaMinutes)
    .sort((a, b) => {
      const aExact = a.taskFamily === taskFamily ? 1 : 0;
      const bExact = b.taskFamily === taskFamily ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      const aStable = a.status === 'stable' ? 1 : 0;
      const bStable = b.status === 'stable' ? 1 : 0;
      if (aStable !== bStable) return bStable - aStable;
      const ac = a.metrics?.medianCostUsd ?? Infinity;
      const bc = b.metrics?.medianCostUsd ?? Infinity;
      if (ac !== bc) return ac - bc;
      const at = a.metrics?.medianDurationMinutes ?? Infinity;
      const bt = b.metrics?.medianDurationMinutes ?? Infinity;
      if (at !== bt) return at - bt;
      const aq = a.metrics?.quality ?? -Infinity;
      const bq = b.metrics?.quality ?? -Infinity;
      if (aq !== bq) return bq - aq;
      const ar = a.metrics?.reliability ?? -Infinity;
      const br = b.metrics?.reliability ?? -Infinity;
      return br - ar;
    });
}

export function selectBestFlow(flows, options) {
  return rankFlowCandidates(flows, options)[0] ?? null;
}
