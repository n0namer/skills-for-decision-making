import { TASK_MODES } from './contracts.js';

export function selectTaskMode({
  hasDirectPrimitive = false,
  hasStableFlow = false,
  requiresPlanning = false,
  openEnded = false,
} = {}) {
  let mode;
  if (openEnded) mode = 'L3';
  else if (requiresPlanning) mode = 'L2';
  else if (hasDirectPrimitive) mode = 'L0';
  else if (hasStableFlow) mode = 'L1';
  else mode = 'L2';
  if (!TASK_MODES.includes(mode)) throw new Error(`unsupported task mode: ${mode}`);
  return mode;
}
