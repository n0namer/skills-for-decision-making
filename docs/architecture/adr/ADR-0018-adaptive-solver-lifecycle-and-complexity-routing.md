# ADR-0018: Adaptive Solver Lifecycle and Complexity Routing

- Status: **Accepted**
- Date: 2026-08-12
- Last reviewed: 2026-08-13
- Supersedes: ADR-0003, ADR-0005

## Context
A universal solver must adapt when evidence changes, but running a full metareasoning loop for every trivial office action wastes time and tokens. It must also decide whether the next useful move is more reasoning, more information, or external action.

## Decision
Every task SHALL use the smallest sufficient execution mode:

- **L0 Action** — direct primitive/tool action;
- **L1 Known Flow** — tested reusable flow;
- **L2 Problem** — bounded plan + verification + local replanning;
- **L3 Open Problem** — explicit framing/state model/alternative strategies + repeated replanning.

For L2/L3, establish a structured TaskSpec/North Star before material execution: goal, current/desired state, definition of done, constraints, relevant deadline/budget, material unknowns and required output/verification.

The normative lifecycle is:

`FRAME → MODEL → RETRIEVE → META-DECIDE → PLAN → PLAN JUDGE → EXECUTE bounded step → OBSERVE → VERIFY → UPDATE → CONTINUE/REPLAN/STOP → FINAL JUDGE → DELIVER → LEARN`.

`META-DECIDE` chooses among:

- **THINK/COMPUTE** — reason, compare, simulate or calculate further;
- **OBSERVE** — acquire information, evidence or run an informative test/experiment;
- **ACT** — change the external world.

The choice SHOULD reflect expected value of further computation/information relative to time, cost, risk and deadline. Exact VOI/EVC mathematics is optional when rough bounds are sufficient; unnecessary thinking is not free.

Execution is receding-horizon: plan enough to choose the next useful bounded action, observe reality, update the model, then recalculate when evidence warrants it.

A useful iteration SHOULD either increase measurable progress toward the goal/DoD or reduce a material uncertainty. Repeated iterations that achieve neither trigger strategy change, escalation or stopping.

Stopping occurs when the DoD is satisfied, a hard constraint/budget/deadline requires it, the task is genuinely blocked, or the expected marginal value of further work is no longer worth its cost/risk.

## Three loops

- **Micro:** step → verify → retry/repair.
- **Task/MPC:** plan → act/observe → update → replan.
- **Learning:** repeated tasks → reusable pattern/failure → tested system improvement.

Legacy macro labels such as `ANALYSIS → PLANNING → EXECUTION → REVIEW → DELIVERY → RETRO` may be used for reporting but SHALL NOT replace the closed-loop runtime. `BUILD` is conditional; `IMPROVE` is an effect of feedback loops rather than a mandatory linear stage.

## Alternatives considered
- One fixed full pipeline for every task: rejected for cost/latency overhead.
- One-shot long plan: rejected because changing assumptions create strategy-survival waste.
- Pure ReAct until done: rejected because it under-specifies quality gates, stopping, reuse and metareasoning economics.

## Consequences
- Simple work stays cheap.
- Complex work gets explicit closed-loop control.
- The solver can prefer an informative observation over additional reflection.
- Task mode may escalate when execution reveals hidden complexity.

## Invariants
- Review/verification is inside the loop, not only at the end.
- L0/L1 may bypass expensive planning unless risk/verification forces escalation.
- L2/L3 have an explicit goal/DoD and stopping policy.
- Continued work must be justified by progress, information gain or risk reduction.

## Revisit triggers
- Measured routing/metareasoning overhead dominates quality gains for a task family.
