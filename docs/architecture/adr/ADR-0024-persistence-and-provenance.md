# ADR-0024: Persistence and Provenance

- Status: **Accepted**
- Date: 2026-08-12
- Last reviewed: 2026-08-14
- Supersedes: ADR-0015

## Context
Executable definitions need reviewable version history, while runtime task state, predictions and production evidence need queryable operational persistence. Multi-tenant/workspace operation also requires persistence to preserve scope rather than relying on callers to remember filters.

## Decision
Git SHALL be the source of truth for Skills, Flows, Primitives, Eval definitions, policies and ADRs. An operational database (initially Postgres) SHALL store task state, plan versions/patches, step/flow runs, predictions, observations, prediction errors, verification outputs, relevant uncertainty/information-gain signals, human interventions, costs/latency and lessons.

Runtime records SHALL reference exact relevant asset versions/Git revisions. Where material for reproducibility/audit, they SHOULD also record model/tool/connector/policy identifiers or versions used by the run.

All tenant-originating operational records that participate in retrieval or execution SHALL be bound to the scope model in ADR-0026. `tenant_id` is mandatory at the logical persistence boundary; workspace/task/run identifiers are stored when applicable. Retrieval/index projections SHALL preserve compatible scope/namespace information.

The provenance chain SHOULD make it possible to reconstruct:

`tenant/workspace/task/run scope -> task/request -> TaskSpec -> plan version/patch -> selected Skill/Flow/Primitive versions -> execution/observation -> verifier/eval result -> delivery/learning outcome`.

For Global assets promoted from local experience, provenance SHOULD retain an auditable derivation reference and promotion evidence without making the Global asset depend on local source retrieval at runtime.

Observed production metrics SHALL NOT directly mutate Git definitions.

Physical storage MAY be shared, dedicated or fully isolated under ADR-0028. The logical scope contract is unchanged by physical topology.

## Alternatives considered
- Store everything in Git: rejected for high-volume runtime telemetry/state.
- Store executable definitions only in DB: rejected because code review/diff/reproducible versioning becomes weaker.
- Depend on ad-hoc query filters for tenant separation: rejected because scope is part of the persistence contract.
- Couple architecture to a detailed Postgres schema now: rejected because schema is an implementation detail until runtime patterns stabilize.

## Consequences
- Clean split between definition provenance and operational evidence.
- Correlation IDs, scope IDs and version references are mandatory.
- Prediction/replanning behavior can be audited rather than reconstructed from prose.
- Storage technology and deployment topology remain replaceable behind the same logical scope contract.

## Invariants
- Every runtime execution identifies its Tenant scope and exact relevant reusable-asset revision(s).
- Retrieval-capable records do not lose their scope binding.
- Git history is never rewritten by production telemetry.
- Plan/replan history and evidence are not silently discarded.
- Global promoted definitions do not require source-tenant retrieval at runtime.

## Revisit triggers
- Another persistence model provides superior durability/querying without weakening scope enforcement or provenance.
