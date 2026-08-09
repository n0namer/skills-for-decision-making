#!/usr/bin/env node
// DecisionSpec CLI for the extended decision engine.
//
//   node scripts/decision.js plan <decision.json>
//   node scripts/decision.js mcda <decision.json>

import { readFileSync } from 'node:fs';

import { assertDecisionSpec } from '../lib/decision-spec.js';
import { explainMethodSelection, selectDecisionMethods } from '../lib/method-router.js';
import { runMcda } from '../lib/adapters/mcda.js';

function usage(code = 0) {
  const stream = code === 0 ? process.stdout : process.stderr;
  stream.write(`Usage:\n  sdm-decision plan <decision.json>\n  sdm-decision mcda <decision.json>\n`);
  process.exit(code);
}

function loadSpec(path) {
  if (!path) usage(2);
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(`could not read ${path}: ${error.message}`);
  }

  let spec;
  try {
    spec = JSON.parse(text);
  } catch (error) {
    throw new Error(`could not parse ${path}: ${error.message}`);
  }
  return assertDecisionSpec(spec);
}

const [command, file] = process.argv.slice(2);
if (!command || command === 'help' || command === '--help' || command === '-h') usage(0);

try {
  const spec = loadSpec(file);

  if (command === 'plan') {
    console.log(JSON.stringify({
      decision: spec.decision,
      methods: selectDecisionMethods(spec),
      rationale: explainMethodSelection(spec),
    }, null, 2));
  } else if (command === 'mcda') {
    const methods = selectDecisionMethods(spec);
    if (!methods.includes('mcda')) {
      throw new Error(
        `MCDA is not allowed for this DecisionSpec. Selected route: ${methods.join(', ')}. ` +
        'Provide scores for at least two criteria and explicit weights for every criterion.',
      );
    }
    console.log(JSON.stringify(runMcda(spec), null, 2));
  } else {
    throw new Error(`unknown command "${command}"`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
