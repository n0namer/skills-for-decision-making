// Context source of truth for projects, resources, preferences and past decisions.
// Supports both file-backed .agents/context and normalized host-agent tool data.

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`could not parse ${path}: ${error.message}`);
  }
}

function readJsonl(path) {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter((line) => line.trim());
  return lines.map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`could not parse ${path}:${index + 1}: ${error.message}`); }
  });
}

export function defaultContextDir(cwd = process.cwd()) {
  return join(cwd, '.agents', 'context');
}

export function normalizeContextRegistry(input = {}, { contextDir = null } = {}) {
  const projectsDoc = input.projects ?? [];
  const resourcesDoc = input.resources ?? {};
  const decisions = Array.isArray(input.decisions)
    ? input.decisions
    : Array.isArray(input.recentDecisions)
      ? input.recentDecisions
      : [];

  return {
    contextDir: input.contextDir ?? contextDir,
    projects: Array.isArray(projectsDoc) ? projectsDoc : (projectsDoc.projects ?? []),
    resources: resourcesDoc.resources ?? resourcesDoc,
    preferences: input.preferences ?? {},
    decisions,
    provenance: input.provenance ?? null,
  };
}

export function loadContextRegistry(contextDir = defaultContextDir()) {
  const dir = resolve(contextDir);
  return normalizeContextRegistry({
    projects: readJson(join(dir, 'projects.json'), { projects: [] }),
    resources: readJson(join(dir, 'resources.json'), { resources: {} }),
    preferences: readJson(join(dir, 'preferences.json'), {}),
    decisions: readJsonl(join(dir, 'decisions.jsonl')),
  }, { contextDir: dir });
}

export function activeProjects(context) {
  return (context.projects ?? []).filter((project) =>
    !['done', 'stopped', 'archived'].includes(String(project.status ?? 'active').toLowerCase()));
}

export function selectRelevantContext(context, signals = {}) {
  const requestedIds = new Set(signals.projectIds ?? []);
  const portfolioMode = Boolean(signals.resourceAllocation || signals.portfolioDecision);
  const projects = requestedIds.size
    ? (context.projects ?? []).filter((p) => requestedIds.has(p.id) || requestedIds.has(p.name))
    : portfolioMode
      ? activeProjects(context)
      : [];

  const includeResources = Boolean(
    signals.resourceAllocation || signals.portfolioDecision || signals.decisionChoice,
  );

  return {
    projects,
    resources: includeResources ? context.resources : {},
    preferences: context.preferences ?? {},
    recentDecisions: (context.decisions ?? []).slice(-20),
    provenance: context.provenance ?? null,
  };
}
