import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const TARGET_PATHS = {
  project: {
    agents: ['.agents', 'skills'],
    codex: ['.agents', 'skills'],
    opencode: ['.opencode', 'skills'],
    cline: ['.cline', 'skills'],
    claude: ['.claude', 'skills'],
  },
  global: {
    agents: ['.agents', 'skills'],
    codex: ['.agents', 'skills'],
    opencode: ['.config', 'opencode', 'skills'],
    cline: ['.cline', 'skills'],
    claude: ['.claude', 'skills'],
  },
};

export const INSTALL_TARGETS = Object.freeze(Object.keys(TARGET_PATHS.project));
export const ALL_TARGETS = Object.freeze(['agents', 'opencode', 'cline', 'claude']);
export const INSTALL_SCOPES = Object.freeze(Object.keys(TARGET_PATHS));

export function validateScope(scope) {
  if (!INSTALL_SCOPES.includes(scope)) {
    throw new Error('scope must be project or global');
  }
  return scope;
}

export function expandTargetProfiles(targetName) {
  if (targetName === 'all') return [...ALL_TARGETS];
  if (!INSTALL_TARGETS.includes(targetName)) {
    throw new Error(`unknown target: ${targetName}`);
  }
  return [targetName];
}

export function resolveTargetBase({
  target,
  scope = 'project',
  projectRoot = process.cwd(),
  homeDir = homedir(),
}) {
  validateScope(scope);
  if (!INSTALL_TARGETS.includes(target)) {
    throw new Error(`unknown target: ${target}`);
  }

  const root = scope === 'global' ? resolve(homeDir) : resolve(projectRoot);
  return join(root, ...TARGET_PATHS[scope][target]);
}

export function resolveSkillStateRoot({
  scope = 'project',
  projectRoot = process.cwd(),
  homeDir = homedir(),
} = {}) {
  validateScope(scope);
  const root = scope === 'global' ? resolve(homeDir) : resolve(projectRoot);
  return join(root, '.agents');
}

export function resolveSkillLockPath(options = {}) {
  return join(resolveSkillStateRoot(options), 'skills.lock.json');
}

export function resolveSkillBackupRoot(options = {}) {
  return join(resolveSkillStateRoot(options), '.sdm-backups');
}
