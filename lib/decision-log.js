// Append-only decision/evidence records for later calibration and retrospective analysis.

import { appendFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function validateDecisionRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) errors.push('record must be an object');
  if (!record?.id) errors.push('record.id is required');
  if (!record?.date) errors.push('record.date is required');
  return { valid: errors.length === 0, errors };
}

export function appendDecisionRecord(contextDir, record) {
  const validation = validateDecisionRecord(record);
  if (!validation.valid) throw new Error(validation.errors.join('; '));
  const dir = resolve(contextDir);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'decisions.jsonl');
  appendFileSync(path, `${JSON.stringify(record)}\n`, 'utf8');
  return { path, id: record.id };
}
