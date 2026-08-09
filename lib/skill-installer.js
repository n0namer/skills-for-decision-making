import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

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

export function installSkill({
  sourceDir,
  targetDir,
  mode = 'auto',
  force = false,
  dryRun = false,
}) {
  validateInstallMode(mode);

  if (existsSync(targetDir)) {
    if (sameSkillLink(targetDir, sourceDir)) return 'unchanged';
    if (!force) return 'exists';
    if (!dryRun) rmSync(targetDir, { recursive: true, force: true });
  }

  if (dryRun) return mode === 'copy' ? 'copy' : 'symlink';

  mkdirSync(dirname(targetDir), { recursive: true });

  if (mode !== 'copy') {
    try {
      const rel = relative(dirname(targetDir), sourceDir) || '.';
      symlinkSync(rel, targetDir, process.platform === 'win32' ? 'junction' : 'dir');
      return 'symlink';
    } catch (error) {
      if (mode === 'symlink') throw error;
    }
  }

  cpSync(sourceDir, targetDir, { recursive: true });
  return 'copy';
}
