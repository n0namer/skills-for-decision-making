---
name: A skill behaved wrongly
about: The agent did something the skill should have prevented, or missed something it should have caught
labels: skill-behaviour
---

**Which skill**

**What you asked**

Paste the prompt as you actually typed it. The wording matters: these skills fire on
triggers, and a prompt that names the method tests something different.

**What the agent did**

**What it should have done**

**Agent and model**

Claude Code / Codex / Cursor / other, and which model.

---

The most useful version of this issue is a failing eval. If you can express the gap as an
assertion, add it to that skill's `evals/evals.json` and open a PR instead. See
CONTRIBUTING.md for what makes a good assertion.
