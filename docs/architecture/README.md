# Adaptive Problem Solver architecture

The general user-facing entry point is `adaptive-problem-solver/SKILL.md`. Codex/Claude Code acts as meta-orchestrator. Deterministic code owns state transitions and replanning. `decision-orchestrator` is a specialist subsystem for formal decision analysis.

## Active architecture

```text
Task
 -> Root Skill + Coding Agent
 -> complexity route / adaptive lifecycle
 -> deterministic Plan + TaskState controller
 -> retrieve Skills / Flows / Primitives
 -> execute bounded step
 -> verify / evaluate
 -> update state
 -> continue / retry / patch / rebuild / backtrack / escalate / finish
 -> learn through tested reusable assets
```

## Active ADR set

| ADR | Decision | Status |
|---|---|---|
| 0017 | Root Skill + Coding Agent Execution Model | Accepted |
| 0018 | Adaptive Solver Lifecycle + Complexity Routing | Accepted |
| 0019 | Deterministic Planning and Replanning | Accepted |
| 0020 | Reusable Asset Model and Retrieval | Accepted |
| 0021 | Verification, Eval and Promotion Lifecycle | Accepted |
| 0022 | Quality → Reliability → SLA → Cost | Accepted |
| 0023 | Learning and Controlled Self-Modification | Accepted |
| 0024 | Persistence and Provenance | Accepted |
| 0025 | Workflow Runtime and Connector Boundary | Experimental |

ADR-0001…ADR-0016 are historical records superseded by the consolidated set above.

## Why this refactor

The original 16 ADRs had several overlapping decisions: root-skill and meta-orchestrator; lifecycle and complexity routing; controller and replanning; asset separation and registries; evals and verification; learning and self-modification; Agno and connector strategy. The active set keeps these concerns together where they form one architectural boundary, while keeping technology choices separate from durable solver policy.
