# Adaptive Problem Solver architecture reference

## Purpose

This reference gives the coding agent a compact map of the system. Normative decisions live in `docs/architecture/adr/`; this file is operational guidance for the root skill.

## Layers

```text
User task
  -> adaptive-problem-solver skill
  -> coding agent meta-orchestrator
  -> deterministic Task Controller
       -> Planner / Replanner / Verifiers
       -> Skill retrieval
       -> Flow Registry
       -> Primitive Registry
       -> Eval Registry
  -> business workflow runtime (experimental: Agno)
  -> connectors/tools (native, MCP, external connector ecosystem, APIs)
  -> external systems
```

## Three reusable asset types

### Skill
Knowledge and adaptation layer. It recognizes task classes, points to relevant flows/primitives/methods, records failure modes and tells the coding agent how to acquire missing capabilities.

### Flow
Executable, reusable strategy. Stable control flow belongs in code, not only prose. A flow may call primitives, agents and nested flows.

### Primitive
Atomic executable capability with typed inputs/outputs, side-effect/risk metadata and deterministic contract tests where possible.

## Eval plane

Evals are first-class assets: deterministic tests, golden task cases, production regressions, semantic judges where needed and adversarial judges only when risk justifies their cost.

A production failure should become an executable regression constraint when reproducible.

## Planning and replanning

For non-trivial tasks the controller maintains a versioned Plan. Execution is receding-horizon: execute a bounded step, observe, verify, update state, then decide whether to continue or replan.

Global actions: `CONTINUE`, `RETRY`, `PATCH_PLAN`, `REBUILD_PLAN`, `BACKTRACK`, `ESCALATE`, `FINISH`.

Prefer PlanPatch to full rebuild. Every replan requires typed reason + evidence.

## Storage

Git is the source of truth for skills, flows, primitives, eval definitions, policies and ADRs. Postgres is the intended operational store for tasks/state, plan versions, runs, observations, judge results, costs/latency and lessons.

The concrete Postgres schema is an implementation detail until runtime work begins.

## Runtime boundary

Agno is an experimental business-workflow runtime, not the global solver brain. The deterministic Task Controller must remain replaceable and should not depend on Agno-specific semantics.

The root skill and controller architecture must survive replacing Agno, a connector vendor or any specific LLM provider.
