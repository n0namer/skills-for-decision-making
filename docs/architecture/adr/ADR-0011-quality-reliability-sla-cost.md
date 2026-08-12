# ADR-0011: Quality → Reliability → SLA → Cost

- Status: **Accepted**
- Date: 2026-08-12

## Context
Optimizing raw tokens or latency can select cheap but unacceptable outcomes.

## Decision
Flow/strategy selection SHALL be lexicographic: first satisfy quality threshold, then reliability threshold, then SLA; only among eligible choices minimize expected monetary cost. Token usage is telemetry contributing to cost, not the primary objective.

## Consequences
- Aligns optimization with business value.
- Requires explicit quality/reliability definitions per task family.

## Invariants
- A cheaper candidate cannot compensate for failing quality/reliability/SLA gates.

## Revisit triggers
- Business use cases require a different explicit priority order.
