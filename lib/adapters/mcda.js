import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ADAPTER_PATH = fileURLToPath(
  new URL('../../engine/adapters/mcda_scikit_criteria.py', import.meta.url),
);

export function runMcda(spec, { python = process.env.PYTHON ?? 'python3' } = {}) {
  const proc = spawnSync(python, [ADAPTER_PATH], {
    input: JSON.stringify(spec),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (proc.error) {
    if (proc.error.code === 'ENOENT') {
      throw new Error(
        `Python executable "${python}" was not found. ` +
        'Install Python 3 or set the PYTHON environment variable.',
      );
    }
    throw proc.error;
  }

  if (proc.status !== 0) {
    const detail = (proc.stderr || proc.stdout || '').trim();
    throw new Error(`MCDA adapter failed (exit ${proc.status}): ${detail}`);
  }

  try {
    return JSON.parse(proc.stdout);
  } catch (error) {
    throw new Error(`MCDA adapter returned invalid JSON: ${error.message}`);
  }
}
