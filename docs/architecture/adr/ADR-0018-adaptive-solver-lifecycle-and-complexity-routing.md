# ADR-0018: Adaptive Solver Lifecycle and Complexity Routing

- Status: **Accepted**
- Date: 2026-08-12
- Supersedes: ADR-0003, ADR-0005

## Context
A universal solver must adapt when evidence changes, but running a full metareasoning loop for every trivial office action wastes time and tokens.

## Decision
Every task SHALL first use the smallest sufficient execution mode:

- **L0 Action** — direct primitive/tool action;
- **L1 Known Flow** — tested reusable flow;
- **L2 Problem** — bounded plan + verification + local replanning;
- **L3 Open Problem** — explicit framing/state model/alternative strategies + repeated replanning.

For L2/L3, the normative lifecycle is:

`FRAME → MODEL → RETRIEVE → PLAN → PLAN JUDGE → EXECUTE bounded step → VERIFY → UPDATE → CONTINUE/REPLAN/STOP → FINAL JUDGE → DELIVER → LEARN`.

Execution is receding-horizon: build enough plan to choose the next useful bounded action, observe reality, then recalculate when evidence warrants it.

## Alternatives considered
- One fixed full pipeline for every task: rejected for cost/latency overhead.
- One-shot long plan: rejected because changing assumptions create strategy-survival waste.
- Pure ReAct until done: rejected because it under-specifies quality gates, stopping and reuse.

## Consequences
- Simple work stays cheap.
- Complex work gets explicit closed-loop control.
- Task mode may escalate when execution reveals hidden complexity.

## Invariants
- Review/verification is inside the loop, not only at the end.
- L0/L1 may bypass expensive planning unless risk/verification forces escalation.

## Revisit triggers
- Measured routing error or lifecycle overhead dominates quality gains for a task family.
