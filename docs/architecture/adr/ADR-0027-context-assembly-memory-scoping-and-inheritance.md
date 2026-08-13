# ADR-0027: Context Assembly, Memory Scoping and Inheritance

- Status: **Accepted**
- Date: 2026-08-14
- Last reviewed: 2026-08-14

## Context
Universal Solver needs workspace-specific memory and retrieval while reusing shared capabilities. `Context`, `Memory`, `RAG`, `Workspace` and reusable assets are different concepts and require explicit scope and precedence rules.

## Decision
`Context` SHALL be the effective, provenance-bearing input assembled for a specific Task/Run. It is not a durable store.

Durable knowledge SHALL be separated by scope:

- **Global:** explicitly shared knowledge and generalized promoted lessons;
- **Tenant:** tenant facts, preferences, policy and durable history;
- **Workspace:** documents, decisions and local retrieval indexes; child workspaces MAY consume allowed parent-workspace context;
- **Task:** goal, state, decisions, plan versions and evidence;
- **Run:** temporary working observations, artifacts and hypotheses.

Retrieval SHALL begin from an explicitly resolved scope. Tenant/workspace content SHALL NOT be searched across tenant boundaries and filtered afterward.

For a scoped Task/Run, Context Builder conceptually resolves:

`allowed global assets/knowledge + tenant context + allowed workspace ancestry/local context + task state + run observations -> effective context`.

Inheritance SHALL be resolution, not copying. Default precedence for overridable assets/configuration is:

`Global -> Tenant -> Workspace ancestry -> Workspace -> Task parameters -> Run selection`.

A lower scope MAY override an allowed default but SHALL NOT weaken mandatory higher-level security or compliance policy. Memory records retain their own scope and provenance rather than using name-based override semantics.

Execution-only connection data is not ordinary model context and is resolved separately after scope/policy checks.

## C4 mapping
- **C1:** no new software systems.
- **C2:** the Solver Control Plane owns scope/context assembly policy; scoped memory/retrieval is an explicit data-store boundary.
- **C3:** expected logical responsibilities are Scope Resolver, Context Builder, Inheritance Resolver, Namespace Resolver, Memory Retriever/Writer and Access Policy Evaluator; the canonical C3 view remains deferred until these are implemented as stable code boundaries.
- **Dynamic:** scope resolution and context assembly happen before planning/execution.

## Alternatives considered
- One shared retrieval index with metadata filtering as the primary boundary: rejected.
- Copy all inherited context into child scopes: rejected because copies drift and provenance becomes unclear.
- Make all Workspaces completely independent: rejected because controlled hierarchy inside one Tenant is useful.

## Consequences
- Context assembly becomes an explicit operation rather than ad-hoc prompt construction.
- Retrieval APIs require scope and fail closed on missing/inconsistent scope.
- Existing project-oriented context code is transitional rather than the final isolation contract.

## Invariants
- Every memory/retrieval operation has an explicit Tenant scope.
- Normal inheritance never crosses Tenant boundaries.
- Effective context retains material source provenance.
- Mandatory parent policy cannot be weakened by child override.
- Raw tenant data never becomes global merely because it is relevant.

## Revisit triggers
- Retrieval technology cannot enforce scope before search, or real workloads show the hierarchy creates material ambiguity/context pollution.
