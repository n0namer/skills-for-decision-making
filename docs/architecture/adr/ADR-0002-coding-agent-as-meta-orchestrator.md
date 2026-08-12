# ADR-0002: Coding Agent as Meta-Orchestrator

- Status: **Accepted**
- Date: 2026-08-12

## Context
The system must adapt code, retrieve reusable assets and repair missing capabilities. A fixed workflow engine alone cannot perform these development-time actions.

## Decision
A coding agent such as Codex or Claude Code SHALL act as the meta-orchestrator. It MAY inspect repositories, retrieve skills/flows/primitives, write or adapt code, run tests/evals and propose promotions. It SHALL operate inside controller and promotion policies rather than becoming the state-transition authority.

## Consequences
- Strong code-generation/tool-use can grow the system from real tasks.
- Model behavior still needs deterministic gates.

## Invariants
- The coding agent is not itself the durable workflow engine.
- Critical transitions are validated by code/policies.

## Revisit triggers
- A non-agent compiler/planner provides equal adaptability with materially higher reliability.
