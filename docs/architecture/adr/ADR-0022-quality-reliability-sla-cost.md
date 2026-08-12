# ADR-0022: Quality → Reliability → SLA → Cost and Solver Telemetry

- Status: **Accepted**
- Date: 2026-08-12
- Last reviewed: 2026-08-13
- Supersedes: ADR-0011

## Context
The system exists to solve business tasks better and faster than human execution while remaining economically justified. Minimizing tokens or latency directly can select unacceptable outputs, while a single blended score can hide a serious quality failure behind a cheap run.

## Decision
Strategy/Flow selection SHALL be lexicographic:

1. satisfy task-family **quality** threshold;
2. satisfy **reliability** threshold;
3. satisfy required **SLA**;
4. among remaining eligible alternatives, minimize expected monetary **cost**.

Do not use a default blended score in which low cost can compensate for failed quality/reliability/SLA.

Token usage, model/tool calls, human-intervention time and wall-clock duration are telemetry feeding these decisions, not standalone North Stars.

For L2/L3 tasks and system improvement, telemetry SHOULD make the following observable where meaningful:

- **Goal progress** — movement toward the TaskSpec/DoD;
- **Prediction error** — expected versus observed result;
- **Information gain** — reduction in decision-relevant uncertainty;
- **Iteration cost** — money/time/compute/human review consumed by the loop;
- **Strategy survival** — whether the current strategy remains valid or repeatedly needs major replan;
- **Reuse gain** — whether current work creates a reusable asset/constraint that reduces future cost or errors;
- **Human intervention minutes** — direct operational burden on people;
- task-family quality, reliability, duration and monetary cost.

Not every metric is a hard gate on every task. The point is to distinguish "made progress", "learned something valuable", "kept thinking without gain", and "improved the reusable system".

## Consequences
- Cheap low-quality flows cannot win by price.
- Quality thresholds must be explicit/evaluable per task family.
- Metareasoning and replanning can be evaluated from observable signals rather than vibes.
- Once a stable solution clears gates, the system can aggressively optimize cost.

## Invariants
- Cost never compensates for a failed quality/reliability/SLA gate unless an explicit task policy overrides the ordering.
- Telemetry dimensions remain separate enough to diagnose failure; they are not collapsed into one opaque score by default.

## Revisit triggers
- A use case explicitly requires a different priority order (for example emergency latency before quality), in which case the task policy must state it.
