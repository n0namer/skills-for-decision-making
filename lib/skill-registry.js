// Discover Agent Skills from SKILL.md files without loading their full bodies into the LLM.
// Registry metadata is deliberately small: name, description, path, capabilities.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const DEFAULT_IGNORES = new Set([
  '.git', 'node_modules', 'engine', 'lib', 'scripts', 'test', 'evals', 'docs', 'examples',
]);

function unquote(value) {
  const s = String(value ?? '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

export function parseSkillFrontmatter(text) {
  if (!text.startsWith('---')) return {};
  const lines = text.split(/\r?\n/);
  const end = lines.indexOf('---', 1);
  if (end < 0) return {};

  const data = {};
  let section = null;
  for (const raw of lines.slice(1, end)) {
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;
    const match = raw.trim().match(/^([A-Za-z0-9_/-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;

    if (indent === 0) {
      section = value ? null : key;
      if (value) data[key] = unquote(value);
      else if (key === 'metadata') data.metadata = {};
    } else if (section === 'metadata') {
      data.metadata ??= {};
      data.metadata[key] = unquote(value);
    }
  }
  return data;
}

function capabilitiesFrom(frontmatter) {
  const raw = frontmatter.metadata?.capabilities ?? frontmatter.metadata?.capability ?? '';
  return String(raw)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function walk(root, { maxDepth = 4, ignores = DEFAULT_IGNORES } = {}, depth = 0, out = []) {
  if (!existsSync(root) || depth > maxDepth) return out;
  for (const entry of readdirSync(root)) {
    if (ignores.has(entry)) continue;
    const path = join(root, entry);
    let stat;
    try { stat = statSync(path); } catch { continue; }
    if (stat.isDirectory()) {
      walk(path, { maxDepth, ignores }, depth + 1, out);
    } else if (entry === 'SKILL.md') {
      out.push(path);
    }
  }
  return out;
}

export function defaultSkillRoots(cwd = process.cwd()) {
  return [
    cwd,
    join(cwd, '.agents', 'skills'),
    join(cwd, '.opencode', 'skills'),
    join(cwd, '.claude', 'skills'),
    join(cwd, '.cline', 'skills'),
  ];
}

export function discoverSkills({ roots = defaultSkillRoots(), maxDepth = 4 } = {}) {
  const registry = new Map();

  for (const rawRoot of roots) {
    const root = resolve(rawRoot);
    if (!existsSync(root)) continue;
    for (const skillFile of walk(root, { maxDepth })) {
      let text;
      try { text = readFileSync(skillFile, 'utf8'); } catch { continue; }
      const fm = parseSkillFrontmatter(text);
      const name = fm.name || basename(dirname(skillFile));
      if (!name || !fm.description) continue;
      registry.set(name, {
        name,
        description: fm.description,
        compatibility: fm.compatibility || null,
        license: fm.license || null,
        capabilities: capabilitiesFrom(fm),
        path: skillFile,
        root,
      });
    }
  }

  return [...registry.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function indexSkills(skills) {
  return Object.fromEntries(skills.map((skill) => [skill.name, skill]));
}
