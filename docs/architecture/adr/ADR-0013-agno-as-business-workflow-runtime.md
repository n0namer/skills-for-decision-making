# ADR-0013: Agno as Business Workflow Runtime

- Status: **Experimental**
- Date: 2026-08-12

## Context
A code-first runtime is needed for reusable business workflows, agents, loops, conditions, routing, nested flows, tools and metrics without building all orchestration primitives from scratch.

## Decision
Agno is the initial experimental runtime for business-level reusable flows and agents. It SHALL NOT own the global Adaptive Problem Solver lifecycle or planning/replanning authority. The Task Controller and registries must remain portable to another runtime.

## Consequences
- Broad code-first workflow/tool ecosystem reduces initial custom runtime work.
- Dependency risk remains until tested on real workloads.

## Invariants
- No core solver schema may depend on Agno-only concepts unless isolated behind an adapter.

## Revisit triggers
- Spike results show lower quality, weaker connector coverage, poor durability or materially higher maintenance than mcp-agent, PydanticAI, Microsoft Agent Framework, LangGraph or another candidate.
