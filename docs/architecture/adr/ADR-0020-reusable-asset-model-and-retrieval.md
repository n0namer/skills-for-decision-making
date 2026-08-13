# ADR-0020: Reusable Asset Model and Retrieval

- Status: **Accepted**
- Date: 2026-08-12
- Last reviewed: 2026-08-14
- Supersedes: ADR-0007, ADR-0008

## Context
The system needs early flexibility from skills while progressively converting repeated behavior into deterministic, testable reusable code. Replanning must also reuse learned strategies instead of inventing a new response after every failure. With multi-tenant/workspace operation, reusable assets also need explicit ownership and inheritance rules.

## Decision
The architecture SHALL distinguish four reusable asset types:

- **Skill** — adaptive knowledge, task semantics, strategy/failure-mode guidance, preferred methods/flows, quality criteria and capability discovery;
- **Flow** — reusable executable strategy composed from primitives/agents/nested flows;
- **Primitive** — atomic executable capability with an input/output contract and side-effect/risk metadata;
- **Eval** — evidence/regression asset attached to behavior, governed further by ADR-0021.

Skills, Flows and Primitives SHALL be versioned/discoverable. Flow/Primitive registry metadata SHOULD include id/version/status, task family/capabilities, schemas/dependencies, applicability, scope and references to observed metrics. Skill discovery SHOULD expose applicability, known strategies/failure modes and links to preferred/required executable assets without loading all skill bodies blindly.

Reusable assets MAY exist in a **Global**, **Tenant** or **Workspace** catalog. Global assets are shared platform capabilities. Tenant/Workspace assets remain local to their scope unless explicitly promoted under ADR-0021/ADR-0023.

Asset resolution SHALL follow the scope model in ADR-0026 and context rules in ADR-0027. Conceptually, permitted definitions resolve from `Global -> Tenant -> Workspace ancestry -> Workspace`, after which Task/Run parameters select/configure the effective asset. Resolution SHALL reference versions rather than copy inherited definitions into every child scope.

A more-local asset MAY override an allowed parent default or pin another permitted version, but cannot weaken mandatory higher-level policy. Same-name assets from another Tenant are never candidates.

Retrieval SHALL query relevant reusable asset layers before new implementation. For executable selection, prefer: exact stable Flow -> adaptable stable Flow -> existing Primitives; use relevant Skills to guide task semantics, adaptation and missing-capability discovery; then existing connector/tool capability -> inspected external candidate -> minimal new code.

Replanning MAY re-enter retrieval and re-consult relevant Skill(s) when new evidence invalidates the current strategy, a dependency is missing, or a better method/Flow becomes available.

## Alternatives considered
- Skills only: rejected because complex prose workflows are hard to test.
- Flows only: rejected because early-stage discovery/adaptation becomes too rigid.
- One shared catalog containing tenant-specific assets: rejected because reuse must not bypass tenant boundaries.
- Copy inherited assets into each workspace: rejected because versions drift and provenance becomes unclear.
- Generate every workflow from scratch: rejected because it wastes tokens and discards proven behavior.

## Consequences
- Reuse compounds over repeated business tasks without making all local experience globally visible.
- Skills remain the adaptive knowledge layer while stable control logic moves to code.
- Tenant/Workspace customization can coexist with a common platform catalog.
- Registry metadata and asset lifecycles need scope/provenance fields and resolution tests.

## Invariants
- A long `SKILL.md` is not a tested Flow.
- Stable repeated control flow should migrate to executable code when practical.
- Registry/discovery entries reference exact versioned definitions and their scope.
- Cross-tenant asset reuse occurs only through explicit promotion to Global scope.
- New code is a fallback after reuse/discovery, not the default first move.

## Revisit triggers
- Another asset representation achieves equivalent discovery, scoped inheritance, adaptation, testing and reuse with materially lower maintenance.
