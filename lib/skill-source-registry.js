import { dirname, join, resolve } from 'node:path';

import { discoverSkills } from './skill-registry.js';

export function discoverRepositorySkills({
  repoRoot,
  discover = discoverSkills,
}) {
  const root = resolve(repoRoot);
  return discover({ roots: [root], maxDepth: 2 })
    .filter((skill) => !skill.path.includes(`${join('.agents', 'skills')}`))
    .map((skill) => ({
      ...skill,
      sourceDir: dirname(skill.path),
    }));
}
