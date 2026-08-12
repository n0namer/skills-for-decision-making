# ADR-0017: Root Skill and Coding Agent Execution Model

- Status: **Accepted**
- Date: 2026-08-12
- Supersedes: ADR-0001, ADR-0002

## Context
Users should invoke one general solver capability without manually selecting internal methods. At the same time, the system needs an adaptive component capable of reading code, finding reusable assets, modifying implementations and running tests.

## Decision
`adaptive-problem-solver` SHALL be the single general user-facing skill. The host coding agent (Codex, Claude Code or equivalent) SHALL act as the meta-orchestrator that interprets this skill, retrieves reusable assets, writes/adapts missing code, executes tests/evals and coordinates specialist subsystems.

The root skill is **policy and operating knowledge**, not the runtime state machine. The coding agent may propose actions and structural changes but SHALL NOT be the sole authority for critical state transitions, plan mutation, promotion or high-risk side effects.

Specialist skills such as `decision-orchestrator` remain callable below the root skill.

## Alternatives considered
- Ask the user to choose internal skills: rejected because it leaks architecture and increases routing errors.
- Make one giant autonomous agent the whole runtime: rejected because state transitions become difficult to test and replay.
- Encode every business process inside the root SKILL.md: rejected because long prose control flow is not a reliable executable contract.

## Consequences
- One stable entrypoint for users and host agents.
- Coding agents can evolve the system from real work.
- Deterministic controller/promotion policies remain independently testable and replaceable.

## Invariants
- Users need not know internal skill names.
- The root skill does not contain all business workflows.
- Specialist subsystems remain replaceable.

## Revisit triggers
- A non-agent planner/compiler can provide equivalent adaptation/reuse with materially greater reliability or lower cost.
