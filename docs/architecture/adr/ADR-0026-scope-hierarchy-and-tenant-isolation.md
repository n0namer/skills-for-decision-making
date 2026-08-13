# ADR-0026: Scope Hierarchy and Tenant Isolation

- Status: **Accepted**
- Date: 2026-08-14
- Last reviewed: 2026-08-14

## Context
Universal Solver must serve individuals, teams, organizations and client work without mixing private context. A business label such as `Client` or `Project` is not a reliable security boundary: one tenant can own several projects, a person can use the solver for unrelated domains, and a client can require a dedicated deployment without changing the logical model.

The architecture therefore needs a stable scope hierarchy that is independent of folder names and deployment topology.

## Decision
The canonical logical hierarchy SHALL be:

`Global → Tenant → Workspace → Task → Run`.

The levels mean:

- **Global** — reusable system capability and explicitly promoted, non-tenant knowledge;
- **Tenant** — the hard security and ownership boundary; a tenant may represent one person, team, organization or client environment;
- **Workspace** — a hierarchical context boundary inside one tenant; workspaces MAY contain child workspaces and MAY represent a project, business area, research topic, personal domain or other durable context;
- **Task** — a durable unit of work with a goal, state, decisions, plan history and outputs;
- **Run** — one execution attempt or continuation of a Task, including temporary working state and observations.

`Client` and `Project` MAY exist as business/domain labels, but SHALL NOT replace `Tenant` or `Workspace` in access-control semantics.

A Workspace SHALL belong to exactly one Tenant. A child Workspace SHALL belong to the same Tenant as its parent. Tasks and Runs SHALL resolve to exactly one Tenant; tenant scope cannot be inferred by searching across stored content.

Every persisted tenant-originating object that can affect retrieval, execution or audit SHALL carry or be unambiguously bound to scope coordinates sufficient to resolve its owner and visibility. At minimum, scope-aware persistence SHALL be able to identify `tenant_id`; workspace/task/run identifiers are recorded when applicable.

Cross-tenant access is **deny by default**. There is no implicit fallback from one Tenant to another and no cross-tenant search namespace. Data can become globally reusable only through the controlled promotion rules in ADR-0021 and ADR-0023.

## C4 mapping
- **C1/System Context:** Tenants and Workspaces are not separate software systems. The solver is annotated as multi-tenant and context-isolated.
- **C2/Container:** scope enforcement is a responsibility of the Solver Control Plane and all scoped stores/adapters; Tenant/Workspace are not containers.
- **C3/Component (when implementation is stable):** expected logical responsibilities include Scope Resolver, Workspace Manager and Access Policy Evaluator. A canonical C3 view remains deferred until these are real code boundaries.
- **Dynamic:** every Task/Run resolves scope before retrieval, planning or tool execution.
- **Deployment:** physical isolation is orthogonal and governed by ADR-0028.

## Alternatives considered
- `Client → Project → Task → Run`: rejected because it embeds business terminology into the security model and does not fit personal/research/team use.
- `Tenant → Workspace → Project → Task → Run`: rejected as a mandatory hierarchy because `Project` would be empty ceremony for many workloads; project semantics can be represented by a Workspace or workspace metadata.
- One global context with filters: rejected because a missing filter becomes a confidentiality failure.
- Separate runtime instance as the tenant model: rejected because deployment topology should not define domain identity.

## Consequences
- Tenant becomes a non-negotiable ownership/security coordinate throughout persistence, retrieval and connectors.
- Workspace gives the product one generic hierarchical abstraction instead of proliferating `project`, `folder`, `client-space` and similar concepts.
- A tenant can move between shared and dedicated deployment without changing Task/Workspace identities.
- Existing project-oriented context files will eventually need migration or adaptation to the Workspace model.

## Invariants
- Cross-tenant retrieval or credential reuse is never an implicit operation.
- A Workspace cannot change tenant through inheritance.
- A Task/Run cannot execute before its Tenant scope is resolved.
- Global knowledge contains no raw tenant context merely because it was useful once.
- Dedicated deployment does not create a new logical scope level.

## Revisit triggers
- A concrete authorization requirement cannot be represented by Tenant + hierarchical Workspace without weakening isolation or creating pervasive special cases.
