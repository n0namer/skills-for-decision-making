# ADR-0004: Deterministic Task Controller

- Status: **Accepted**
- Date: 2026-08-12

## Context
Long natural-language orchestration is difficult to test and can fail silently across multiple steps.

## Decision
The global task lifecycle SHALL be governed by deterministic code/state transitions where practical. The Task Controller owns allowed states, retries, gates, stop conditions and plan-version transitions. LLMs may propose decisions but SHALL return structured outputs that the controller validates.

## Consequences
- Control flow becomes testable and auditable.
- Explicit schemas/controller code are required.

## Invariants
- LLM prose alone cannot authorize critical state transitions.
- Controller behavior must be replayable from persisted state.

## Revisit triggers
- Another runtime provides equivalent deterministic/auditable semantics with less custom code.
