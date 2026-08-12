# Adaptive Problem Solver architecture

The general user-facing entry point is `adaptive-problem-solver/SKILL.md`. Codex/Claude Code acts as the meta-orchestrator. Deterministic code/policies own critical task-state transitions, plan mutation, verification gates and promotion. `decision-orchestrator` is a specialist subsystem for formal decision analysis.

This file is the **canonical master schema**. Active ADRs define why each boundary exists; the root skill should reference this schema rather than carry a divergent copy of the architecture.

## Master schema

```text
                         TASK / NORTH STAR
                                |
                                v
                    ROOT SKILL + CODING AGENT
                                |
                        COMPLEXITY ROUTER
                 L0        L1        L2        L3
                  |         |         \        /
                  |         |          v      v
                  |         |      STATE / WORLD MODEL
                  |         |             |
                  |         |     RETRIEVE REUSABLE ASSETS
                  |         |   Skills / Flows / Primitives / Evals
                  |         |             |
                  |         |        META-DECISION
                  |         |      THINK / OBSERVE / ACT
                  |         |             |
                  |         |            PLAN
                  |         |             |
                  |         |        PLAN JUDGE
                  |         |             |
                  +---------+-----> EXECUTE BOUNDED STEP
                                        |
                                    OBSERVATION
                                        |
                         PREDICTION <-> ACTUAL RESULT
                                        |
                                     VERIFY
                                        |
                                UPDATE WORLD MODEL
                                        |
                                   REPLAN GATE
                       +----------------+----------------+
                       |                |                |
                   continue          retry/patch     rebuild/backtrack/
                                      plan           escalate/finish
                       +----------------+----------------+
                                        |
                            progress or information gain?
                                 |                 |
                                yes                no
                                 |                 |
                              continue       change strategy / stop
                                        |
                               GOAL / DoD SATISFIED
                                        |
                                    FINAL JUDGE
                                        |
                                     DELIVERY
                                        |
                                 SYSTEM LEARNING
                    +-------------------+-------------------+
                    |                   |                   |
                  Skill            Flow / Primitive       Eval
                knowledge             execution         regression
```

## Three nested loops

- **Micro loop:** step → verify → retry/repair.
- **Task/MPC loop:** plan → act/observe → update → replan.
- **Learning loop:** many tasks → repeated pattern/failure → improve Skill/Flow/Primitive/Eval/policy → test/promote.

Legacy labels such as `ANALYSIS → PLANNING → EXECUTION → REVIEW → DELIVERY → RETRO` may be used for reporting, but they are not a linear runtime state machine. `BUILD` exists only when a task requires building; improvement happens through the feedback/learning loops.

## Active ADR set

| ADR | Decision | Status |
|---|---|---|
| 0017 | Root Skill + Coding Agent Execution Model | Accepted |
| 0018 | Adaptive Solver Lifecycle + Complexity Routing | Accepted |
| 0019 | Deterministic Planning and Replanning | Accepted |
| 0020 | Reusable Asset Model and Retrieval | Accepted |
| 0021 | Verification, Eval and Promotion Lifecycle | Accepted |
| 0022 | Quality → Reliability → SLA → Cost + Solver Telemetry | Accepted |
| 0023 | Learning and Controlled Self-Modification | Accepted |
| 0024 | Persistence and Provenance | Accepted |
| 0025 | Workflow Runtime and Connector Boundary | Experimental |

ADR-0001…ADR-0016 are historical records superseded by this consolidated set.
