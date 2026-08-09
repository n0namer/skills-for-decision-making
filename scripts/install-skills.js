#!/usr/bin/env node
// Install one source-of-truth skill set into compatible agent directories.
// Default mode tries per-skill symlinks and falls back to copies.

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { installSkill, validateInstallMode } from '../lib/skill-installer.js';
import { discoverRepositorySkills } from '../lib/skill-source-registry.js';
import { expandTargetProfiles, resolveTargetBase } from '../lib/skill-targets.js';

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

const profiles = expandTargetProfiles(targetName);
validateInstallMode(mode);

const skillSources = discoverRepositorySkills({ repoRoot });
const results = [];

for (const profile of profiles) {
  const base = resolveTargetBase({ target: profile, scope, projectRoot });
  for (const skill of skillSources) {
    const targetDir = join(base, skill.name);
    results.push({
      profile,
      skill: skill.name,
      target: targetDir,
      action: installSkill({
        sourceDir: skill.sourceDir,
        targetDir,
        mode,
        force,
        dryRun,
      }),
    });
  }
}

console.log(JSON.stringify({ source: repoRoot, scope, mode, dryRun, results }, null, 2));
