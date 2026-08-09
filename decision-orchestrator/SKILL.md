---
name: decision-orchestrator
description: Single entrypoint for decision work. Automatically routes ordinary decision, prioritization, project portfolio, resource allocation, research-vs-act, plan robustness, metric-signal, competitor and retrospective questions to the minimum useful pipeline of decision skills and deterministic calculators, then executes that pipeline in order. Use this instead of asking the user to name framing-decisions, valuing-information, allocating-effort or other internal skills. Also use when a decision should consider the user's active projects, available time, money, attention or other resources stored in .agents/context.
license: MIT
compatibility: Agent Skills compatible; Node.js >=18. Optional Python decision-engine dependencies for MCDA/sensitivity backends.
metadata:
  capabilities: decision-routing,skill-orchestration,project-portfolio,resource-allocation,decision-analysis,pipeline-execution
---

# Decision orchestrator

This is the **single user-facing entrypoint** for the decision skill system.

The user should describe the real problem, not choose an internal skill. Treat skill names as implementation details unless the user explicitly overrides routing.

## Core rule

**Understand with the model; route and calculate with code; execute the selected pipeline before answering.**

Do not stop after routing or planning. A response that only says which skills should be used is incomplete.

The model may translate natural language into structured intent signals and fill a DecisionSpec from facts, estimates and priors. It must not silently choose arbitrary skill chains, invent criterion weights, or perform arithmetic that an available calculator/backend should perform.

## Execution contract

The orchestrator owns the complete lifecycle:

```text
user request
  -> infer signals
  -> load relevant context
  -> deterministic routing
  -> minimal ordered pipeline
  -> materialize selected SKILL.md instructions
  -> execute every step in order
  -> run deterministic methods/calculators when selected
  -> synthesize one final answer
```

The local AI agent invoking this skill is the `skillRunner`. The repository intentionally does not embed a vendor-specific LLM API. For every `skill` step, apply the materialized `SKILL.md` instructions to the current request/context plus the outputs of previous steps. For every `method` step, use the deterministic calculator/adapter selected by the decision engine.

Each step must see the prior step outputs. If a required skill cannot be loaded, a required deterministic method cannot be executed, or a step fails, stop the pipeline and surface the blocker. Do not silently skip failed steps.

## Workflow

1. Read the user's request normally. Do not ask which skill to use.
2. If `.agents/context` exists, use the project/resource/decision context when it can materially change the decision.
3. Infer structured routing signals. Prefer explicit facts from the request; mark uncertain interpretations as assumptions.
4. Materialize the executable bundle:

```bash
node scripts/orchestrate.js bundle --text "<user request>"
```

If `sdm-orchestrate` is installed as a bin command:

```bash
sdm-orchestrate bundle --text "<user request>"
```

For high-stakes or ambiguous routing, write a small signals JSON file and pass `--signals FILE`. If a DecisionSpec is available, pass it with `--decision FILE`.
5. Read `execution.steps` from the bundle and execute **every step in order**.
   - `kind: skill`: use the embedded `instructions`; do not merely mention the skill name.
   - `kind: method`: run the deterministic calculator/adapter appropriate for that method.
   - feed each completed step's output into the next step.
6. Do not execute skills that are absent from the pipeline. Do not add extra skills because they seem interesting.
7. If structured numeric inputs are incomplete, use the selected skill to obtain/structure only the missing values. Never invent them.
8. Synthesize one user-facing answer from the completed pipeline. Do not dump the execution bundle unless debug output was requested.
9. Record material decisions and later outcomes in the decision/evidence registry when appropriate:

```bash
node scripts/orchestrate.js record --record decision-record.json
```

### Planning/debug only

`plan` is for diagnostics and tests. It is **not** the normal user workflow:

```bash
sdm-orchestrate plan --text "<request>"
```

If you invoked `plan`, you still have not completed the user's task.

## Context source of truth

By default the orchestrator reads:

```text
.agents/context/
  projects.json
  resources.json
  preferences.json
  decisions.jsonl
```

- `projects.json`: active alternatives/workstreams, stages, goals and constraints.
- `resources.json`: time, budget, people, attention/energy and infrastructure constraints.
- `preferences.json`: stable user-owned trade-off preferences. Never invent missing weights.
- `decisions.jsonl`: append-only decision/evidence history for calibration and retrospectives.

Missing context files are valid and treated as empty, not as permission to invent values.

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

Use a compact user-facing result. Keep the implementation pipeline hidden unless debug output is requested.

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
<skills selected, execution order, completed step statuses, and deterministic methods>
```

## Gotchas

- **Do not ask the user to pick a skill.** `decision-orchestrator` is the single entrypoint.
- **Do not stop at routing or planning.** Execute all selected steps before answering.
- **Do not let the LLM choose arbitrary weights.** Missing MCDA weights means Pareto, not invented percentages.
- **Do not run every skill.** More skills add latency and conflicting advice; use the minimum pipeline that covers the request.
- **Do not confuse a project list with value.** Projects are alternatives; ranking must still depend on goals, resources, evidence and constraints.
- **Do not treat missing context as zero.** Missing money, time, stress or probability data is UNKNOWN, not 0.
- **Do not rewrite history.** `decisions.jsonl` is append-only; record outcomes as new records linked to the original decision.
- **Do not hide provenance.** Facts, estimates, priors and calculated values must remain distinguishable.
- **Do not silently skip an executor failure.** Fail closed and tell the user what input/tool is missing.
