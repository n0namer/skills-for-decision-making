import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';

export const SKILL_LOCK_SCHEMA_VERSION = 1;

export function emptySkillLock() {
  return {
    schemaVersion: SKILL_LOCK_SCHEMA_VERSION,
    updatedAt: null,
    installations: [],
    history: [],
  };
}

export function validateSkillLock(lock) {
  if (!lock || lock.schemaVersion !== SKILL_LOCK_SCHEMA_VERSION) {
    throw new Error(`skills.lock.json schemaVersion must be ${SKILL_LOCK_SCHEMA_VERSION}`);
  }
  if (!Array.isArray(lock.installations) || !Array.isArray(lock.history)) {
    throw new Error('skills.lock.json must contain installations and history arrays');
  }
  return lock;
}

export function readSkillLock(lockPath) {
  if (!existsSync(lockPath)) return emptySkillLock();

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(lockPath, 'utf8'));
  } catch (error) {
    throw new Error(`invalid skills.lock.json: ${error.message}`);
  }
  return validateSkillLock(parsed);
}

export function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}-${randomUUID()}`;
  try {
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`);
    renameSync(temp, path);
  } catch (error) {
    rmSync(temp, { force: true, recursive: true });
    throw error;
  }
}

export function writeSkillLock(lockPath, lock) {
  validateSkillLock(lock);
  writeJsonAtomic(lockPath, lock);
  return lock;
}
