# ADR-0007: Skill / Flow / Primitive Separation

- Status: **Accepted**
- Date: 2026-08-12

## Context
Skills provide flexible knowledge but long prose workflows are unreliable; executable flows need reuse; atomic actions need stable contracts.

## Decision
The architecture SHALL distinguish: Skill = adaptive knowledge/discovery guidance; Flow = reusable executable strategy; Primitive = atomic executable capability. Stable repeated control flow SHOULD migrate from prose into tested Flow code. Skills may reference flows/primitives and include bounded helper scripts.

## Consequences
- Combines early flexibility with later determinism.
- Requires discipline to prevent drift between guidance and executable behavior.

## Invariants
- A long SKILL.md is not considered a tested workflow.
- Critical branching/retry logic belongs in executable assets when practical.

## Revisit triggers
- A simpler representation retains equivalent flexibility, testing and reuse.
