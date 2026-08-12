# ADR-0005: Task Complexity Routing

- Status: **Accepted**
- Date: 2026-08-12

## Context
Running the full adaptive solver on every action wastes time and tokens.

## Decision
Every task SHALL be routed to the smallest sufficient mode: L0 Action, L1 Known Flow, L2 Problem, or L3 Open Problem. L0/L1 bypass expensive planning unless verification or risk requires escalation.

## Consequences
- Preserves economics and latency.
- Misclassification can under- or over-process a task.

## Invariants
- Complexity may escalate when evidence shows the current mode is insufficient.

## Revisit triggers
- Routing error becomes a major source of production failures.
