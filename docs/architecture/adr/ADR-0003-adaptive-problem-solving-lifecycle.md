# ADR-0003: Adaptive Problem-Solving Lifecycle

- Status: **Accepted**
- Date: 2026-08-12

## Context
Linear plan-then-execute processes fail when assumptions change or new evidence appears.

## Decision
For L2/L3 tasks the normative lifecycle SHALL be FRAME → MODEL → RETRIEVE → PLAN → PLAN JUDGE → EXECUTE bounded step → VERIFY → UPDATE → REPLAN/CONTINUE/STOP → FINAL JUDGE → DELIVER → LEARN. The cycle is receding-horizon rather than a one-shot long plan.

## Consequences
- Evidence can correct strategy before all planned work is spent.
- Non-trivial tasks incur control overhead.

## Invariants
- Verification is part of execution, not only an end-stage review.
- Material new evidence may reopen planning.

## Revisit triggers
- Measured overhead outweighs error reduction for L2/L3 task classes.
