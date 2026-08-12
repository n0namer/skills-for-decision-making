# ADR-0025: Workflow Runtime and Connector Boundary

- Status: **Experimental**
- Date: 2026-08-12
- Supersedes: ADR-0013, ADR-0014

## Context
We want code-first reusable business workflows plus a large ready-made integration ecosystem, without making the universal solver depend on one framework/vendor.

## Decision
Business workflows and external connectors SHALL live behind replaceable adapter boundaries below the deterministic solver controller.

**Initial runtime hypothesis:** Agno is the first experimental business-workflow runtime for agents, conditions, loops, routing, parallelism, nested workflows, toolkits and metrics. It SHALL NOT own global Task/Plan/Replan semantics.

**Connector preference:** reliable native toolkit → MCP → external connector ecosystem (e.g. Composio) → official API/SDK → custom integration → browser automation as last resort.

Core Task/Plan/Replan/asset contracts SHALL NOT depend on Agno-specific or connector-vendor-specific concepts.

## Alternatives considered
- Build our own workflow runtime/connectors: rejected before evidence proves existing ecosystems insufficient.
- Use a visual workflow platform as the core: rejected because the target system is code-first/Git-native and coding-agent-operated.
- Couple the solver directly to Agno/Composio: rejected because replacement cost and vendor lock-in would infect core semantics.

## Consequences
- We can exploit existing integrations while keeping the solver portable.
- Adapters must normalize errors, schemas, side effects and tenant/security policy.
- Agno remains a hypothesis until representative spikes establish quality, reliability, connector coverage and maintainability.

## Invariants
- Global replanning/controller logic remains framework-neutral.
- Credentials/tenant context cannot leak across connectors.
- High-risk writes obey explicit approval policy.

## Revisit triggers
- Comparative spikes show mcp-agent, PydanticAI, Microsoft Agent Framework, LangGraph or another runtime materially outperforms Agno for our workloads.
- Connector ecosystems fail reliability/security/economics requirements.
