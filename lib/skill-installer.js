import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';

export const INSTALL_MODES = Object.freeze(['auto', 'symlink', 'copy']);

export function validateInstallMode(mode) {
  if (!INSTALL_MODES.includes(mode)) {
    throw new Error('mode must be auto, symlink or copy');
  }
  return mode;
}

export function sameSkillLink(targetDir, sourceDir) {
  try {
    if (!lstatSync(targetDir).isSymbolicLink()) return false;
    return resolve(dirname(targetDir), readlinkSync(targetDir)) === resolve(sourceDir);
  } catch {
    return false;
  }
}

export function inspectInstall({ targetDir, sourceDir }) {
  if (!existsSync(targetDir)) return 'missing';
  if (sameSkillLink(targetDir, sourceDir)) return 'unchanged';
  return 'exists';
}

function atomicSwap(targetDir, createTemp) {
  mkdirSync(dirname(targetDir), { recursive: true });
  const id = randomUUID();
  const temp = `${targetDir}.tmp-${id}`;
  const displaced = `${targetDir}.old-${id}`;
  let displacedExisting = false;

  try {
    createTemp(temp);
    if (existsSync(targetDir)) {
      renameSync(targetDir, displaced);
      displacedExisting = true;
    }
    renameSync(temp, targetDir);
    if (displacedExisting) rmSync(displaced, { recursive: true, force: true });
  } catch (error) {
    rmSync(temp, { recursive: true, force: true });
    if (existsSync(targetDir) && displacedExisting) {
      rmSync(targetDir, { recursive: true, force: true });
    }
    if (displacedExisting && existsSync(displaced)) renameSync(displaced, targetDir);
    throw error;
  }
}

function installSymlinkAtomic(sourceDir, targetDir) {
  atomicSwap(targetDir, (temp) => {
    const rel = relative(dirname(targetDir), sourceDir) || '.';
    symlinkSync(rel, temp, process.platform === 'win32' ? 'junction' : 'dir');
  });
}

function installCopyAtomic(sourceDir, targetDir) {
  atomicSwap(targetDir, (temp) => {
    cpSync(sourceDir, temp, { recursive: true });
    if (!existsSync(join(temp, 'SKILL.md'))) {
      throw new Error(`copied skill is missing SKILL.md: ${sourceDir}`);
    }
  });
}

export function installSkill({
  sourceDir,
  targetDir,
  mode = 'auto',
  force = false,
  dryRun = false,
}) {
  validateInstallMode(mode);
  const state = inspectInstall({ targetDir, sourceDir });
  if (state === 'unchanged') return 'unchanged';
  if (state === 'exists' && !force) return 'exists';
  if (dryRun) return mode === 'copy' ? 'copy' : 'symlink';

  if (mode !== 'copy') {
    try {
      installSymlinkAtomic(sourceDir, targetDir);
      return 'symlink';
    } catch (error) {
      if (mode === 'symlink') throw error;
    }
  }

  installCopyAtomic(sourceDir, targetDir);
  return 'copy';
}

export function snapshotInstall({ targetDir, snapshotDir }) {
  mkdirSync(snapshotDir, { recursive: true });
  const metaPath = join(snapshotDir, 'snapshot.json');

  if (!existsSync(targetDir)) {
    writeFileSync(metaPath, JSON.stringify({ kind: 'missing' }));
    return { kind: 'missing' };
  }

  const stat = lstatSync(targetDir);
  if (stat.isSymbolicLink()) {
    const link = readlinkSync(targetDir);
    writeFileSync(metaPath, JSON.stringify({ kind: 'symlink', link }));
    return { kind: 'symlink', link };
  }

  const contentDir = join(snapshotDir, 'content');
  cpSync(targetDir, contentDir, { recursive: true });
  writeFileSync(metaPath, JSON.stringify({ kind: 'copy' }));
  return { kind: 'copy' };
}

export function restoreInstall({ targetDir, snapshotDir }) {
  const meta = JSON.parse(readFileSync(join(snapshotDir, 'snapshot.json'), 'utf8'));
  rmSync(targetDir, { recursive: true, force: true });

  if (meta.kind === 'missing') return 'missing';

  mkdirSync(dirname(targetDir), { recursive: true });
  if (meta.kind === 'symlink') {
    symlinkSync(meta.link, targetDir, process.platform === 'win32' ? 'junction' : 'dir');
    return 'symlink';
  }
  if (meta.kind === 'copy') {
    cpSync(join(snapshotDir, 'content'), targetDir, { recursive: true });
    return 'copy';
  }

  throw new Error(`unknown snapshot kind: ${meta.kind}`);
}
