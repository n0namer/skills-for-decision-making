# ADR-0019: Deterministic Planning and Replanning

- Status: **Accepted**
- Date: 2026-08-12
- Last reviewed: 2026-08-13
- Supersedes: ADR-0004, ADR-0006

## Context
LLMs are useful planners but unreliable as implicit multi-step state machines. New evidence must change the plan without losing history or repeating unaffected work. Replanning is strongest when the solver can compare what it expected with what actually happened.

## Decision
The global Task Controller SHALL own allowed task/step states, dependency readiness, retries, plan-version transitions, stop conditions and replan gates through executable code/policies.

For L2/L3 tasks, `Plan` is structured/versioned data and runtime step state is stored separately. A material step SHOULD define dependencies, expected output, verifiable DoD and, when uncertainty matters, a prediction of the expected result/metric change with confidence or range.

Before expensive execution, the Plan Judge SHALL check at least:

- goal/TaskSpec and DoD coverage;
- measurable step DoD and valid dependencies;
- verification/evidence path for material claims/results;
- explicit assumptions, unknowns and critical dependencies;
- budget/SLA/risk constraints;
- reuse of applicable proven assets before new work;
- absence of obviously unnecessary work.

After a significant step, the controller/model SHALL record the observation and compare predicted versus actual result. Material prediction error triggers diagnosis: wrong model/assumption, execution failure, flow failure or environment change. Diagnosis may cause retry, retrieval of another strategy or structural replanning.

Material plan changes SHALL be explicit typed decisions: `CONTINUE`, `RETRY`, `PATCH_PLAN`, `REBUILD_PLAN`, `BACKTRACK`, `ESCALATE`, `FINISH`.

A structural replan SHALL cite typed reason + evidence. Canonical reasons include `NEW_FACT`, `NEW_CONSTRAINT`, `NEW_USER_REQUIREMENT`, `ASSUMPTION_FAILED`, `STEP_FAILED`, `QUALITY_GATE_FAILED`, `MISSING_DEPENDENCY`, `BETTER_FLOW_FOUND`, `BUDGET_RISK`, `DEADLINE_RISK` and `GOAL_CHANGED`.

Prefer `PlanPatch` to a full rebuild. A patch invalidates affected work plus transitive dependents while preserving unaffected completed results and plan history.

`ESCALATE` SHOULD also carry a typed operational cause, such as missing access, insufficient context, approval required, unknown procedure, exceptional case, external-human dependency, agent/system error, or legal/financial risk.

## Alternatives considered
- LLM silently rewrites the remaining plan: rejected because provenance and selective invalidation are lost.
- Immutable initial plan: rejected because it cannot adapt to real-world evidence.
- Rebuild every plan from scratch: rejected because valid completed work is unnecessarily discarded.

## Consequences
- Replanning becomes testable, replayable and auditable.
- Planner output must conform to structured contracts.
- Prediction error becomes a concrete trigger for model/strategy revision.
- Persistence must correlate task state with exact plan versions.

## Invariants
- LLM prose alone cannot mutate critical state.
- Every material replan has evidence/reason.
- Plan history is preserved.
- Unaffected completed work is preserved unless explicit evidence invalidates it.

## Revisit triggers
- A workflow runtime provides equivalent deterministic/versioned semantics with less custom complexity while preserving portability.
