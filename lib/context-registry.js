// File-backed source of truth for projects, resources, preferences and past decisions.
// No database dependency: suitable for .agents/context in a local workspace.

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

export function loadContextRegistry(contextDir = defaultContextDir()) {
  const dir = resolve(contextDir);
  const projectsDoc = readJson(join(dir, 'projects.json'), { projects: [] });
  const resourcesDoc = readJson(join(dir, 'resources.json'), { resources: {} });
  const preferences = readJson(join(dir, 'preferences.json'), {});
  const decisions = readJsonl(join(dir, 'decisions.jsonl'));

  const projects = Array.isArray(projectsDoc) ? projectsDoc : (projectsDoc.projects ?? []);
  const resources = resourcesDoc.resources ?? resourcesDoc;

  return {
    contextDir: dir,
    projects,
    resources,
    preferences,
    decisions,
  };
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
  };
}
