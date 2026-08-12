# ADR-0009: Eval Registry and Reliability Lifecycle

- Status: **Accepted**
- Date: 2026-08-12

## Context
Reusable code is only valuable if changes can be tested against known behavior and production failures.

## Decision
Evals SHALL be first-class assets. The Eval Registry SHALL contain deterministic tests plus representative golden/regression/adversarial cases as appropriate. New or modified executable assets move through draft/tested/candidate/stable-style promotion gates. Reproducible production failures SHOULD become regression cases.

## Consequences
- Failures become durable executable knowledge.
- Semantic evals can be costly/noisy.

## Invariants
- Promotion requires passing relevant regressions.
- A single successful run is insufficient evidence for stable promotion.

## Revisit triggers
- Eval suites become stale or fail to predict production quality.
