import { resolve } from 'node:path';

import { SkillLifecycleManager } from './skill-lifecycle-manager.js';

function value(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function has(args, name) {
  return args.includes(name);
}

export const SKILL_CLI_HELP = `sdm-skills <command> [options]

Commands:
  sync       Reconcile managed skill projections and write skills.lock.json
  status     Report drift between the lock, sources, and installed targets
  rollback   Restore the previous transactional skill projection

Options:
  --target <agents|codex|opencode|cline|claude|all>
  --scope <project|global>
  --mode <auto|symlink|copy>
  --project-root <path>
  --force
  --dry-run
  --transaction <id>   rollback a specific transaction
`;

export function runSkillCli({
  argv,
  repoRoot,
  legacyInstall = false,
} = {}) {
  if (!repoRoot) throw new Error('repoRoot is required');
  const args = [...(argv ?? [])];
  const command = legacyInstall ? 'sync' : (args.shift() ?? 'help');

  if (command === 'help' || command === '--help' || command === '-h') {
    return { help: SKILL_CLI_HELP };
  }

  const scope = value(args, '--scope', 'project');
  const projectRoot = resolve(value(args, '--project-root', process.cwd()));
  const manager = new SkillLifecycleManager({ repoRoot, projectRoot });

  if (command === 'sync') {
    const targetName = value(args, '--target', 'agents');
    const mode = value(args, '--mode', 'auto');
    const force = has(args, '--force');
    const dryRun = has(args, '--dry-run');
    const result = manager.sync({
      targetName,
      scope,
      mode,
      force,
      dryRun,
      conflictPolicy: legacyInstall ? 'skip' : 'fail',
      trackState: !legacyInstall,
    });

    if (legacyInstall) {
      return {
        source: repoRoot,
        scope,
        mode,
        dryRun,
        results: result.results,
      };
    }
    return result;
  }

  if (command === 'status') {
    return manager.status({ scope });
  }

  if (command === 'rollback') {
    return manager.rollback({
      scope,
      transactionId: value(args, '--transaction', null),
      dryRun: has(args, '--dry-run'),
    });
  }

  throw new Error(`unknown sdm-skills command: ${command}`);
}
