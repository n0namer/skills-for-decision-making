# Adaptive Problem Solver architecture

The general user-facing entry point is `adaptive-problem-solver/SKILL.md`. Codex/Claude Code acts as meta-orchestrator, while `lib/problem-solver/` enforces deterministic task/plan/replan invariants. The older `decision-orchestrator` remains a specialist subsystem for formal decision analysis.

## Runtime shape

```text
Task
 -> Root Skill
 -> Coding Agent
 -> Task Controller
    -> Frame / Model / Retrieve / Plan / Plan Judge
    -> Execute bounded step
    -> Verify / Update
    -> Replan Gate
 -> Flow / Primitive / Skill / Eval registries
 -> Workflow runtime + connectors
 -> External systems
 -> Learn / promote tested reusable assets
```

## Implemented v1 control-plane pieces

- structured Task/Plan/TaskState/PlanPatch/Replan contracts;
- dependency/DAG validation;
- smallest-sufficient L0/L1/L2/L3 routing from structured signals;
- next-ready-step selection;
- deterministic retry/replan transition decisions;
- versioned PlanPatch with selective + transitive invalidation;
- Flow/Primitive/Eval Git registries;
- quality/reliability/SLA gates before cost-based flow selection;
- `sdm-solve` CLI for coding agents;
- tests for controller/replanning/registry invariants.

Agno and connector ecosystems remain experimental and are not dependencies of the controller.

## Decision map

| ADR | Decision | Status |
|---|---|---|
| 0001 | Root Skill as Single Entry Point | Accepted |
| 0002 | Coding Agent as Meta-Orchestrator | Accepted |
| 0003 | Adaptive Problem-Solving Lifecycle | Accepted |
| 0004 | Deterministic Task Controller | Accepted |
| 0005 | Task Complexity Routing | Accepted |
| 0006 | Versioned Planning and Replanning | Accepted |
| 0007 | Skill / Flow / Primitive Separation | Accepted |
| 0008 | Primitive and Flow Registries | Accepted |
| 0009 | Eval Registry and Reliability Lifecycle | Accepted |
| 0010 | Verification and Judge Cascade | Accepted |
| 0011 | Quality → Reliability → SLA → Cost | Accepted |
| 0012 | Continuous System Learning | Accepted |
| 0013 | Agno as Business Workflow Runtime | Experimental |
| 0014 | Connector Strategy | Experimental |
| 0015 | Git + Postgres Persistence Split | Accepted |
| 0016 | Controlled Self-Modification | Accepted |
