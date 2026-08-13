# Adaptive Problem Solver architecture

The general user-facing entry point is `adaptive-problem-solver/SKILL.md`. Codex/Claude Code acts as the meta-orchestrator. Deterministic code/policies own critical task-state transitions, plan mutation, verification gates and promotion. `decision-orchestrator` is a specialist subsystem for formal decision analysis.

This file is the **canonical architecture view set**. Active ADRs define why each boundary exists. Mermaid diagrams are projections of those decisions; they do not replace the ADR text.

## C4 view discipline

We use C4 principles plus supplementary dynamic/policy views:

- **System Context** shows the solver as one software system and its external actors/systems.
- **Container** shows the major runtime/data-store boundaries inside the solver.
- **Dynamic** shows how one task moves through planning, execution, verification and replanning.
- **Asset/Learning** shows the lifecycle of reusable capabilities and controlled self-modification.
- **Trust/Deployment** shows external capability acquisition, connector boundaries and security controls.
- **Selection Policy** is a supplementary non-C4 policy view for quality/reliability/SLA/cost and telemetry.

Do not mix implementation-level classes/functions into Context or Container views. Do not encode rationale in diagrams; rationale remains in ADRs. A Component view is intentionally deferred until the control-plane implementation is stable enough that component boundaries are real rather than speculative.

## View 1 — C4 System Context

```mermaid
flowchart LR
    USER["Person: User / Operator"]
    APS["Software System: Adaptive Problem Solver"]
    BIZ["External Systems: Business apps and data sources"]
    CAPS["External Capability Sources: MCP, skill repositories, APIs"]

    USER -->|"task, goal, constraints"| APS
    APS -->|"read / act through governed adapters"| BIZ
    APS -->|"discover candidate capabilities"| CAPS
```

Primary ADR coverage: **ADR-0017, ADR-0025**.

## View 2 — C4 Container View

```mermaid
flowchart TB
    subgraph APS["Adaptive Problem Solver"]
        HOST["Container: Agent Host\nCodex / Claude + Root Skill"]
        CTRL["Container: Solver Control Plane\nTask Controller / Planner / Replanner / Verifier"]
        ASSETS["Container: Reusable Asset Layer\nSkills incl. decision-orchestrator / Flows / Primitives / Evals"]
        RUNTIME["Container: Workflow Runtime Adapter\nAgno hypothesis / replaceable runtime"]
        CONNECT["Container: Connector Adapter Layer\nNative / MCP / connector ecosystem / API"]
        GIT[("Data Store: Git\nversioned definitions / ADRs / policies")]
        DB[("Data Store: Operational DB\ntask state / plans / evidence / telemetry")]
    end

    EXT["External business systems"]

    HOST -->|"interprets root skill; proposes plans / adaptations"| CTRL
    CTRL -->|"retrieves / selects reusable assets"| ASSETS
    ASSETS -->|"definitions and exact versions"| GIT
    CTRL -->|"state, provenance, observations, metrics"| DB
    GIT -.->|"exact revision references"| DB
    CTRL -->|"executes bounded flows"| RUNTIME
    RUNTIME -->|"invokes capabilities through"| CONNECT
    CONNECT -->|"read / write"| EXT
```

Primary ADR coverage: **ADR-0017, ADR-0019, ADR-0020, ADR-0024, ADR-0025**.

## View 3 — Dynamic Runtime / Replanning View

```mermaid
flowchart TD
    T["Task / North Star / DoD"] --> ROUTE{"Complexity Router"}

    ROUTE -->|"L0 Action"| L0["Execute Direct Primitive / Tool"]
    ROUTE -->|"L1 Known Flow"| L1["Execute Stable Reusable Flow"]
    ROUTE -->|"L2 / L3"| MODEL["State / World Model"]

    L0 --> QUICK["Lightweight Verification as Required"]
    L1 --> QUICK
    QUICK --> QUICKDONE{"DoD satisfied?"}
    QUICKDONE -->|"yes"| DELIVERY["Delivery"]
    QUICKDONE -->|"no / hidden complexity"| MODEL

    MODEL --> RETRIEVE["Retrieve Skills / Flows / Primitives / Evals"]
    RETRIEVE --> META{"Meta-decision\nTHINK / OBSERVE / ACT"}
    META --> PLAN["Versioned Short-Horizon Plan"]
    PLAN --> PJ{"Plan Judge"}
    PJ -->|"repair"| PLAN
    PJ -->|"pass"| EXEC["Execute One Bounded Step"]

    EXEC --> OBS["Observation"]
    OBS --> PRED["Prediction vs Actual\nPrediction Error"]
    PRED --> VERIFY["Verification Cascade\nExternal result -> deterministic -> source -> semantic -> adversarial -> reflection"]
    VERIFY --> UPDATE["Update World Model / Task State"]
    UPDATE --> GAIN{"Goal progress, information gain\nor risk reduction?"}

    GAIN -->|"yes"| REPLAN{"Replan Gate"}
    GAIN -->|"no"| STRATEGY{"Change strategy, escalate or stop?"}
    STRATEGY -->|"change strategy"| RETRIEVE
    STRATEGY -->|"escalate"| ESC["Human / Approval / Blocker"]
    STRATEGY -->|"stop"| STOP["Stop with reason / evidence"]

    REPLAN -->|"continue"| EXEC
    REPLAN -->|"retry"| EXEC
    REPLAN -->|"patch plan"| PLAN
    REPLAN -->|"rebuild / backtrack"| RETRIEVE
    REPLAN -->|"escalate"| ESC
    REPLAN -->|"finish"| DOD{"Goal / DoD satisfied?"}

    DOD -->|"no"| RETRIEVE
    DOD -->|"yes"| FINAL["Final Judge"]
    FINAL --> DELIVERY
    DELIVERY --> LEARN["System Learning Signal"]
```

Primary ADR coverage: **ADR-0018, ADR-0019, ADR-0020, ADR-0021, ADR-0022**.

## View 4 — Reusable Asset and Learning Lifecycle

```mermaid
flowchart LR
    EXPERIENCE["Task / Production Experience"] --> KIND{"Reusable signal?"}

    KIND -->|"repeated successful pattern"| PATTERN["Flow / Primitive Pattern"]
    KIND -->|"reproducible failure"| FAILURE["Regression / Failure Signal"]
    KIND -->|"repeated strategy / failure-mode lesson"| LESSON["Skill / Routing Lesson"]

    PATTERN --> AGENT["Coding Agent Proposes Change"]
    FAILURE --> AGENT
    LESSON --> AGENT

    AGENT --> ISOLATE["Isolate Candidate Change"]
    ISOLATE --> CAND["Candidate Skill / Flow / Primitive / Eval"]
    CAND --> TEST["Tests + Golden / Regression / Semantic Evals"]

    TEST --> INC{"Pass gates and avoid regression\nvs stable incumbent?"}
    INC -->|"no"| REPAIR["Repair / Reject / Keep Experimental"]
    REPAIR --> ISOLATE
    INC -->|"yes"| STABLE["Promote to Stable Reusable Asset"]
    STABLE --> GIT[("Git: exact version / provenance")]
```

Primary ADR coverage: **ADR-0020, ADR-0021, ADR-0023, ADR-0024**.

## View 5 — Trust / Deployment Boundary

```mermaid
flowchart LR
    SRC["Untrusted Sources\nExternal skills / MCP / web / tool outputs"]
    STAGE["Stage"]
    AUDIT["Inspect / Audit"]
    SANDBOX["Sandbox / Test / Eval"]
    PIN["Pin Exact Source / Version"]
    TRUST["Explicitly Trusted Capability"]
    ADAPTER["Runtime / Connector Adapter Boundary"]
    EXT["External Business System"]

    SRC --> STAGE --> AUDIT --> SANDBOX --> PIN --> TRUST --> ADAPTER --> EXT

    POLICY["Security Policy\nTenant isolation / credential scope / least privilege / approvals"] --> ADAPTER
    DATA["External content is data/evidence,\nnot trusted control instructions"] --> AUDIT
```

Primary ADR coverage: **ADR-0024, ADR-0025**.

## View 6 — Strategy Selection and Solver Telemetry Policy

This is a supplementary architecture policy view, not a C4 structural level.

```mermaid
flowchart LR
    C["Candidate Strategies / Flows"] --> Q{"Quality threshold?"}
    Q -->|"no"| REJECT["Reject"]
    Q -->|"yes"| R{"Reliability threshold?"}
    R -->|"no"| REJECT
    R -->|"yes"| S{"SLA satisfied?"}
    S -->|"no"| REJECT
    S -->|"yes"| COST["Choose minimum expected cost\namong eligible candidates"]
    COST --> RUN["Execute / Promote"]
    RUN --> TELEMETRY["Telemetry\nGoal progress / Prediction error / Information gain / Iteration cost / Strategy survival / Reuse gain / Human intervention"]
```

Primary ADR coverage: **ADR-0021, ADR-0022, ADR-0023**.

## ADR → Architecture View Traceability

Every active ADR must either be visible in at least one canonical Mermaid view or be explicitly marked as a non-visual policy. At present, all active ADRs have a visual projection.

| ADR | Context | Container | Dynamic | Learning | Trust | Policy | Coverage |
|---|---:|---:|---:|---:|---:|---:|---|
| **0017 Root Skill + Coding Agent** | ✅ | ✅ |  |  |  |  | Covered |
| **0018 Lifecycle + Complexity Routing** |  |  | ✅ |  |  |  | Covered |
| **0019 Deterministic Planning + Replanning** |  | ✅ | ✅ |  |  |  | Covered |
| **0020 Reusable Asset Model + Retrieval** |  | ✅ | ✅ | ✅ |  |  | Covered |
| **0021 Verification / Eval / Promotion** |  |  | ✅ | ✅ |  | ✅ | Covered |
| **0022 Quality → Reliability → SLA → Cost + Telemetry** |  |  | ✅ |  |  | ✅ | Covered |
| **0023 Learning + Controlled Self-Modification** |  |  |  | ✅ |  | ✅ | Covered |
| **0024 Persistence + Provenance** |  | ✅ |  | ✅ | ✅ |  | Covered |
| **0025 Runtime + Connector Boundary** | ✅ | ✅ |  |  | ✅ |  | Covered |

## Architecture consistency rule

When an Accepted/Experimental ADR changes:

1. identify which canonical view(s) it affects;
2. update those Mermaid views in the same architecture change;
3. update this traceability matrix;
4. if no diagram should change, explicitly state that the ADR is policy-only and why;
5. do not create a new diagram merely to duplicate ADR prose.

ADR-0001…ADR-0016 are historical records superseded by the active ADR set.
