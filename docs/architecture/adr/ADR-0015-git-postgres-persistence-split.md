# ADR-0015: Git + Postgres Persistence Split

- Status: **Accepted**
- Date: 2026-08-12

## Context
Executable definitions need version control while runtime evidence needs queryable operational persistence.

## Decision
Git SHALL be the source of truth for skills, flows, primitives, eval definitions, policies and ADRs. Postgres is the intended operational store for task state, plan versions, step/flow runs, observations, judge outputs, metrics and lessons. Exact schema/table names remain implementation details.

## Consequences
- Clear separation of definition history and runtime evidence.
- Requires correlation IDs/version references across both stores.

## Invariants
- Runtime records reference exact asset versions/revisions.
- Production metrics never mutate Git definitions directly.

## Revisit triggers
- A different operational store provides materially better durability/query needs without weakening Git provenance.
