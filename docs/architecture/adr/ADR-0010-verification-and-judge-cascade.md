# ADR-0010: Verification and Judge Cascade

- Status: **Accepted**
- Date: 2026-08-12

## Context
Self-reflection without independent evidence is an unreliable correctness mechanism.

## Decision
Verification SHALL prefer the strongest low-cost independent signal: observable external result → deterministic test/invariant → source/evidence check → independent semantic judge → adversarial judge → self-reflection. Expensive judges are conditional rather than mandatory after every step.

## Consequences
- Improves reliability while controlling token cost.
- Some business outcomes remain difficult to verify automatically.

## Invariants
- Self-reflection is never the sole verifier for high-impact actions when independent checks exist.

## Revisit triggers
- Evidence shows a different verification ordering materially improves quality/cost.
