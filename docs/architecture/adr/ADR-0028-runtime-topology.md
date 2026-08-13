# ADR-0028: Runtime Topology

- Status: **Accepted**
- Date: 2026-08-14

## Context
The solver must support multiple runtime instances without turning deployment topology into a new domain hierarchy or duplicating reusable capabilities per instance.

## Decision
Runtime topology does not alter the logical hierarchy `Tenant -> Workspace -> Task -> Run`.

The system MAY run one or many Solver Instances. Instances MAY serve one or more Tenants according to deployment configuration. A dedicated instance is therefore an infrastructure choice, not a new domain scope.

Multiple instances MAY consume the same **Global reusable assets**: Skills, Flows, Primitives and Evals. For the initial architecture, these shared definitions are distributed from Git as exact revisions/tags/bundles and may be checked out or cached locally by each instance.

Tenant/Workspace memory, RAG, files and operational state remain scoped under ADR-0026/ADR-0027 regardless of which Global asset revision an instance uses. Sharing a Global Flow between instances does not imply sharing Tenant context.

The MVP SHALL NOT require separate services for capability registry, promotion, fleet management or tenant placement. Version rollout MAY be expressed through deployment configuration/environment variables plus exact Git revisions. Promotion MAY use the existing review path `candidate -> PR -> tests/evals -> merge -> new revision`.

Conceptually:

`Git Global Assets -> Solver Instance 1..N -> scoped Tenant/Workspace data`

Logical identifiers and solver contracts remain unchanged if a Tenant later moves from shared infrastructure to a dedicated instance or isolated stack.

## Alternatives considered
- Copy/fork Global assets independently into every instance: rejected because capability versions would drift.
- Central synchronous registry lookup during ordinary execution: rejected for the MVP because it adds an unnecessary shared runtime dependency.
- Build a fleet manager and deployment registry now: rejected under YAGNI; static/configured placement is sufficient until operations prove otherwise.

## Invariants
- Instance is not part of `Tenant -> Workspace -> Task -> Run`.
- Every instance executes against an identifiable Global asset revision/bundle.
- Global asset sharing never grants cross-Tenant context access.
- Adding a dedicated instance does not require changing Task/Workspace/Tenant semantics.

## Revisit triggers
- Instance count or rollout frequency makes configured placement/version pinning operationally unsafe.
- Git-based asset distribution becomes a measurable bottleneck.
- Dynamic tenant migration or independent fleet control becomes a real requirement.
