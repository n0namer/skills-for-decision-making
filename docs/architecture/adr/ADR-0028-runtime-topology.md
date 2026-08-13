# ADR-0028: Runtime Topology

- Status: **Accepted**
- Date: 2026-08-14

## Decision
Runtime topology does not alter the logical hierarchy `Tenant -> Workspace -> Task -> Run`.

The system may operate on shared infrastructure or allocate separate runtime and data infrastructure for a tenant when required. Logical identifiers and solver contracts remain unchanged when topology changes.

A runtime instance is therefore an infrastructure concern, not a domain level.
