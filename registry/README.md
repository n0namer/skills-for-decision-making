# Solver asset registries

These manifests are the Git-tracked discovery index for reusable executable assets.

- `primitives.json` — atomic capabilities.
- `flows.json` — reusable executable strategies.
- `evals.json` — tests/eval suites associated with assets.

Runtime success-rate, cost and latency observations should eventually be stored in Postgres and joined with these definitions by asset id/version. Do not mutate Git manifests directly from production telemetry.

## Lifecycle

Executable assets use statuses such as `draft`, `tested`, `candidate`, `stable`, and `deprecated`. The default flow retriever selects only `stable`; candidate use must be explicit.

The first registered candidate is the existing decision orchestration subsystem. It remains `candidate` in the general Flow Registry until generic flow-level quality/reliability/SLA metrics are established.
