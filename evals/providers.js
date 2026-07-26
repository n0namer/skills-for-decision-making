// Model providers for the eval harness.
//
// Two of them, and they measure different things:
//
//   claude-cli  agentic. The subject gets a filesystem, finds SKILL.md itself,
//               reads the reference files it decides it needs, and runs the
//               calculator. This measures the skill as it is actually used.
//
//   openrouter  inline. There is no filesystem and no tool use, so SKILL.md is
//               pasted into the prompt. This measures whether the skill's
//               *content* improves the answer, isolated from discovery and tool
//               use. Use it to check whether the skills carry across models.
//
// Assertions that require running the calculator will fail under openrouter.
// That is a property of the transport, not of the skill, and the report labels
// the mode so the two are never compared as if they were the same measurement.

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Spawn a command, feed it a prompt on stdin, return stdout. */
function shell(argv, prompt, { cwd, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const child = spawn(argv[0], argv.slice(1), {
      cwd, env: { ...process.env }, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '', err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(e.code === 'ENOENT'
        ? `"${argv[0]}" not found on PATH. Check runCommand in evals/config.json.`
        : e.message));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`exit ${code}: ${err.trim().slice(0, 500)}`));
      else resolve(out);
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function template(argv, subs) {
  return argv.map((a) => a.replace(/\{(\w+)\}/g, (_, k) => subs[k] ?? ''));
}

/**
 * OpenRouter chat completion. Retries on 429 and 5xx with exponential backoff,
 * because a rate limit mid-run would otherwise poison a whole skill's numbers
 * with spurious zero scores.
 */
async function openrouter(model, prompt, { timeoutMs, baseUrl, attempt = 0 }) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/romainsimon/skills-for-decision-making',
        'X-Title': 'skills-for-decision-making evals',
      },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 4) {
      const wait = 2000 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, wait));
      return openrouter(model, prompt, { timeoutMs, baseUrl, attempt: attempt + 1 });
    }
    throw new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const body = await res.json();
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error(`openrouter returned no content: ${JSON.stringify(body).slice(0, 300)}`);
  return text;
}

/**
 * Build the prompt for the subject.
 * Agentic providers get a pointer to the skill on disk. Inline providers get
 * the skill pasted in, because they have no disk.
 */
export function buildPrompt(config, skill, evalCase, mode, root) {
  const baseline = config.skills[skill].baselinePrompt;
  if (mode === 'without_skill') return `${baseline}\n\n${evalCase.prompt}`;

  if (config.provider === 'openrouter') {
    const skillText = readFileSync(`${root}/${skill}/SKILL.md`, 'utf8');
    return [
      'Follow the skill below when answering. You have no filesystem and no tools,',
      'so where the skill tells you to run a calculator, do the arithmetic yourself',
      'and show it.',
      '',
      '<skill>',
      skillText,
      '</skill>',
      '',
      evalCase.prompt,
    ].join('\n');
  }

  return [
    `A skill is available at ${skill}/SKILL.md in the current directory.`,
    'Read it first and follow it. It may point to reference files and to a',
    'calculator at scripts/calc.js which you should actually run rather',
    'than approximating in prose.',
    '',
    evalCase.prompt,
  ].join('\n');
}

/** Run the subject model. */
export async function complete(config, prompt, { cwd, tools }) {
  if (config.provider === 'openrouter') {
    return openrouter(config.model, prompt, {
      timeoutMs: config.timeoutMs,
      baseUrl: config.openrouterBaseUrl ?? 'https://openrouter.ai/api/v1',
    });
  }
  return shell(
    template(config.runCommand, { model: config.model, tools }),
    prompt,
    { cwd, timeoutMs: config.timeoutMs });
}

/**
 * Run the grader. Grading is a text task with no tool use, so it can run on a
 * different provider from the subject. Keeping the grader fixed while varying
 * the subject is what makes cross-model numbers comparable.
 */
export async function grade(config, prompt, root) {
  const provider = config.gradingProvider ?? config.provider;
  if (provider === 'openrouter') {
    return openrouter(config.gradingModel, prompt, {
      timeoutMs: config.timeoutMs,
      baseUrl: config.openrouterBaseUrl ?? 'https://openrouter.ai/api/v1',
    });
  }
  return shell(
    template(config.gradeCommand, { model: config.gradingModel }),
    prompt,
    { cwd: root, timeoutMs: config.timeoutMs });
}
