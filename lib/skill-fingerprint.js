import { createHash } from 'node:crypto';
import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from 'node:fs';
import { join, relative } from 'node:path';

function collect(root, dir = root, out = []) {
  for (const name of readdirSync(dir).sort()) {
    if (name === '.git') continue;
    const path = join(dir, name);
    const stat = lstatSync(path);

    if (stat.isSymbolicLink()) {
      const real = realpathSync(path);
      const realStat = lstatSync(real);
      if (realStat.isDirectory()) collect(root, real, out);
      else out.push({ path: relative(root, path), content: readFileSync(real) });
    } else if (stat.isDirectory()) {
      collect(root, path, out);
    } else if (stat.isFile()) {
      out.push({ path: relative(root, path), content: readFileSync(path) });
    }
  }
  return out;
}

export function fingerprintSkillDirectory(directory) {
  const root = realpathSync(directory);
  const hash = createHash('sha256');
  for (const entry of collect(root)) {
    hash.update(entry.path);
    hash.update('\0');
    hash.update(entry.content);
    hash.update('\0');
  }
  return hash.digest('hex');
}
