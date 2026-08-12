# ADR-0019: Deterministic Planning and Replanning

- Status: **Accepted**
- Date: 2026-08-12
- Supersedes: ADR-0004, ADR-0006

## Context
LLMs are useful planners but unreliable as implicit multi-step state machines. New evidence must change the plan without losing history or repeating unaffected work.

## Decision
The global Task Controller SHALL own allowed task/step states, dependency readiness, retries, plan-version transitions, stop conditions and replan gates through executable code/policies.

For L2/L3 tasks, `Plan` is structured/versioned data and runtime step state is stored separately. Material plan changes SHALL be explicit typed decisions: `CONTINUE`, `RETRY`, `PATCH_PLAN`, `REBUILD_PLAN`, `BACKTRACK`, `ESCALATE`, `FINISH`.

A structural replan SHALL cite typed reason + evidence. Prefer `PlanPatch` to a full rebuild. A patch invalidates affected work plus transitive dependents, while preserving unaffected completed results.

## Alternatives considered
- LLM silently rewrites the remaining plan: rejected because provenance and selective invalidation are lost.
- Immutable initial plan: rejected because it cannot adapt to real-world evidence.
- Rebuild every plan from scratch: rejected because valid completed work is unnecessarily discarded.

## Consequences
- Replanning becomes testable, replayable and auditable.
- Planner output must conform to structured contracts.
- Persistence must correlate task state with exact plan versions.

## Invariants
- LLM prose alone cannot mutate critical state.
- Every material replan has evidence/reason.
- Plan history is preserved.

## Revisit triggers
- A workflow runtime provides equivalent deterministic/versioned semantics with less custom complexity while preserving portability.
