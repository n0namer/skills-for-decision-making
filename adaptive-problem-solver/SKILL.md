---
name: adaptive-problem-solver
description: Root skill for adaptive, evidence-driven problem solving across business, research, operations, coding and other open-ended tasks. Use when a task may require planning, reusable flow/primitive retrieval, verification, replanning after new evidence, or controlled creation and testing of missing capabilities. It is the single entry point above decision-orchestrator and other specialist skills.
license: MIT
compatibility: Agent Skills compatible; intended for coding agents such as Codex or Claude Code with filesystem/tool access. Node.js >=18 for deterministic controller utilities.
metadata:
  capabilities: adaptive-problem-solving,planning,replanning,skill-routing,flow-reuse,primitive-reuse,verification,system-learning
---

# Adaptive Problem Solver

This is the **root user-facing skill** for general problem solving. The host coding agent (Codex, Claude Code or equivalent) is the meta-orchestrator. The skill provides operating policy; deterministic controller code enforces plan/replan invariants.

Read `references/architecture.md` before changing reusable solver architecture.

## Core contract

**Use the smallest reliable execution mode, reuse before inventing, keep control flow deterministic where practical, verify against evidence, and replan explicitly when observations invalidate the plan.**

The agent may reason, search, write/adapt code and acquire missing capabilities. It must not hide critical branching, retry or plan mutation inside an untestable prose chain when executable control exists.

## Execution modes

- **L0 Action** — one known primitive/direct host tool is sufficient.
- **L1 Known Flow** — a tested reusable flow matches the task.
- **L2 Problem** — bounded planning, verification and possible replanning are required.
- **L3 Open Problem** — framing, state modelling, alternative strategies, short-horizon planning and repeated evidence-driven replanning are required.

Do not run L3 for L0/L1 work.

## Architecture roles

- **Skill** — adaptive knowledge, task semantics, strategy/failure-mode guidance and capability discovery.
- **Flow** — reusable executable strategy composed from primitives, agents or nested flows.
- **Primitive** — atomic executable capability with an input/output contract.
- **Eval** — deterministic/golden/regression/semantic evidence that behavior is acceptable.
- **Task Controller** — deterministic state-transition authority for plan, execute, verify, replan and stop.
- **Coding Agent** — meta-orchestrator that retrieves assets, writes/adapts code, runs tests/evals and proposes controlled improvements.

`decision-orchestrator` remains the decision-analysis specialist (MCDA, VOI, allocation, stress testing and related methods). Invoke it only when decision analysis is part of the problem.

## Executable control plane

The repository ships zero-dependency controller utilities under `lib/problem-solver/` and CLI `sdm-solve` (`scripts/problem-solver.js`). Use these instead of manually emulating invariants in prose when the task reaches L2/L3.

Typical operations:

```bash
sdm-solve mode --signals task-mode-signals.json
sdm-solve registry
sdm-solve validate-plan --plan plan.json
sdm-solve init-state --task task.json --plan plan.json
sdm-solve next-step --plan plan.json --state task-state.json
sdm-solve begin-step --plan plan.json --state task-state.json --step <id>
sdm-solve record-outcome --plan plan.json --state task-state.json --step <id> --outcome outcome.json
sdm-solve record-observation --state task-state.json --observation observation.json
sdm-solve select-flow --query flow-query.json
sdm-solve decide --plan plan.json --state task-state.json --step <id> --verdict verdict.json
sdm-solve apply-patch --plan plan.json --state task-state.json --patch patch.json
```

The coding agent still supplies semantic interpretation, plans and verifier outputs. The executable control plane validates their shape and allowed transitions.

## Workflow

1. **FRAME** — define goal/North Star, current/desired state, constraints, DoD and material unknowns.
2. **ROUTE COMPLEXITY** — choose L0/L1/L2/L3 from structured evidence.
3. **MODEL** — for L2/L3 maintain facts, assumptions, constraints, unknowns and predictions.
4. **RETRIEVE BEFORE INVENTING** — inspect Flow Registry, Primitive Registry and relevant local skills; then connector/MCP/toolkit capabilities; only then external skill candidates or new code.
5. **PLAN** — create a structured, versioned short-horizon Plan. Validate it with controller code.
6. **PLAN JUDGE** — reject missing requirements, verification, dependencies or material constraints.
7. **EXECUTE ONE BOUNDED STEP** — prefer tested flows/primitives.
8. **VERIFY** — observable result → deterministic invariant → source/evidence check → independent semantic judge → adversarial judge → self-reflection.
9. **UPDATE STATE** — record observations and predicted-vs-observed differences.
10. **REPLAN GATE** — return exactly one typed action: `CONTINUE`, `RETRY`, `PATCH_PLAN`, `REBUILD_PLAN`, `BACKTRACK`, `ESCALATE`, `FINISH`.
11. **REPLAN EXPLICITLY** — material changes require evidence and typed reason. Prefer `PlanPatch`; validate/apply it through code.
12. **FINAL JUDGE** — confirm task-level DoD.
13. **DELIVER** — return the requested result, not orchestration chatter unless debug was requested.
14. **LEARN** — repeated program → Flow candidate; reusable action → Primitive candidate; reproducible failure → regression Eval; repeated strategy lesson → Skill/routing update.
15. **PROMOTE SAFELY** — modified executable assets pass relevant tests/evals before stable use.

## Planning and replanning invariants

For L2/L3 the plan is structured state, not a disposable paragraph. `Plan.version` changes only for structural replanning; runtime step status lives in TaskState.

A `PlanPatch` must identify the plan/base version, typed reason, evidence, and explicit step/constraint changes. Applying a patch resets touched steps **and their transitive dependents**, while preserving unaffected completed work.

Replan reasons: `NEW_FACT`, `NEW_CONSTRAINT`, `ASSUMPTION_FAILED`, `STEP_FAILED`, `QUALITY_GATE_FAILED`, `MISSING_DEPENDENCY`, `BETTER_FLOW_FOUND`, `BUDGET_RISK`, `DEADLINE_RISK`, `GOAL_CHANGED`.

## Retrieval order

Before new implementation:

1. exact stable Flow;
2. adaptable stable Flow;
3. existing Primitives;
4. existing local Skills;
5. existing connector/MCP/toolkit capability;
6. trusted external Skill/tool candidate staged for inspection;
7. minimal new code.

## Quality and economics

Selection is lexicographic: satisfy **quality** → **reliability** → **SLA**, then minimize expected **cost** among eligible alternatives. Raw token count is telemetry contributing to cost, not the objective.

Candidate tournaments are for new/materially changed flows, not every stable production run.

## System learning

Keep runtime learning (facts about the current task) separate from system learning (changes to skills/flows/primitives/evals/policies). Reproducible production failures should become executable regression cases; repeated successful ad-hoc code should be considered for promotion into tested flows/primitives.

## Gotchas

- A long `SKILL.md` checklist is not a tested workflow.
- Do not use LLM self-reflection as the primary verifier when independent evidence exists.
- Do not regenerate a known flow merely because the model can.
- Do not silently rewrite a plan; use typed replan + PlanPatch.
- Do not promote a flow from one successful run.
- Do not optimize tokens ahead of quality/reliability/SLA.
- Agno is experimental and belongs behind the business-workflow boundary; ordinary code/direct primitives remain valid.
- Do not call `decision-orchestrator` for every task.

## Output template

```markdown
## Result
<completed answer/artifact/action>

## Evidence / checks
<material verification evidence>

## Open blockers
<only genuine blockers>
```

Debug/architecture output may additionally report mode, reused/adapted flow, primitives, plan version, replan events, verification and reusable assets/evals created.
