import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

import { discoverSkills } from './skill-registry.js';

export const SKILL_SOURCES_SCHEMA_VERSION = 1;

export function defaultSourceManifest() {
  return {
    schemaVersion: SKILL_SOURCES_SCHEMA_VERSION,
    sources: [
      {
        id: 'repository',
        type: 'local',
        path: '.',
        maxDepth: 2,
      },
    ],
  };
}

export function validateSourceManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== SKILL_SOURCES_SCHEMA_VERSION) {
    throw new Error(`skills.sources.json schemaVersion must be ${SKILL_SOURCES_SCHEMA_VERSION}`);
  }
  if (!Array.isArray(manifest.sources) || manifest.sources.length === 0) {
    throw new Error('skills.sources.json must contain at least one source');
  }

  const ids = new Set();
  for (const source of manifest.sources) {
    if (!source?.id || typeof source.id !== 'string') {
      throw new Error('skill source id must be a non-empty string');
    }
    if (ids.has(source.id)) throw new Error(`duplicate skill source id: ${source.id}`);
    ids.add(source.id);

    if (source.type !== 'local') {
      throw new Error(`unsupported skill source type: ${source.type}`);
    }
    if (typeof source.path !== 'string' || !source.path) {
      throw new Error(`skill source ${source.id} requires path`);
    }
    if (
      source.maxDepth !== undefined
      && (!Number.isInteger(source.maxDepth) || source.maxDepth < 0)
    ) {
      throw new Error(`skill source ${source.id} maxDepth must be a non-negative integer`);
    }
  }
  return manifest;
}

export function loadSourceManifest({
  repoRoot,
  manifestPath = join(repoRoot, 'skills.sources.json'),
} = {}) {
  if (!existsSync(manifestPath)) return defaultSourceManifest();

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`invalid skills.sources.json: ${error.message}`);
  }
  return validateSourceManifest(parsed);
}

export function discoverRepositorySkills({
  repoRoot,
  manifest = loadSourceManifest({ repoRoot }),
  discover = discoverSkills,
}) {
  validateSourceManifest(manifest);
  const root = resolve(repoRoot);
  const registry = new Map();

  for (const source of manifest.sources) {
    const sourceRoot = isAbsolute(source.path)
      ? resolve(source.path)
      : resolve(root, source.path);
    const found = discover({
      roots: [sourceRoot],
      maxDepth: source.maxDepth ?? 2,
    }).filter((skill) => !skill.path.includes(`${join('.agents', 'skills')}`));

    for (const skill of found) {
      if (registry.has(skill.name)) {
        throw new Error(`duplicate skill name across sources: ${skill.name}`);
      }
      registry.set(skill.name, {
        ...skill,
        sourceId: source.id,
        sourceType: source.type,
        sourceRoot,
        sourceDir: dirname(skill.path),
      });
    }
  }

  return [...registry.values()].sort((a, b) => a.name.localeCompare(b.name));
}
