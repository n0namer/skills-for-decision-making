# ADR-0014: Connector Strategy

- Status: **Experimental**
- Date: 2026-08-12

## Context
Office/business automation depends on broad reliable access to external systems. Writing every connector would dominate implementation time.

## Decision
Connector selection SHALL prefer existing reliable capability before custom code: native framework/toolkit → MCP → external connector ecosystem such as Composio → official API/SDK → custom integration → browser automation as last resort. External capabilities are staged/inspected before trusted use.

## Consequences
- Maximizes ecosystem reuse.
- Vendor/MCP quality and security vary.

## Invariants
- Credentials and tenant context must not leak across connectors.
- High-risk writes require explicit policy/approval.

## Revisit triggers
- A connector layer is too unreliable, expensive or unable to satisfy tenant/security requirements.
