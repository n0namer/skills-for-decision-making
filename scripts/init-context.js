#!/usr/bin/env node
// Initialize private runtime context from committed examples without overwriting existing files.

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const sourceDir = join(repoRoot, '.agents', 'context');
const targetDir = resolve(process.argv[2] ?? join(process.cwd(), '.agents', 'context'));

mkdirSync(targetDir, { recursive: true });

const files = [
  ['projects.example.json', 'projects.json'],
  ['resources.example.json', 'resources.json'],
  ['preferences.example.json', 'preferences.json'],
  ['decisions.example.jsonl', 'decisions.jsonl'],
];

const created = [];
const skipped = [];
for (const [sourceName, targetName] of files) {
  const source = join(sourceDir, sourceName);
  const target = join(targetDir, targetName);
  if (existsSync(target)) {
    skipped.push(targetName);
    continue;
  }
  copyFileSync(source, target);
  created.push(targetName);
}

console.log(JSON.stringify({ targetDir, created, skipped }, null, 2));
