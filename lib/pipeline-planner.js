// Compose routed skills and numerical methods into a minimal ordered pipeline.

const SKILL_ORDER = [
  'framing-decisions',
  'valuing-information',
  'allocating-effort',
  'planning-horizons',
  'tracking-beliefs',
  'reading-rivals',
  'stress-testing-plans',
  'learning-from-outcomes',
];

const METHOD_ORDER = [
  'expected-utility',
  'value-of-information',
  'mcda',
  'pareto',
  'sensitivity',
];

const SKILL_REQUIRES = {
  'valuing-information': ['framing-decisions'],
  'allocating-effort': ['framing-decisions'],
};

function unique(items) {
  return [...new Set(items)];
}

function expandDependencies(skills) {
  const result = new Set(skills);
  let changed = true;
  while (changed) {
    changed = false;
    for (const skill of [...result]) {
      for (const dep of SKILL_REQUIRES[skill] ?? []) {
        if (!result.has(dep)) {
          result.add(dep);
          changed = true;
        }
      }
    }
  }
  return [...result];
}

export function planPipeline({ routedSkills = [], methods = [] } = {}) {
  const reasonBySkill = new Map(routedSkills.map((item) => [item.skill, item.reason]));
  const skills = expandDependencies(routedSkills.map((item) => item.skill));
  const orderedSkills = unique(skills).sort((a, b) => {
    const ai = SKILL_ORDER.indexOf(a), bi = SKILL_ORDER.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
  const orderedMethods = unique(methods).sort((a, b) => {
    const ai = METHOD_ORDER.indexOf(a), bi = METHOD_ORDER.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });

  const steps = [];
  for (const skill of orderedSkills) {
    steps.push({
      kind: 'skill',
      id: skill,
      reason: reasonBySkill.get(skill) ?? `required dependency for a downstream skill`,
    });
  }
  for (const method of orderedMethods) {
    steps.push({
      kind: 'method',
      id: method,
      reason: `selected deterministically from the DecisionSpec structure`,
    });
  }

  return {
    steps,
    skills: orderedSkills,
    methods: orderedMethods,
  };
}
