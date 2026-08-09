#!/usr/bin/env node
// Skill/project/resource orchestration CLI.
//
//   sdm-orchestrate registry
//   sdm-orchestrate context [--context .agents/context]
//   sdm-orchestrate route --text "where should I spend 20 hours?"
//   sdm-orchestrate plan --text "..." [--signals signals.json] [--decision decision.json]
//   sdm-orchestrate record --record decision-record.json [--context .agents/context]

import { readFileSync } from 'node:fs';

import { discoverSkills } from '../lib/skill-registry.js';
import { defaultContextDir, loadContextRegistry } from '../lib/context-registry.js';
import { appendDecisionRecord } from '../lib/decision-log.js';
import { orchestrate } from '../lib/orchestrator.js';
import { inferSignals, routeSkills } from '../lib/skill-router.js';

const args = process.argv.slice(2);
const command = args[0];

function usage(code = 0) {
  const out = code ? process.stderr : process.stdout;
  out.write(`Usage:\n` +
    `  sdm-orchestrate registry\n` +
    `  sdm-orchestrate context [--context DIR]\n` +
    `  sdm-orchestrate route --text "REQUEST" [--signals FILE]\n` +
    `  sdm-orchestrate plan --text "REQUEST" [--signals FILE] [--decision FILE] [--context DIR]\n` +
    `  sdm-orchestrate record --record FILE [--context DIR]\n`);
  process.exit(code);
}

function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function readJson(path) {
  if (!path) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { throw new Error(`could not read ${path}: ${error.message}`); }
}

if (!command || ['help', '--help', '-h'].includes(command)) usage(0);

try {
  if (command === 'registry') {
    console.log(JSON.stringify({ skills: discoverSkills() }, null, 2));
  } else if (command === 'context') {
    console.log(JSON.stringify(loadContextRegistry(flag('--context')), null, 2));
  } else if (command === 'route') {
    const request = flag('--text') ?? '';
    const signals = readJson(flag('--signals')) ?? inferSignals(request);
    const registry = discoverSkills();
    console.log(JSON.stringify({ request, signals, routing: routeSkills(signals, registry) }, null, 2));
  } else if (command === 'plan') {
    const request = flag('--text') ?? '';
    const signals = readJson(flag('--signals'));
    const decisionSpec = readJson(flag('--decision'));
    console.log(JSON.stringify(orchestrate({
      request,
      signals,
      decisionSpec,
      contextDir: flag('--context'),
    }), null, 2));
  } else if (command === 'record') {
    const record = readJson(flag('--record'));
    if (!record) throw new Error('--record FILE is required');
    console.log(JSON.stringify(appendDecisionRecord(
      flag('--context') ?? defaultContextDir(),
      record,
    ), null, 2));
  } else {
    throw new Error(`unknown command "${command}"`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
