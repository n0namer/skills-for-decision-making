# ADR-0022: Quality → Reliability → SLA → Cost

- Status: **Accepted**
- Date: 2026-08-12
- Supersedes: ADR-0011

## Context
The system exists to solve business tasks better and faster than human execution while remaining economically justified. Minimizing tokens or latency directly can select unacceptable outputs.

## Decision
Strategy/Flow selection SHALL be lexicographic:

1. satisfy task-family **quality** threshold;
2. satisfy **reliability** threshold;
3. satisfy required **SLA**;
4. among remaining eligible alternatives, minimize expected monetary **cost**.

Token usage, model calls, human-intervention time and wall-clock duration are telemetry feeding these metrics, not standalone North Stars.

## Consequences
- Cheap low-quality flows cannot win by price.
- Quality thresholds must be explicit/evaluable per task family.
- Once a stable solution clears gates, the system can aggressively optimize cost.

## Invariants
- Cost never compensates for a failed quality/reliability/SLA gate.

## Revisit triggers
- A use case explicitly requires a different priority order (for example emergency latency before quality), in which case the task policy must state it.
