# ADR-0020: Reusable Asset Model and Retrieval

- Status: **Accepted**
- Date: 2026-08-12
- Last reviewed: 2026-08-13
- Supersedes: ADR-0007, ADR-0008

## Context
The system needs early flexibility from skills while progressively converting repeated behavior into deterministic, testable reusable code. Replanning must also be able to reuse learned strategies instead of inventing a new response after every failure.

## Decision
The architecture SHALL distinguish four reusable asset types:

- **Skill** — adaptive knowledge, task semantics, strategy/failure-mode guidance, preferred methods/flows, quality criteria and capability discovery;
- **Flow** — reusable executable strategy composed from primitives/agents/nested flows;
- **Primitive** — atomic executable capability with an input/output contract and side-effect/risk metadata;
- **Eval** — evidence/regression asset attached to behavior, governed further by ADR-0021.

Skills, Flows and Primitives SHALL be versioned/discoverable. Flow/Primitive registry metadata SHOULD include id/version/status, task family/capabilities, schemas/dependencies, applicability and references to observed metrics. Skill discovery SHOULD expose applicability, known strategies/failure modes and links to preferred/required executable assets without loading all skill bodies blindly.

Retrieval SHALL query the relevant reusable asset layers before new implementation. For executable selection, prefer: exact stable Flow → adaptable stable Flow → existing Primitives; use relevant Skills to guide task semantics, adaptation and missing-capability discovery; then existing connector/tool capability → inspected external candidate → minimal new code.

Replanning MAY re-enter retrieval and re-consult the relevant Skill(s) when new evidence invalidates the current strategy, a dependency is missing, or a better method/Flow becomes available.

## Alternatives considered
- Skills only: rejected because complex prose workflows are hard to test.
- Flows only: rejected because early-stage discovery/adaptation becomes too rigid.
- Generate every workflow from scratch: rejected because it wastes tokens and discards proven behavior.

## Consequences
- Reuse compounds over repeated business tasks.
- Skills remain the adaptive knowledge layer while stable control logic moves to code.
- Replanning can change strategy through known alternatives instead of free-form reinvention.
- Registry metadata and asset lifecycles need maintenance.

## Invariants
- A long `SKILL.md` is not a tested Flow.
- Stable repeated control flow should migrate to executable code when practical.
- Registry/discovery entries reference exact versioned definitions.
- New code is a fallback after reuse/discovery, not the default first move.

## Revisit triggers
- Another asset representation achieves equivalent discovery, adaptation, testing and reuse with materially lower maintenance.
