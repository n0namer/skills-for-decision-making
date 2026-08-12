# ADR-0016: Controlled Self-Modification

- Status: **Accepted**
- Date: 2026-08-12

## Context
The coding agent must be able to close system gaps during real tasks, but direct self-modification of production creates regression risk.

## Decision
The coding agent MAY create or modify skills, flows, primitives and evals when a system gap is found. Changes SHALL be isolated, tested against relevant regressions/evals, and promoted through an explicit gate before becoming stable. The current task may resume using a candidate only when policy/risk allows it.

## Consequences
- Enables rapid capability growth from real workloads.
- Missing-capability development can increase task latency.

## Invariants
- No silent direct production mutation.
- Every promoted executable change is attributable to a Git revision and eval evidence.

## Revisit triggers
- Automated changes cannot be safely isolated or evaluated in the deployment environment.
