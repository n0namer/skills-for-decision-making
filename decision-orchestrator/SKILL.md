---
name: decision-orchestrator
description: Automatically routes ordinary decision, prioritization, project portfolio, resource allocation, research-vs-act, plan robustness, metric-signal, competitor and retrospective questions to the minimum useful pipeline of decision skills and deterministic calculators. Use this instead of asking the user to name framing-decisions, valuing-information, allocating-effort or other internal skills. Also use when a decision should consider the user's active projects, available time, money, attention or other resources stored in .agents/context.
license: MIT
compatibility: Agent Skills compatible; Node.js >=18. Optional Python decision-engine dependencies for MCDA/sensitivity backends.
metadata:
  capabilities: decision-routing,skill-orchestration,project-portfolio,resource-allocation,decision-analysis
---

# Decision orchestrator

The user should describe the real problem, not choose an internal skill. Treat skill names as implementation details unless the user explicitly overrides routing.

## Core rule

**Understand with the model; route and calculate with code.**

The model may translate natural language into structured intent signals and fill a DecisionSpec from facts, estimates and priors. It must not silently choose arbitrary skill chains, invent criterion weights, or perform arithmetic that an available calculator/backend should perform.

## Workflow

1. Read the user's request normally. Do not ask which skill to use.
2. If `.agents/context` exists, use the project/resource/decision context when it can materially change the decision.
3. Infer structured routing signals. Prefer explicit facts from the request; mark uncertain interpretations as assumptions.
4. Run the orchestrator plan:

```bash
node scripts/orchestrate.js plan --text "<user request>"
```

For high-stakes or ambiguous routing, write a small signals JSON file and pass `--signals FILE` so the final skill selection is determined by code rather than free-form model choice.
5. Execute only the skills returned by the pipeline, in order. Do not run every available skill.
6. If a DecisionSpec is available, pass it with `--decision FILE`; the deterministic method router decides whether expected utility, value of information, MCDA, Pareto or sensitivity analysis is allowed.
7. Use calculators/library adapters for numerical outputs. The LLM explains the result and identifies weak assumptions.
8. Record material decisions and later outcomes in the decision/evidence registry when the local workflow supports writes.

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
