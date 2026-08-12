# Adaptive Problem Solver architecture

This directory records the architecture for the repository's general-purpose adaptive problem-solving layer.

The user-facing entry point is `adaptive-problem-solver/SKILL.md`. The host coding agent (Codex, Claude Code or equivalent) acts as the meta-orchestrator. Stable execution logic is progressively moved from natural-language guidance into tested flows and primitives.

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

The ADRs are intentionally technology-light except where a choice is explicitly experimental. The solver architecture must remain valid if the workflow runtime, connector vendor or LLM provider changes.
