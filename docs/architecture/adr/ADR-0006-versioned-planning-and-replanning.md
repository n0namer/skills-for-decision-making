# ADR-0006: Versioned Planning and Replanning

- Status: **Accepted**
- Date: 2026-08-12

## Context
Plans must change when observations invalidate assumptions, but silent rewrites destroy auditability and can repeat work.

## Decision
Plans SHALL be structured, versioned data. Material changes SHALL use an evidence-backed replan decision and preferably a PlanPatch. Allowed outcomes are CONTINUE, RETRY, PATCH_PLAN, REBUILD_PLAN, BACKTRACK, ESCALATE and FINISH. Replan reasons SHALL be typed.

## Consequences
- Preserves history and enables selective invalidation.
- Requires plan/state persistence.

## Invariants
- Every replan cites evidence and reason.
- Completed results are invalidated only through explicit dependency/evidence logic.

## Revisit triggers
- Patch semantics prove more complex than safe full rebuilds for most tasks.
