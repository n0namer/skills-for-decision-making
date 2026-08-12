# Architecture Decision Records

ADRs capture durable architectural choices for the Adaptive Problem Solver.

## Statuses

- **Proposed** — under discussion.
- **Experimental** — adopted for a bounded spike/pilot, not yet a durable dependency.
- **Accepted** — current architectural contract.
- **Deprecated** — still present but should not be used for new work.
- **Superseded** — replaced by a newer ADR; Git history preserves the original record.
- **Rejected** — considered and intentionally not adopted.

## Refactoring rule

An ADR should answer one durable question. If several ADRs become inseparable or duplicate the same boundary, create a new consolidated ADR and mark the older records `Superseded`; do not silently rewrite architectural history.

The active ADR set is intentionally small and orthogonal:

1. entrypoint/orchestrator responsibility;
2. adaptive solving lifecycle;
3. deterministic planning/replanning;
4. reusable asset model;
5. verification/evals/promotion;
6. optimization objective;
7. learning/self-modification;
8. persistence/provenance;
9. workflow-runtime/connector boundary.

Implementation details such as filenames, exact database tables, framework-specific APIs and function names are not ADRs unless they become architectural contracts.
