import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { inferSignals, routeSkills } from '../lib/skill-router.js';
import { planPipeline } from '../lib/pipeline-planner.js';

const here = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(join(here, '..', 'evals', 'routing-cases.json'), 'utf8'));

for (const item of cases) {
  test(`routing eval: ${item.id}`, () => {
    const signals = inferSignals(item.request);
    const routed = routeSkills(signals, []);
    const pipeline = planPipeline({ routedSkills: routed });
    assert.deepEqual(pipeline.skills, item.expected);
  });
}
