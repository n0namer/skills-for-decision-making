---
name: adaptive-problem-solver
description: Root skill for adaptive, evidence-driven problem solving across business, research, operations, coding and other open-ended tasks. Use when a task may require planning, retrieval of reusable flows or primitives, verification, replanning after new evidence, or controlled creation and testing of missing capabilities. It is the single entry point above decision-orchestrator and other specialist skills.
license: MIT
compatibility: Agent Skills compatible; intended for coding agents such as Codex or Claude Code with filesystem/tool access.
metadata:
  capabilities: adaptive-problem-solving,planning,replanning,skill-routing,flow-reuse,primitive-reuse,verification,system-learning
---

# Adaptive Problem Solver

This is the **root user-facing skill** for general problem solving. The host coding agent (for example Codex or Claude Code) is the meta-orchestrator. The skill teaches the agent how to use the repository architecture; it is not itself a long natural-language workflow engine.

Read `references/architecture.md` before changing the solver architecture or creating a new reusable flow.

## Core contract

**Use the smallest reliable execution mode, reuse before inventing, keep control flow deterministic where practical, verify against evidence, and replan explicitly when observations invalidate the plan.**

The agent may reason, search, write code, adapt flows and create missing capabilities. It must not hide critical branching/retry logic inside an untestable prose chain when that logic can be represented as executable code.

## Execution modes

- **L0 Action** — one known primitive or direct host-tool action is sufficient.
- **L1 Known Flow** — a tested reusable flow already matches the task.
- **L2 Problem** — a bounded plan, verification and possible local replanning are required.
- **L3 Open Problem** — framing, state modelling, alternative strategies, short-horizon planning and repeated evidence-driven replanning are required.

Do not run the full L3 loop for an L0/L1 task.

## Architecture roles

- **Skill** — adaptive knowledge: task semantics, strategies, failure modes, discovery guidance and rules for selecting/adapting executable assets.
- **Flow** — reusable executable strategy composed from primitives, agents or nested flows.
- **Primitive** — atomic executable capability with an input/output contract.
- **Eval** — evidence that a primitive/flow/solver behavior is acceptable: deterministic tests, golden cases, regressions or semantic/adversarial judges.
- **Task Controller** — deterministic state-transition authority for plan, execute, verify, replan and stop decisions.
- **Coding Agent** — meta-orchestrator that reads the skill, retrieves assets, writes/adapts code, runs tests/evals and proposes controlled improvements.

`decision-orchestrator` remains the specialist entry point for decision-analysis methods (MCDA, VOI, resource allocation, stress testing and related methods) and may be selected by this root skill when the task requires it.

## Workflow

1. **FRAME** — define the goal/North Star, current state, desired state, constraints, definition of done and material unknowns.
2. **ROUTE COMPLEXITY** — choose L0/L1/L2/L3.
3. **MODEL** — for L2/L3, maintain explicit facts, assumptions, constraints, unknowns and predictions.
4. **RETRIEVE BEFORE INVENTING** — search the local Flow Registry, Primitive Registry and relevant local skills; only then inspect trusted external skills/tools/connectors or create minimal new code.
5. **PLAN** — create a structured, versioned short-horizon plan. Every material step defines dependencies, expected outputs and verifiable DoD.
6. **PLAN JUDGE** — reject plans that omit requirements, verification, dependencies or material constraints.
7. **EXECUTE ONE BOUNDED STEP** — prefer tested flows/primitives.
8. **VERIFY** — prefer: observable external result → deterministic test/invariant → source/evidence check → independent semantic judge → adversarial judge → self-reflection.
9. **UPDATE STATE** — record observations and compare predicted versus observed results.
10. **REPLAN GATE** — choose one typed action: `CONTINUE`, `RETRY`, `PATCH_PLAN`, `REBUILD_PLAN`, `BACKTRACK`, `ESCALATE`, `FINISH`.
11. **REPLAN EXPLICITLY** — every material plan change requires evidence and a typed reason. Prefer a validated PlanPatch over rewriting history.
12. **FINAL JUDGE** — confirm task-level DoD before delivery.
13. **DELIVER** — return the requested result, not orchestration chatter unless debug output was requested.
14. **LEARN** — recurring execution pattern → Flow candidate; reusable atomic action → Primitive candidate; production failure → regression Eval; repeated strategic lesson → Skill/routing update.
15. **PROMOTE SAFELY** — new or modified executable assets move through tests/evals before becoming stable. Do not let an agent silently self-modify production code.

## Planning and replanning invariants

For L2/L3 tasks the plan is structured state, not a disposable prose paragraph.

```yaml
plan_id: string
version: integer
goal: object
constraints: []
assumptions: []
steps: []
success_criteria: []
```

A material step should carry dependencies, selected flow/primitives, expected output, DoD and status. A replan decision must name an action, reason and evidence. Plan history is append-only. Completed results are not invalidated without an explicit dependency/evidence reason.

Typical replan reasons include `NEW_FACT`, `NEW_CONSTRAINT`, `ASSUMPTION_FAILED`, `STEP_FAILED`, `QUALITY_GATE_FAILED`, `MISSING_DEPENDENCY`, `BUDGET_RISK`, `DEADLINE_RISK`, and `GOAL_CHANGED`.

## Retrieval order

Before writing a new implementation:

1. exact stable Flow;
2. adaptable stable Flow;
3. existing Primitives;
4. existing local Skills;
5. existing connector/MCP/toolkit capability;
6. trusted external Skill/tool candidate staged for inspection;
7. minimal new code.

This ordering is an invariant, not a suggestion.

## Quality and economics

Selection is lexicographic:

1. meet the required **quality** threshold;
2. meet the required **reliability** threshold;
3. meet the task **SLA**;
4. among eligible alternatives, minimize expected **cost**.

Raw token count is telemetry, not the objective. Track token/model cost, wall-clock duration, human-intervention time and quality separately.

When creating or materially changing a flow, compare candidates on representative eval cases. Do not rerun expensive multi-candidate tournaments on every stable production execution.

## System learning

The system learns through executable assets and evidence, not only textual reflection.

A reproducible production failure SHOULD produce a regression case. A repeated successful ad-hoc program SHOULD be considered for promotion into a tested Flow. Repeated flow-local logic SHOULD become deterministic code where practical.

Keep runtime learning (facts about the current task) separate from system learning (changes to skills/flows/primitives/evals/policies).

## Gotchas

- Do not equate a long `SKILL.md` checklist with a tested workflow.
- Do not use LLM self-reflection as the primary verifier when external evidence or deterministic checks exist.
- Do not regenerate a known flow from scratch merely because the model can.
- Do not overwrite a plan silently after new evidence; create a typed replan decision and PlanPatch.
- Do not promote a flow because one run looked good; use regression/golden cases and representative task evidence.
- Do not optimize token count ahead of quality/reliability/SLA.
- Do not force Agno or any other runtime into tasks where ordinary Python or a direct primitive is simpler; the runtime choice is experimental.
- Do not call `decision-orchestrator` for every task. Use it when decision-analysis methods are actually relevant.

## Output template

Normal user-facing output should remain task-focused:

```markdown
## Result
<completed answer/artifact/action>

## Evidence / checks
<only the material verification evidence>

## Open blockers
<only if something genuinely blocks completion>
```

In debug/architecture mode, additionally report mode, reused/adapted flow, primitives, plan version, replan events, verification and newly created reusable assets/evals.
