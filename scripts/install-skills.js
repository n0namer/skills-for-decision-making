#!/usr/bin/env node
// Install one source-of-truth skill set into compatible agent directories.
// Default mode tries per-skill symlinks and falls back to copies.

import {
  cpSync, existsSync, lstatSync, mkdirSync, readlinkSync, rmSync, symlinkSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

import { discoverSkills } from '../lib/skill-registry.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const args = process.argv.slice(2);

function value(name, fallback = undefined) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}
function has(name) { return args.includes(name); }

const targetName = value('--target', 'agents');
const scope = value('--scope', 'project');
const mode = value('--mode', 'auto');
const force = has('--force');
const dryRun = has('--dry-run');
const projectRoot = resolve(value('--project-root', process.cwd()));

const PROJECT_TARGETS = {
  agents: join(projectRoot, '.agents', 'skills'),
  codex: join(projectRoot, '.agents', 'skills'),
  opencode: join(projectRoot, '.opencode', 'skills'),
  cline: join(projectRoot, '.cline', 'skills'),
  claude: join(projectRoot, '.claude', 'skills'),
};
const GLOBAL_TARGETS = {
  agents: join(homedir(), '.agents', 'skills'),
  codex: join(homedir(), '.agents', 'skills'),
  opencode: join(homedir(), '.config', 'opencode', 'skills'),
  cline: join(homedir(), '.cline', 'skills'),
  claude: join(homedir(), '.claude', 'skills'),
};

const profiles = targetName === 'all'
  ? ['agents', 'opencode', 'cline', 'claude']
  : [targetName];
for (const profile of profiles) {
  if (!(profile in PROJECT_TARGETS)) throw new Error(`unknown target: ${profile}`);
}
if (!['project', 'global'].includes(scope)) throw new Error('scope must be project or global');
if (!['auto', 'symlink', 'copy'].includes(mode)) throw new Error('mode must be auto, symlink or copy');

const skillSources = discoverSkills({ roots: [repoRoot], maxDepth: 2 })
  .filter((skill) => !skill.path.includes(`${join('.agents', 'skills')}`));

function sameLink(target, source) {
  try {
    if (!lstatSync(target).isSymbolicLink()) return false;
    return resolve(dirname(target), readlinkSync(target)) === resolve(source);
  } catch { return false; }
}

function installOne(sourceDir, targetDir) {
  if (existsSync(targetDir)) {
    if (sameLink(targetDir, sourceDir)) return 'unchanged';
    if (!force) return 'exists';
    if (!dryRun) rmSync(targetDir, { recursive: true, force: true });
  }
  if (dryRun) return mode === 'copy' ? 'copy' : 'symlink';
  mkdirSync(dirname(targetDir), { recursive: true });

  if (mode !== 'copy') {
    try {
      const rel = relative(dirname(targetDir), sourceDir) || '.';
      symlinkSync(rel, targetDir, process.platform === 'win32' ? 'junction' : 'dir');
      return 'symlink';
    } catch (error) {
      if (mode === 'symlink') throw error;
    }
  }

  cpSync(sourceDir, targetDir, { recursive: true });
  return 'copy';
}

const results = [];
for (const profile of profiles) {
  const base = (scope === 'global' ? GLOBAL_TARGETS : PROJECT_TARGETS)[profile];
  for (const skill of skillSources) {
    const sourceDir = dirname(skill.path);
    const targetDir = join(base, skill.name);
    results.push({ profile, skill: skill.name, target: targetDir, action: installOne(sourceDir, targetDir) });
  }
}

console.log(JSON.stringify({ source: repoRoot, scope, mode, dryRun, results }, null, 2));
