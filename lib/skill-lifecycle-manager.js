import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { discoverRepositorySkills, loadSourceManifest } from './skill-source-registry.js';
import { fingerprintSkillDirectory } from './skill-fingerprint.js';
import {
  inspectInstall,
  installSkill,
  restoreInstall,
  snapshotInstall,
  validateInstallMode,
} from './skill-installer.js';
import {
  emptySkillLock,
  readSkillLock,
  writeJsonAtomic,
  writeSkillLock,
} from './skill-lock.js';
import {
  expandTargetProfiles,
  resolveSkillBackupRoot,
  resolveSkillLockPath,
  resolveTargetBase,
  validateScope,
} from './skill-targets.js';

function safeName(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, '_');
}

function nowIso(clock) {
  return clock().toISOString();
}

function installationKey({ scope, profile, skill }) {
  return `${scope}:${profile}:${skill}`;
}

function fingerprintOrNull(path) {
  if (!path || !existsSync(path)) return null;
  try {
    return fingerprintSkillDirectory(path);
  } catch {
    return null;
  }
}

export class SkillLifecycleManager {
  constructor({
    repoRoot,
    projectRoot = process.cwd(),
    homeDir,
    clock = () => new Date(),
    idFactory = () => randomUUID(),
  } = {}) {
    if (!repoRoot) throw new Error('repoRoot is required');
    this.repoRoot = repoRoot;
    this.projectRoot = projectRoot;
    this.homeDir = homeDir;
    this.clock = clock;
    this.idFactory = idFactory;
  }

  paths(scope) {
    const options = {
      scope,
      projectRoot: this.projectRoot,
      homeDir: this.homeDir,
    };
    return {
      lockPath: resolveSkillLockPath(options),
      backupRoot: resolveSkillBackupRoot(options),
    };
  }

  plan({
    targetName = 'agents',
    scope = 'project',
    mode = 'auto',
    force = false,
    conflictPolicy = 'fail',
    lock = emptySkillLock(),
  } = {}) {
    validateScope(scope);
    validateInstallMode(mode);
    if (!['fail', 'skip'].includes(conflictPolicy)) {
      throw new Error('conflictPolicy must be fail or skip');
    }

    const manifest = loadSourceManifest({ repoRoot: this.repoRoot });
    const skills = discoverRepositorySkills({ repoRoot: this.repoRoot, manifest });
    const profiles = expandTargetProfiles(targetName);
    const priorByKey = new Map(
      lock.installations.map((item) => [installationKey(item), item]),
    );
    const entries = [];

    for (const profile of profiles) {
      const base = resolveTargetBase({
        target: profile,
        scope,
        projectRoot: this.projectRoot,
        homeDir: this.homeDir,
      });

      for (const skill of skills) {
        const targetDir = join(base, skill.name);
        const key = installationKey({ scope, profile, skill: skill.name });
        const prior = priorByKey.get(key) ?? null;
        const sourceFingerprint = fingerprintSkillDirectory(skill.sourceDir);
        const installState = inspectInstall({ targetDir, sourceDir: skill.sourceDir });
        let state = installState;
        let willChange = installState === 'missing';
        let managedUpdate = false;

        if (installState === 'unchanged') {
          state = prior && prior.sourceFingerprint !== sourceFingerprint
            ? 'source-changed-live'
            : 'current';
          willChange = false;
        } else if (installState === 'exists') {
          const actualFingerprint = fingerprintOrNull(targetDir);
          const isManaged = Boolean(
            prior
            && prior.target === targetDir
            && actualFingerprint
            && actualFingerprint === prior.installedFingerprint,
          );

          if (isManaged) {
            const sourceChanged = prior.sourceFingerprint !== sourceFingerprint;
            const requestedModeChanged = mode !== 'auto' && prior.mode !== mode;
            state = sourceChanged
              ? 'managed-source-changed'
              : requestedModeChanged
                ? 'managed-mode-changed'
                : 'managed-current';
            willChange = force || sourceChanged || requestedModeChanged;
            managedUpdate = willChange;
          } else if (force) {
            state = prior ? 'managed-drift-force' : 'unmanaged-force';
            willChange = true;
          } else if (conflictPolicy === 'fail') {
            const kind = prior ? 'managed target drift' : 'unmanaged skill target';
            throw new Error(`refusing to overwrite ${kind}: ${targetDir}`);
          } else {
            state = prior ? 'managed-drift-skip' : 'unmanaged-skip';
            willChange = false;
          }
        }

        entries.push({
          profile,
          scope,
          skill,
          targetDir,
          prior,
          sourceFingerprint,
          state,
          willChange,
          managedUpdate,
        });
      }
    }

    return { manifest, mode, force, conflictPolicy, entries };
  }

  sync({
    targetName = 'agents',
    scope = 'project',
    mode = 'auto',
    force = false,
    dryRun = false,
    conflictPolicy = 'fail',
    trackState = true,
  } = {}) {
    validateScope(scope);
    const { lockPath, backupRoot } = this.paths(scope);
    const previousLock = trackState ? readSkillLock(lockPath) : emptySkillLock();
    const plan = this.plan({
      targetName,
      scope,
      mode,
      force,
      conflictPolicy,
      lock: previousLock,
    });

    const changed = plan.entries.filter((entry) => entry.willChange);
    const transactionId = trackState && changed.length ? this.idFactory() : null;
    const transactionRoot = transactionId ? join(backupRoot, transactionId) : null;
    const snapshots = [];

    if (trackState && !dryRun && transactionId) {
      mkdirSync(transactionRoot, { recursive: true });
      writeJsonAtomic(join(transactionRoot, 'previous-lock.json'), previousLock);

      for (const entry of changed) {
        const snapshotDir = join(
          transactionRoot,
          'targets',
          safeName(`${entry.profile}-${entry.skill.name}`),
        );
        snapshotInstall({ targetDir: entry.targetDir, snapshotDir });
        snapshots.push({ targetDir: entry.targetDir, snapshotDir });
      }

      writeJsonAtomic(join(transactionRoot, 'transaction.json'), {
        schemaVersion: 1,
        id: transactionId,
        createdAt: nowIso(this.clock),
        scope,
        targets: snapshots,
      });
    }

    const results = [];
    try {
      for (const entry of plan.entries) {
        if (!entry.willChange) {
          const action = entry.state === 'unmanaged-skip' || entry.state === 'managed-drift-skip'
            ? 'exists'
            : 'unchanged';
          results.push({
            profile: entry.profile,
            skill: entry.skill.name,
            target: entry.targetDir,
            action,
          });
          continue;
        }

        const action = installSkill({
          sourceDir: entry.skill.sourceDir,
          targetDir: entry.targetDir,
          mode,
          force: force || entry.managedUpdate,
          dryRun,
        });
        results.push({
          profile: entry.profile,
          skill: entry.skill.name,
          target: entry.targetDir,
          action,
        });
      }
    } catch (error) {
      if (trackState && !dryRun && transactionId) {
        for (const snapshot of [...snapshots].reverse()) restoreInstall(snapshot);
        writeSkillLock(lockPath, previousLock);
      }
      throw error;
    }

    if (dryRun || !trackState) {
      return {
        schemaVersion: 1,
        transactionId: null,
        scope,
        mode,
        dryRun,
        results,
        lockPath: null,
      };
    }

    const priorByKey = new Map(
      previousLock.installations.map((item) => [installationKey(item), item]),
    );
    const installations = [];

    for (const entry of plan.entries) {
      const result = results.find(
        (item) => item.profile === entry.profile && item.skill === entry.skill.name,
      );
      const key = installationKey({
        scope,
        profile: entry.profile,
        skill: entry.skill.name,
      });

      if (result.action === 'exists') {
        const prior = priorByKey.get(key);
        if (prior) installations.push(prior);
        continue;
      }

      const actualFingerprint = fingerprintOrNull(entry.targetDir) ?? entry.sourceFingerprint;
      const installedMode = result.action === 'copy'
        ? 'copy'
        : result.action === 'symlink'
          ? 'symlink'
          : entry.prior?.mode ?? (inspectInstall({
              targetDir: entry.targetDir,
              sourceDir: entry.skill.sourceDir,
            }) === 'unchanged' ? 'symlink' : mode);

      installations.push({
        scope,
        profile: entry.profile,
        skill: entry.skill.name,
        target: entry.targetDir,
        source: {
          id: entry.skill.sourceId,
          type: entry.skill.sourceType,
          root: entry.skill.sourceRoot,
          path: entry.skill.sourceDir,
        },
        mode: installedMode,
        sourceFingerprint: entry.sourceFingerprint,
        installedFingerprint: actualFingerprint,
        installedAt: entry.prior?.installedAt ?? nowIso(this.clock),
        syncedAt: nowIso(this.clock),
      });
    }

    const touched = new Set(
      plan.entries.map((entry) => installationKey({
        scope,
        profile: entry.profile,
        skill: entry.skill.name,
      })),
    );
    for (const prior of previousLock.installations) {
      if (!touched.has(installationKey(prior))) installations.push(prior);
    }

    const history = transactionId
      ? [...previousLock.history, {
          id: transactionId,
          createdAt: nowIso(this.clock),
          scope,
          backupRoot: transactionRoot,
        }].slice(-20)
      : previousLock.history;

    const nextLock = {
      schemaVersion: 1,
      updatedAt: nowIso(this.clock),
      installations,
      history,
    };
    writeSkillLock(lockPath, nextLock);

    return {
      schemaVersion: 1,
      transactionId,
      scope,
      mode,
      dryRun: false,
      results,
      lockPath,
    };
  }

  status({ scope = 'project' } = {}) {
    validateScope(scope);
    const { lockPath } = this.paths(scope);
    const lock = readSkillLock(lockPath);
    const items = lock.installations.map((item) => {
      if (!existsSync(item.target)) return { ...item, state: 'missing' };

      const actual = fingerprintOrNull(item.target);
      if (!actual) return { ...item, state: 'unreadable' };

      const currentSource = fingerprintOrNull(item.source?.path);
      if (
        item.mode === 'symlink'
        && currentSource
        && currentSource !== item.sourceFingerprint
        && actual === currentSource
      ) {
        return {
          ...item,
          state: 'source-changed-live',
          sourceFingerprintNow: currentSource,
        };
      }

      if (actual !== item.installedFingerprint) {
        return { ...item, state: 'drifted', actualFingerprint: actual };
      }

      if (currentSource && currentSource !== item.sourceFingerprint) {
        return {
          ...item,
          state: 'source-changed',
          sourceFingerprintNow: currentSource,
        };
      }

      return { ...item, state: 'current' };
    });

    return { schemaVersion: 1, scope, lockPath, items };
  }

  rollback({ scope = 'project', transactionId = null, dryRun = false } = {}) {
    validateScope(scope);
    const { lockPath } = this.paths(scope);
    const lock = readSkillLock(lockPath);
    const transaction = transactionId
      ? lock.history.find((item) => item.id === transactionId)
      : lock.history.at(-1);
    if (!transaction) throw new Error('no rollback transaction available');

    const transactionRoot = transaction.backupRoot;
    const metadata = JSON.parse(
      readFileSync(join(transactionRoot, 'transaction.json'), 'utf8'),
    );
    const previousLock = JSON.parse(
      readFileSync(join(transactionRoot, 'previous-lock.json'), 'utf8'),
    );

    if (dryRun) {
      return {
        schemaVersion: 1,
        transactionId: transaction.id,
        dryRun: true,
        targets: metadata.targets.map((item) => item.targetDir),
      };
    }

    for (const snapshot of [...metadata.targets].reverse()) restoreInstall(snapshot);
    writeSkillLock(lockPath, previousLock);

    return {
      schemaVersion: 1,
      transactionId: transaction.id,
      dryRun: false,
      restored: metadata.targets.map((item) => item.targetDir),
      lockPath,
    };
  }
}
