# ADR-0024: Persistence and Provenance

- Status: **Accepted**
- Date: 2026-08-12
- Last reviewed: 2026-08-13
- Supersedes: ADR-0015

## Context
Executable definitions need reviewable version history, while runtime task state, predictions and production evidence need queryable operational persistence.

## Decision
Git SHALL be the source of truth for Skills, Flows, Primitives, Eval definitions, policies and ADRs. An operational database (initially Postgres) SHALL store task state, plan versions/patches, step/flow runs, predictions, observations, prediction errors, verification outputs, relevant uncertainty/information-gain signals, human interventions, costs/latency and lessons.

Runtime records SHALL reference exact relevant asset versions/Git revisions. Where material for reproducibility/audit, they SHOULD also record model/tool/connector/policy identifiers or versions used by the run.

The provenance chain SHOULD make it possible to reconstruct: task/request → TaskSpec → plan version/patch → selected Skill/Flow/Primitive versions → execution/observation → verifier/eval result → delivery/learning outcome.

Observed production metrics SHALL NOT directly mutate Git definitions.

## Alternatives considered
- Store everything in Git: rejected for high-volume runtime telemetry/state.
- Store executable definitions only in DB: rejected because code review/diff/reproducible versioning becomes weaker.
- Couple architecture to a detailed Postgres schema now: rejected because schema is an implementation detail until runtime patterns stabilize.

## Consequences
- Clean split between definition provenance and operational evidence.
- Correlation ids/version references are mandatory.
- Prediction/replanning behavior can be audited rather than reconstructed from prose.
- Postgres remains replaceable if another operational store better fits future durability/query needs.

## Invariants
- Every runtime execution identifies the exact relevant reusable asset revision(s).
- Git history is never rewritten by production telemetry.
- Plan/replan history and evidence are not silently discarded.

## Revisit triggers
- Another persistence model provides superior durability/querying without weakening provenance.
