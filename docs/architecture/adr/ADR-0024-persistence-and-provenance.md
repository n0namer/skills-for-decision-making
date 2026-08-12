# ADR-0024: Persistence and Provenance

- Status: **Accepted**
- Date: 2026-08-12
- Supersedes: ADR-0015

## Context
Executable definitions need reviewable version history, while runtime task state and production evidence need queryable operational persistence.

## Decision
Git SHALL be the source of truth for Skills, Flows, Primitives, Eval definitions, policies and ADRs. An operational database (initially Postgres) SHALL store task state, plan versions/patches, step/flow runs, observations, verification outputs, costs/latency and lessons.

Runtime records SHALL reference exact asset versions/Git revisions so a result can be reconstructed against the definitions that produced it.

Observed production metrics SHALL NOT directly mutate Git definitions.

## Alternatives considered
- Store everything in Git: rejected for high-volume runtime telemetry/state.
- Store executable definitions only in DB: rejected because code review/diff/reproducible versioning becomes weaker.
- Couple architecture to a detailed Postgres schema now: rejected because schema is an implementation detail until runtime patterns stabilize.

## Consequences
- Clean split between definition provenance and operational evidence.
- Correlation ids/version references are mandatory.
- Postgres remains replaceable if another operational store better fits future durability/query needs.

## Invariants
- Every runtime execution identifies the exact relevant asset version/revision.
- Git history is never rewritten by production telemetry.

## Revisit triggers
- Another persistence model provides superior durability/querying without weakening provenance.
