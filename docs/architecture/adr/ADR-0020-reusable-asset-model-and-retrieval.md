# ADR-0020: Reusable Asset Model and Retrieval

- Status: **Accepted**
- Date: 2026-08-12
- Supersedes: ADR-0007, ADR-0008

## Context
The system needs early flexibility from skills while progressively converting repeated behavior into deterministic, testable reusable code.

## Decision
The architecture SHALL distinguish four reusable asset types:

- **Skill** — adaptive knowledge, task semantics, strategy/failure-mode guidance and capability discovery;
- **Flow** — reusable executable strategy composed from primitives/agents/nested flows;
- **Primitive** — atomic executable capability with an input/output contract;
- **Eval** — evidence/regression asset attached to behavior (governed further by ADR-0021).

Flow and Primitive definitions SHALL be versioned/discoverable through registries with metadata sufficient for retrieval: id/version/status, task family/capabilities, schemas/dependencies, applicability and observed metrics references.

Retrieval order SHALL be: exact stable Flow → adaptable stable Flow → existing Primitives → local Skills → existing connector/tool capability → inspected external candidate → minimal new code.

## Alternatives considered
- Skills only: rejected because complex prose workflows are hard to test.
- Flows only: rejected because early-stage discovery/adaptation becomes too rigid.
- Generate every workflow from scratch: rejected because it wastes tokens and discards proven behavior.

## Consequences
- Reuse compounds over repeated business tasks.
- Registry metadata and asset lifecycles need maintenance.
- Skills remain lightweight while stable control logic moves to code.

## Invariants
- A long SKILL.md is not a tested Flow.
- Stable repeated control flow should migrate to executable code when practical.
- Registry entries reference exact versioned definitions.

## Revisit triggers
- Another asset representation achieves equivalent discovery, adaptation, testing and reuse with materially lower maintenance.
