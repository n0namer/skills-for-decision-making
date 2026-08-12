# ADR-0001: Root Skill as Single Entry Point

- Status: **Accepted**
- Date: 2026-08-12

## Context
The system needs one invocation that teaches the host coding agent the complete solving architecture without requiring the user to name internal skills, flows or methods.

## Decision
`adaptive-problem-solver` SHALL be the root user-facing skill for general problem solving. It SHALL know the architecture, retrieval order, planning/replanning rules, verification hierarchy and asset lifecycle. Specialist skills, including `decision-orchestrator`, are invoked underneath it when relevant.

## Consequences
- One user-facing entry point reduces routing burden.
- Internal assets remain replaceable and composable.
- The root skill becomes high-leverage and must stay concise and tested.

## Invariants
- Users need not choose internal skills.
- The root skill must not embed every business workflow as prose.

## Revisit triggers
- The root skill becomes too large to validate or routinely misroutes specialist tasks.
