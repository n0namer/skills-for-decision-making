---
name: decision-orchestrator
description: Single entrypoint for decision work. Automatically gathers needed context through host-agent tools, routes ordinary decision, prioritization, project portfolio, resource allocation, research-vs-act, plan robustness, metric-signal, competitor and retrospective questions to the minimum useful pipeline of decision skills and deterministic calculators, then executes that pipeline in order. Use this instead of asking the user to name framing-decisions, valuing-information, allocating-effort or other internal skills.
license: MIT
compatibility: Agent Skills compatible; Node.js >=18. Optional Python decision-engine dependencies for MCDA/sensitivity backends.
metadata:
  capabilities: decision-routing,skill-orchestration,tool-orchestration,project-portfolio,resource-allocation,decision-analysis,pipeline-execution
---

# Decision orchestrator

This is the **single user-facing entrypoint** for the decision skill system.

The user should describe the real problem, not choose an internal skill. Treat skill names as implementation details unless the user explicitly overrides routing.

## Core rule

**Gather context with available host tools; understand with the model; route and calculate with code; execute the selected pipeline before answering.**

Do not stop after routing or planning. A response that only says which skills should be used is incomplete.

The model may translate natural language into structured intent signals and fill a DecisionSpec from facts, estimates and priors. It must not silently choose arbitrary skill chains, invent criterion weights, or perform arithmetic that an available calculator/backend should perform.

## Host-agent tool contract

This skill runs inside an AI agent. The host agent may already have tools/plugins/connectors for Notion, GitHub, Google Drive, web search, memory/history, files, Airtable, Gmail or other systems.

Use those capabilities directly when they are relevant. Do **not** require a repository-specific Notion/GitHub/etc. SDK merely to read context the host agent can already access.

Before routing:

1. Determine which external facts/context materially affect the decision.
2. Use available host-agent tools to retrieve them.
3. Treat retrieved source data as FACT with provenance; do not convert missing values to zero.
4. Normalize only the decision-relevant subset into a context object:

```json
{
  "projects": [],
  "resources": {},
  "preferences": {},
  "decisions": [],
  "provenance": {
    "source": "notion|github|drive|memory|other",
    "retrievedAt": "ISO-8601",
    "details": "human-readable source reference"
  }
}
```

5. Write that normalized object to a temporary JSON file and pass it through `--context-json FILE` when using the CLI bundle.
6. If the task explicitly asks to update a source of truth (for example Notion), perform that write through the host tool first, then **re-read the source** and build the orchestration context from the post-write state.

Example for a Notion portfolio request:

```text
user asks for project evaluation
  -> host agent reads Notion project database
  -> normalize relevant project/resource fields
  -> save temporary context.json
  -> sdm-orchestrate bundle --text "..." --context-json context.json
  -> execute every bundle step
```

If a required host tool is unavailable, surface that blocker. Do not silently fall back to stale remembered data when the user explicitly requested the external source.

## Version-coherence contract

When this skill was updated earlier in the same user request/session, assume the host agent may still have a stale in-memory copy of the old skill instructions.

Before execution after an update:

1. Re-read `decision-orchestrator/SKILL.md` from the **newly resolved revision**, not from a pre-update cache path or previously loaded skill object.
2. Run `bundle` from that same checkout/revision.
3. Verify `bundle.runtime.revision` equals the lifecycle/source revision just installed.
4. Verify selected skill paths in `bundle.execution.steps` resolve under `bundle.runtime.repoRoot` unless an explicit override was requested.
5. If revisions differ, stop and reload from the new revision. Never combine an old `SKILL.md` with newer orchestration code.

A successful filesystem sync does not prove the current agent session hot-reloaded its skill registry. Same-session update-and-run must therefore use the post-update files explicitly.

## Execution contract

The orchestrator owns the complete lifecycle:

```text
user request
  -> acquire relevant external context with host tools
  -> infer signals
  -> normalize context
  -> deterministic routing
  -> minimal ordered pipeline
  -> materialize selected SKILL.md instructions from the same runtime revision
  -> execute every step in order
  -> run deterministic methods/calculators when selected
  -> synthesize one final answer
```

The local AI agent invoking this skill is the `skillRunner`. The repository intentionally does not embed a vendor-specific LLM API. For every `skill` step, apply the materialized `SKILL.md` instructions to the current request/context plus the outputs of previous steps. For every `method` step, use the deterministic calculator/adapter selected by the decision engine.

Each step must see the prior step outputs. If a required skill cannot be loaded, a required deterministic method cannot be executed, or a step fails, stop the pipeline and surface the blocker. Do not silently skip failed steps.

## Workflow

1. Read the user's request normally. Do not ask which skill to use.
2. Acquire relevant context through available host-agent tools when requested or materially useful. `.agents/context` is only one possible source.
3. Infer structured routing signals. Prefer explicit facts from the request/source; mark uncertain interpretations as assumptions.
4. Materialize the executable bundle:

```bash
node scripts/orchestrate.js bundle --text "<user request>" --context-json <normalized-context.json>
```

If `sdm-orchestrate` is installed as a bin command:

```bash
sdm-orchestrate bundle --text "<user request>" --context-json <normalized-context.json>
```

`--context-json` is optional when no external context is needed. `.agents/context` can still be used with `--context DIR`.

For high-stakes or ambiguous routing, write a small signals JSON file and pass `--signals FILE`. If a DecisionSpec is available, pass it with `--decision FILE`.
5. Verify runtime revision coherence when the skill was updated in this same request/session.
6. Read `execution.steps` from the bundle and execute **every step in order**.
   - `kind: skill`: use the embedded `instructions`; do not merely mention the skill name.
   - `kind: method`: run the deterministic calculator/adapter appropriate for that method.
   - feed each completed step's output into the next step.
7. Do not execute skills that are absent from the pipeline. Do not add extra skills because they seem interesting.
8. If structured numeric inputs are incomplete, use the selected skill and available host tools to obtain/structure only the missing values. Never invent them.
9. Synthesize one user-facing answer from the completed pipeline. Do not dump the execution bundle unless debug output was requested.
10. Record material decisions and later outcomes in the decision/evidence registry when appropriate:

```bash
node scripts/orchestrate.js record --record decision-record.json
```

### Planning/debug only

`plan` is for diagnostics and tests. It is **not** the normal user workflow:

```bash
sdm-orchestrate plan --text "<request>"
```

If you invoked `plan`, you still have not completed the user's task.

## Context sources

The orchestrator accepts either file-backed context or normalized host-agent context.

File-backed default:

```text
.agents/context/
  projects.json
  resources.json
  preferences.json
  decisions.jsonl
```

Host-tool context:

```bash
sdm-orchestrate bundle --text "..." --context-json <file>
```

- `projects`: active alternatives/workstreams, stages, goals and constraints.
- `resources`: time, budget, people, attention/energy and infrastructure constraints.
- `preferences`: stable user-owned trade-off preferences. Never invent missing weights.
- `decisions`: decision/evidence history for calibration and retrospectives.
- `provenance`: where the normalized context came from.

Missing context is valid and remains UNKNOWN; it is not permission to invent values.

## Routing principles

The code router owns the final mapping. Typical signals include:

- choice under uncertainty -> `framing-decisions`
- research/test versus act now -> `valuing-information`
- limited time/budget/resources across options -> `allocating-effort`
- roadmap depth/order -> `planning-horizons`
- premortem/robustness of a plan -> `stress-testing-plans`
- metric change / signal versus noise -> `tracking-beliefs`
- competitor action -> `reading-rivals`
- observed result of a past decision -> `learning-from-outcomes`

A request may produce a pipeline of several skills. Keep it minimal.

## Multi-criteria decisions

If alternatives have several criteria such as money, time, psychological load, risk and strategic value:

- explicit complete criterion weights -> MCDA is allowed;
- missing/incomplete weights -> use Pareto analysis instead of inventing weights;
- uncertain parameter ranges -> add sensitivity analysis when the backend is available.

## Output discipline

Do not expose routing chatter in a normal answer unless it helps the user or debug mode was requested. Separate:

- FACT: observed or sourced input
- ESTIMATE: human/model estimate
- PRIOR: probabilistic belief before new evidence
- CALCULATED: produced by deterministic code
- UNKNOWN: required information that is not available

When the answer depends strongly on an estimate, say what value or threshold would flip the decision.

## Output template

Use a compact user-facing result. Keep the implementation pipeline hidden unless debug output was requested.

```markdown
## Decision
<recommended action or the exact unresolved choice>

## Why
<2-5 decision-relevant reasons grounded in facts/calculated results>

## Key assumptions
<only assumptions capable of changing the answer, with provenance>

## Risk / sensitivity
<what downside matters and what threshold would flip the decision>

## Next move
<one bounded reversible action, preferably 48-72h when experimentation is appropriate>
```

When debug mode is requested, add:

```markdown
## Routing
<skills selected, execution order, completed step statuses, deterministic methods, runtime revision>
```

## Gotchas

- **Do not ask the user to pick a skill.** `decision-orchestrator` is the single entrypoint.
- **Do not stop at routing or planning.** Execute all selected steps before answering.
- **Do not use a stale pre-update skill.** Same-session update-and-run must explicitly reload the new revision.
- **Do not separate external context acquisition from execution.** Tool-fetched facts must be normalized into the bundle context so downstream skills actually receive them.
- **Do not build provider-specific integrations when host tools already exist.** Use the host capability boundary.
- **Do not let the LLM choose arbitrary weights.** Missing MCDA weights means Pareto, not invented percentages.
- **Do not run every skill.** More skills add latency and conflicting advice; use the minimum pipeline that covers the request.
- **Do not confuse a project list with value.** Projects are alternatives; ranking must still depend on goals, resources, evidence and constraints.
- **Do not treat missing context as zero.** Missing money, time, stress or probability data is UNKNOWN, not 0.
- **Do not rewrite history.** Decision history is append-only; record outcomes as new records linked to the original decision.
- **Do not hide provenance.** Facts, estimates, priors and calculated values must remain distinguishable.
- **Do not silently skip an executor failure.** Fail closed and tell the user what input/tool is missing.
