# Adaptive Problem Solver architecture reference

## Purpose

Operational map for the root skill. Normative decisions live in `docs/architecture/adr/`.

## Layers

```text
User task
  -> adaptive-problem-solver SKILL.md
  -> Codex / Claude Code meta-orchestrator
  -> deterministic controller (`lib/problem-solver/`)
       -> TaskSpec / Plan / TaskState / PlanPatch contracts
       -> next-ready-step / retry / replan gates
       -> Flow / Primitive / Eval registry selection
  -> business workflow runtime (experimental: Agno)
  -> connectors/tools (native, MCP, connector ecosystem, APIs)
  -> external systems
```

## Executable components

- `lib/problem-solver/contracts.js` — Task/Plan/PlanPatch/Replan contracts and validation.
- `lib/problem-solver/controller.js` — deterministic ready-step, outcome and replanning transitions.
- `lib/problem-solver/mode-router.js` — structured L0/L1/L2/L3 mode selection.
- `lib/problem-solver/asset-registry.js` — Flow/Primitive manifest loading and quality/reliability/SLA/cost filtering.
- `scripts/problem-solver.js` (`sdm-solve`) — vendor-neutral CLI for host coding agents.
- `registry/` — versioned asset manifests. Definitions live in Git; observed production metrics belong in operational storage.

## Reusable assets

**Skill**: knowledge/adaptation/discovery layer.  
**Flow**: executable reusable strategy.  
**Primitive**: atomic executable capability.  
**Eval**: evidence and regression constraints.

The current decision engine is integrated as a candidate flow through an adapter boundary; it is not the general controller.

## Replanning

The controller uses receding-horizon execution: execute a bounded step, verify, update state, then choose a typed transition. Structural plan changes increment `Plan.version` and use evidence-backed `PlanPatch` where possible. Touched steps and transitive dependents are reset; unaffected completed work remains valid.

Global actions: `CONTINUE`, `RETRY`, `PATCH_PLAN`, `REBUILD_PLAN`, `BACKTRACK`, `ESCALATE`, `FINISH`.

## Storage boundary

Git is source of truth for skill/flow/primitive/eval definitions, policies and ADRs. Postgres remains the intended operational store for task state, plan versions, runs, observations, judge results, cost/latency and lessons. The database schema is intentionally not fixed yet.

## Runtime boundary

Agno is experimental for business workflows and integrations. No core Task/Plan/Replan schema may depend on Agno concepts. The architecture must survive replacing Agno, any connector vendor, and any specific LLM provider.
