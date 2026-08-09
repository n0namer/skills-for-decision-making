# Local decision context

This directory is the default file-backed source of truth used by `decision-orchestrator`.

Keep real personal/company context local when this repository is public. Copy the `*.example.*` files to their runtime names and populate them in the workspace where the agent runs:

```text
.agents/context/
  projects.json       # copy from projects.example.json
  resources.json      # copy from resources.example.json
  preferences.json    # copy from preferences.example.json
  decisions.jsonl     # append-only decision/evidence log
```

The orchestrator treats missing files as empty context. It must not invent missing project/resource values.

## Data ownership

- Projects describe available work, not task lists for their own sake. Prefer goal, stage, next measurable milestone, constraints and status.
- Resources describe current constraints such as hours, budget, people, attention/energy or infrastructure.
- Preferences hold user-owned trade-off preferences. Do not silently generate MCDA weights here.
- Decisions are append-only JSON Lines records so forecasts can later be compared with outcomes and calibration can improve.

Do not commit secrets, credentials, private customer data or sensitive personal information to a public repository.
