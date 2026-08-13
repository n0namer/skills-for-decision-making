# ADR-0023: Learning and Controlled Self-Modification

- Status: **Accepted**
- Date: 2026-08-12
- Last reviewed: 2026-08-14
- Supersedes: ADR-0012, ADR-0016

## Context
The system should improve from real tasks, but an agent that silently mutates production behavior creates unbounded regression risk. In a scoped system, useful experience must also remain local until it has been shown to generalize.

## Decision
Runtime learning and system learning SHALL be separated.

- Runtime learning updates facts/state for the current task.
- System learning may update Skills, Flows, Primitives, Evals or routing/policies when evidence shows a reusable pattern or repeated failure.

System learning SHALL preserve scope. A lesson discovered in a Tenant/Workspace remains local by default. The coding agent MAY create/modify local reusable assets to close a system gap. Executable changes SHALL be isolated, attributable to an exact Git revision, tested against relevant evals/regressions and promoted through ADR-0021 before stable use.

Typical promotions:

- repeated successful ad-hoc program -> Flow candidate;
- repeated atomic operation -> Primitive candidate;
- reproducible production failure -> regression Eval and, where needed, Flow/Primitive/verifier change;
- repeated strategic lesson/failure mode -> Skill or routing/policy update.

A current-task observation SHALL NOT automatically mutate reusable system behavior. Evidence must first justify that the lesson generalizes beyond the current case.

The only normal path from local experience to Global reusable capability is:

`local evidence -> reusable candidate -> generalize -> remove local-only dependencies -> eval -> promotion decision -> versioned Global asset`.

Raw scoped memory is not promoted as a Global asset. A Global definition must work without retrieving the originating local context. Promotion provenance is retained under ADR-0024.

Reuse gain is tracked as a benefit, but improving the future system must not sacrifice the current task's required quality/risk policy.

## Alternatives considered
- Textual memory only: rejected because lessons are not executable/testable.
- Automatic production mutation: rejected because regressions are hard to contain.
- Treat every useful local lesson as globally reusable: rejected because local success does not prove generality.
- Never self-modify: rejected because every repeated problem would keep paying first-run cost.

## Consequences
- Real workload compounds into reusable system capability.
- Some useful lessons intentionally remain local.
- Global promotion becomes an explicit controlled gateway.
- First-time tasks may be slower when they expose a missing capability.

## Invariants
- No silent direct production mutation.
- Runtime facts and generalized system lessons remain distinct.
- Local experience remains local until explicit promotion.
- Global promoted assets do not depend on originating local context at runtime.

## Revisit triggers
- Automated modifications create more regressions than reuse gain or stronger promotion mechanisms become available.
