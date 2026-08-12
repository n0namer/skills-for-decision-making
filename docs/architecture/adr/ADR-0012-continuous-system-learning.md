# ADR-0012: Continuous System Learning

- Status: **Accepted**
- Date: 2026-08-12

## Context
The system should improve from repeated tasks without relying on model-weight updates or vague textual memory.

## Decision
Learning SHALL update reusable assets based on evidence: repeated success may create/promote a Flow or Primitive; repeated strategic lessons may update a Skill/routing rule; failures may update verifier logic and regression Evals. Runtime facts remain separate from system-level learning.

## Consequences
- Future tasks become cheaper and more reliable.
- Generalization criteria are required.

## Invariants
- Learning changes executable behavior only through the controlled promotion lifecycle.

## Revisit triggers
- Automated learning produces more regressions than reuse gains.
