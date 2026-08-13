# Architecture Decision Records

ADRs capture durable architectural choices for the Adaptive Problem Solver. `../README.md` is the canonical architecture view set; active ADRs explain the boundaries and invariants behind it.

Statuses: **Proposed**, **Experimental**, **Accepted**, **Deprecated**, **Superseded**, **Rejected**.

## Active ADRs

- ADR-0017 — Root Skill and Coding Agent Execution Model
- ADR-0018 — Adaptive Solver Lifecycle and Complexity Routing
- ADR-0019 — Deterministic Planning and Replanning
- ADR-0020 — Reusable Asset Model and Retrieval
- ADR-0021 — Verification, Eval and Promotion Lifecycle
- ADR-0022 — Quality → Reliability → SLA → Cost and Solver Telemetry
- ADR-0023 — Learning and Controlled Self-Modification
- ADR-0024 — Persistence and Provenance
- ADR-0025 — Workflow Runtime and Connector Boundary
- ADR-0026 — Scope Hierarchy and Tenant Isolation
- ADR-0027 — Context Assembly, Memory Scoping and Inheritance
- ADR-0028 — Runtime Topology

ADR-0001…ADR-0016 remain as historical `Superseded` records.

Create a new ADR only for a genuinely new architectural boundary or an incompatible decision. Clarifications that preserve the same boundary should update the active ADR and record `Last reviewed` rather than proliferating documents.

## Scope architecture rule

The canonical logical hierarchy is `Global → Tenant → Workspace → Task → Run`.

- Tenant is the ownership/security boundary.
- Workspace is the hierarchical context boundary.
- Task is the durable unit of work.
- Run is an execution attempt/continuation.
- Runtime topology is independent from this hierarchy.
- Local experience becomes Global reusable capability only through controlled promotion.
