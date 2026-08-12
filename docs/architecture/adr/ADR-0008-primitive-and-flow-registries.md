# ADR-0008: Primitive and Flow Registries

- Status: **Accepted**
- Date: 2026-08-12

## Context
The planner must reuse proven capabilities instead of regenerating solutions from scratch.

## Decision
The system SHALL maintain discoverable registries for Primitives and Flows. Metadata SHOULD include identity/version, task family/capabilities, schemas, dependencies, applicability, status and observed quality/reliability/latency/cost metrics. Retrieval prefers exact stable Flow, adaptable stable Flow, then Primitives before new code.

## Consequences
- Reduces repeated reasoning/development and enables evidence-based selection.
- Requires indexing and metadata maintenance.

## Invariants
- Registry entries point to versioned executable definitions in Git.
- Production metrics do not overwrite source definitions.

## Revisit triggers
- Registry maintenance cost exceeds measured reuse gain.
