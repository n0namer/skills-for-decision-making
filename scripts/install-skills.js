#!/usr/bin/env node
// Backward-compatible wrapper around the unified skill lifecycle implementation.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runSkillCli } from '../lib/skill-cli.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const result = runSkillCli({
  argv: process.argv.slice(2),
  repoRoot,
  legacyInstall: true,
});

console.log(JSON.stringify(result, null, 2));
