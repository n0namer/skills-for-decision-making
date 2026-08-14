import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

function sourceKey(source) {
  return createHash('sha256')
    .update(source.repository)
    .update('\0')
    .update(source.ref || 'HEAD')
    .digest('hex')
    .slice(0, 20);
}

export class GitSkillStore {
  constructor({
    cacheRoot = join(homedir(), '.cache', 'sdm', 'skill-sources'),
    gitBinary = 'git',
  } = {}) {
    this.cacheRoot = resolve(cacheRoot);
    this.gitBinary = gitBinary;
  }

  git(args, options = {}) {
    return execFileSync(this.gitBinary, args, {
      cwd: options.cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  }

  materialize(source) {
    if (!source?.repository || typeof source.repository !== 'string') {
      throw new Error('git skill source requires repository');
    }

    mkdirSync(this.cacheRoot, { recursive: true });
    const key = sourceKey(source);
    const repositoriesRoot = join(this.cacheRoot, 'repositories');
    const repoDir = join(repositoriesRoot, key);
    mkdirSync(repositoriesRoot, { recursive: true });

    if (!existsSync(repoDir)) {
      const temp = `${repoDir}.tmp-${randomUUID()}`;
      try {
        this.git(['clone', '--no-checkout', '--', source.repository, temp]);
        this.git(['-C', temp, 'config', 'core.autocrlf', 'false']);
        this.git(['-C', temp, 'rev-parse', '--git-dir']);
        renameSync(temp, repoDir);
      } catch (error) {
        rmSync(temp, { recursive: true, force: true });
        throw error;
      }
    } else if (!existsSync(join(repoDir, '.git'))) {
      throw new Error(`git skill cache is not a repository: ${repoDir}`);
    }

    this.git(['-C', repoDir, 'remote', 'set-url', 'origin', source.repository]);
    this.git(['-C', repoDir, 'config', 'core.autocrlf', 'false']);
    this.git(['-C', repoDir, 'fetch', '--tags', '--prune', 'origin']);

    const requested = source.ref || 'HEAD';
    const candidates = requested === 'HEAD'
      ? ['origin/HEAD', 'HEAD']
      : [`origin/${requested}`, requested];
    let revision = null;
    let lastError = null;

    for (const candidate of candidates) {
      try {
        revision = this.git(['-C', repoDir, 'rev-parse', `${candidate}^{commit}`]);
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!revision) {
      throw lastError ?? new Error(`unable to resolve git ref: ${requested}`);
    }

    const checkoutRoot = join(this.cacheRoot, 'checkouts', key);
    const checkoutDir = join(checkoutRoot, revision);
    mkdirSync(checkoutRoot, { recursive: true });

    if (existsSync(checkoutDir)) {
      let actual = null;
      try {
        actual = this.git(['-C', checkoutDir, 'rev-parse', 'HEAD']);
      } catch {
        // Invalid partial cache below is removed and recreated.
      }
      if (actual !== revision) {
        rmSync(checkoutDir, { recursive: true, force: true });
        this.git(['-C', repoDir, 'worktree', 'prune']);
      }
    }

    if (!existsSync(checkoutDir)) {
      try {
        this.git([
          '-C', repoDir,
          'worktree', 'add', '--detach', '--force', checkoutDir, revision,
        ]);
      } catch (error) {
        rmSync(checkoutDir, { recursive: true, force: true });
        try { this.git(['-C', repoDir, 'worktree', 'prune']); } catch { /* best effort */ }
        throw error;
      }
    }

    return {
      root: checkoutDir,
      revision,
      repository: source.repository,
      ref: requested,
    };
  }
}
