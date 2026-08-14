# ADR-0021: Verification, Eval and Promotion Lifecycle

- Status: **Accepted**
- Date: 2026-08-12
- Last reviewed: 2026-08-13
- Supersedes: ADR-0009, ADR-0010

## Context
A self-correcting solver is only as good as its verifier. LLM self-reflection alone is insufficient, and reusable assets need regression evidence before they can be trusted repeatedly.

## Decision
Verification SHALL prefer the strongest independent low-cost signal available:

1. observable external result;
2. deterministic test/invariant;
3. source/evidence check;
4. independent semantic judge;
5. adversarial judge;
6. self-reflection.

Evals SHALL be first-class reusable assets, including deterministic tests, golden cases, production regressions and semantic/adversarial cases when needed.

New/materially changed executable assets SHALL pass an explicit promotion lifecycle such as `draft → tested → candidate → stable → deprecated`. Expensive multi-judge evaluation is used for candidate creation/change/high-risk execution, not blindly on every stable run.

A new/materially changed Flow SHOULD be evaluated on a representative corpus against the current stable incumbent when one exists. Promotion requires passing quality/reliability/SLA gates and avoiding material regression on existing applicability; a candidate does not win merely because it is cheaper.

Where the product claim is materially "better than a human" and quality is subjective/high-value, evaluation SHOULD include a human/reference baseline or blind pairwise comparison where feasible. Semantic judges SHOULD themselves be periodically checked against human acceptance rather than treated as unquestioned ground truth.

Reproducible production failures SHOULD become regression cases.

## Alternatives considered
- Self-reflection only: rejected because models can reinforce their own error.
- Human verification of every step: rejected because it defeats autonomous economics.
- Full judge ensemble after every operation: rejected because cost/latency are excessive.

## Consequences
- Production failures become executable knowledge.
- Semantic quality can be regression-tested.
- Candidate improvements are compared against an incumbent rather than evaluated in isolation.
- Verification policy can spend more only when cheaper evidence is insufficient.

## Invariants
- One successful run is insufficient for stable promotion.
- High-impact actions use independent verification where available.
- Promotion requires relevant regressions to pass.
- Cheaper output does not compensate for failed quality/reliability/SLA gates.

## Revisit triggers
- Eval results cease to predict production acceptance/reliability or a stronger automated verifier becomes available.
