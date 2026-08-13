# Adaptive Problem Solver architecture

The general user-facing entry point is `adaptive-problem-solver/SKILL.md`. The agent host acts as the meta-orchestrator. Deterministic policies own critical task-state transitions, plan mutation, verification gates, scope resolution and promotion.

This file is the **canonical architecture view set**. Active ADRs define why each boundary exists. Diagrams are projections of those decisions.

## North Star

**Tenant-specific context stays inside its Tenant boundary, while multiple Solver Instances can reuse the same reviewed Global capabilities and generalized useful experience has a controlled path to become shared system capability.**

Canonical logical scope:

`Global → Tenant → Workspace → Task → Run`

- **Tenant** — hard ownership boundary.
- **Workspace** — hierarchical context boundary; may represent a project, business area, research topic or personal domain.
- **Task** — durable unit of work.
- **Run** — execution attempt or continuation.
- Solver Instance is deployment topology, not a level in this hierarchy.

## C4 view discipline

- **C1 System Context:** solver plus external actors/systems.
- **C2 Container:** actual major runtime and data-store boundaries; do not invent services for logical libraries.
- **Dynamic:** scoped context assembly, planning, execution, verification and replanning.
- **Learning:** local reusable assets and controlled Global promotion.
- **Deployment:** physical mappings of the same logical scope model and versioned Global asset distribution.
- **Policy:** quality/reliability/SLA/cost selection and telemetry.

Tenant and Workspace are domain scopes, not C4 containers. A canonical C3 diagram remains deferred until component boundaries exist in code; ADR-0026/0027 define the target component responsibilities meanwhile.

## View 1 — C4 System Context

```mermaid
flowchart LR
    USER["Person: User / Operator"]
    APS["Software System: Adaptive Problem Solver\nMulti-tenant, workspace-scoped"]
    BIZ["External Systems: Business apps and data sources"]
    CAPS["External Capability Sources"]

    USER -->|"task, goal, constraints"| APS
    APS -->|"read / act through adapters"| BIZ
    APS -->|"discover candidate capabilities"| CAPS
```

Tenant/Workspace boundaries are internal properties of APS, not additional C1 systems.

Primary ADR coverage: **ADR-0017, ADR-0025, ADR-0026, ADR-0027**.

## View 2 — C4 Container View

```mermaid
flowchart TB
    subgraph APS["Adaptive Problem Solver"]
        HOST["Container: Agent Host\nRoot Skill + agent runtime"]
        CTRL["Container: Solver Control Plane\nTask Controller / Planner / Replanner / Verifier\nScope resolution + context policy"]
        RUNTIME["Container: Workflow Runtime Adapter"]
        CONNECT["Container: Connector Adapter Layer"]
        GIT[("Data Store: Git\nGlobal reusable definitions / ADRs / policies")]
        DB[("Data Store: Operational DB\nscoped task state / plans / evidence / telemetry")]
        MEM[("Data Store: Scoped Memory / Retrieval\nTenant / Workspace / Task knowledge")]
    end

    EXT["External business systems"]

    HOST --> CTRL
    CTRL -->|"resolve allowed exact-version assets"| GIT
    CTRL -->|"retrieve inside resolved scope"| MEM
    CTRL -->|"scope, state, provenance, observations"| DB
    GIT -.->|"exact revision references"| DB
    CTRL -->|"bounded flow + resolved scope"| RUNTIME
    RUNTIME --> CONNECT
    CONNECT --> EXT
```

The **Reusable Asset Layer is a logical library/resolution responsibility, not a separate network service in the MVP**. Global Skills/Flows/Primitives/Evals come from an exact Git revision/tag/bundle and may be checked out or cached with the Solver deployment. Likewise, the Context Builder remains a Control Plane responsibility. Split either only when an independent deployment/scaling need becomes real.

Primary ADR coverage: **ADR-0017, ADR-0019, ADR-0020, ADR-0024, ADR-0025, ADR-0026, ADR-0027**.

## C3 status — contracts before boxes

Expected responsibilities once component boundaries stabilize:

| Responsibility | Contract |
|---|---|
| Scope Resolver | Resolve one Tenant plus applicable Workspace/Task/Run coordinates before retrieval or execution. |
| Workspace Manager | Maintain same-Tenant workspace hierarchy and local configuration. |
| Context Builder | Assemble effective context only from allowed sources and preserve provenance. |
| Inheritance Resolver | Resolve Global → Tenant → Workspace ancestry → local overrides without copying definitions. |
| Policy Evaluator | Enforce mandatory higher-level rules and invalid-scope rejection. |
| Namespace Resolver | Map logical scope to the correct memory/retrieval partition. |
| Memory Retriever/Writer | Read/write durable knowledge within resolved scope. |

When these become stable modules/services, add the canonical C3 diagram and link boxes to implementation paths.

## View 3 — Dynamic Runtime / Replanning View

```mermaid
flowchart TD
    T["Task / North Star / DoD"] --> SCOPE["Resolve Tenant / Workspace / Task / Run"]
    SCOPE --> CTX["Build Effective Context\nGlobal allowed + Tenant + Workspace + Task + Run"]
    CTX --> ROUTE{"Complexity Router"}

    ROUTE -->|"L0"| L0["Direct Primitive / Tool"]
    ROUTE -->|"L1"| L1["Stable Reusable Flow"]
    ROUTE -->|"L2 / L3"| MODEL["State / World Model"]

    L0 --> VERIFY0["Lightweight Verification"]
    L1 --> VERIFY0
    VERIFY0 --> FAST{"DoD satisfied?"}
    FAST -->|"yes"| DELIVERY["Delivery"]
    FAST -->|"no"| MODEL

    MODEL --> RETRIEVE["Retrieve Allowed Skills / Flows / Primitives / Evals"]
    RETRIEVE --> META{"Meta-decision\nTHINK / OBSERVE / ACT"}
    META --> PLAN["Versioned Short-Horizon Plan"]
    PLAN --> PJ{"Plan Judge"}
    PJ -->|"repair"| PLAN
    PJ -->|"pass"| EXEC["Execute One Bounded Step"]

    EXEC --> OBS["Observation"]
    OBS --> VERIFY["Verification Cascade"]
    VERIFY --> UPDATE["Update Scoped World Model / Task State"]
    UPDATE --> REPLAN{"Replan Gate"}

    REPLAN -->|"continue / retry"| EXEC
    REPLAN -->|"patch plan"| PLAN
    REPLAN -->|"rebuild / backtrack"| RETRIEVE
    REPLAN -->|"escalate"| ESC["Human / Approval / Blocker"]
    REPLAN -->|"finish"| DOD{"Goal / DoD satisfied?"}

    DOD -->|"no"| RETRIEVE
    DOD -->|"yes"| FINAL["Final Judge"]
    FINAL --> DELIVERY
    DELIVERY --> LEARN["Scoped Learning Signal"]
```

Scope is resolved before retrieval. Replanning remains continuous after bounded steps without widening that scope.

Primary ADR coverage: **ADR-0018, ADR-0019, ADR-0020, ADR-0021, ADR-0022, ADR-0026, ADR-0027**.

## View 4 — Scoped Asset and Learning Lifecycle

```mermaid
flowchart LR
    EXPERIENCE["Tenant / Workspace Experience"] --> LOCAL["Scoped Candidate\nSkill / Flow / Primitive / Eval"]
    LOCAL --> TEST["Local Tests / Evals"]
    TEST --> LOCALOK{"Stable locally?"}
    LOCALOK -->|"no"| LOCAL
    LOCALOK -->|"yes"| LSTABLE["Stable Local Asset"]

    LSTABLE --> GENERAL["Generalize\nRemove local-only dependencies"]
    GENERAL --> PR["PR: Global candidate"]
    PR --> GEVAL["Review + Representative Evals"]
    GEVAL --> GLOBALOK{"Pass Global gates?"}
    GLOBALOK -->|"no"| LSTABLE
    GLOBALOK -->|"yes"| MERGE["Merge"]
    MERGE --> GSTABLE["New Global Git revision / tag"]
```

For the MVP, the promotion mechanism is deliberately ordinary Git workflow: **candidate change → PR → review/tests/evals → merge → new Global revision**. No Promotion Service is required. Local stability and Global visibility remain separate decisions, and raw scoped memory has no direct Global promotion path.

Primary ADR coverage: **ADR-0020, ADR-0021, ADR-0023, ADR-0024, ADR-0026, ADR-0027**.

## View 5 — External Capability Boundary

```mermaid
flowchart LR
    SRC["External Capability Source"] --> STAGE["Stage"]
    STAGE --> REVIEW["Review"]
    REVIEW --> EVAL["Test / Eval"]
    EVAL --> PIN["Pin Exact Version"]
    PIN --> ADAPTER["Runtime / Connector Adapter"]
    ADAPTER --> EXT["External Business System"]

    SCOPE["Resolved Tenant / Workspace Scope"] --> ADAPTER
```

Primary ADR coverage: **ADR-0024, ADR-0025, ADR-0026, ADR-0027**.

## View 6 — Strategy Selection and Telemetry Policy

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
    RUN --> TELEMETRY["Telemetry\nGoal progress / Prediction error / Information gain / Iteration cost / Reuse gain / Human intervention"]
```

Primary ADR coverage: **ADR-0021, ADR-0022, ADR-0023**.

## View 7 — C4 Deployment View

```mermaid
flowchart TB
    GIT[("Shared Git Source of Truth\nGlobal Skill / Flow / Primitive / Eval revisions")]

    I1["Deployment Node: Solver Instance 1\npinned Global assets: vX"]
    I2["Deployment Node: Solver Instance 2\npinned Global assets: vX"]
    I3["Deployment Node: Solver Instance 3\npinned Global assets: vY canary"]

    D1[("Scoped data\nTenant A / Workspaces / Tasks / Runs\nMemory + RAG + operational state")]
    D2[("Scoped data\nTenant B / Workspaces / Tasks / Runs\nMemory + RAG + operational state")]
    D3[("Scoped data\nTenant C / Workspaces / Tasks / Runs\nMemory + RAG + operational state")]

    GIT -.->|"checkout / deploy exact revision"| I1
    GIT -.->|"checkout / deploy exact revision"| I2
    GIT -.->|"checkout / deploy exact revision"| I3

    I1 --> D1
    I2 --> D2
    I3 --> D3
```

The Git arrows represent **versioned distribution, not synchronous runtime registry calls**. Sharing the same Global Flow/Skill/Primitive/Eval revision does not create a path between Tenant data stores. Instance placement/version selection may initially be ordinary deployment configuration or environment variables; no Fleet Manager or Deployment Registry service is required.

The same logical Tenant/Workspace/Task/Run contracts also support a shared multi-tenant instance or a fully isolated tenant stack later. A runtime instance remains infrastructure, not a hierarchy level.

Primary ADR coverage: **ADR-0020, ADR-0024, ADR-0026, ADR-0028**.

## ADR → Architecture View Traceability

| ADR | Context | Container | Dynamic | Learning | External | Policy | Deployment |
|---|---:|---:|---:|---:|---:|---:|---:|
| 0017 Root Skill + Coding Agent | ✅ | ✅ |  |  |  |  |  |
| 0018 Lifecycle + Complexity Routing |  |  | ✅ |  |  |  |  |
| 0019 Deterministic Planning + Replanning |  | ✅ | ✅ |  |  |  |  |
| 0020 Reusable Asset Model + Retrieval |  | ✅ | ✅ | ✅ |  |  | ✅ |
| 0021 Verification / Eval / Promotion |  |  | ✅ | ✅ |  | ✅ |  |
| 0022 Quality → Reliability → SLA → Cost |  |  | ✅ |  |  | ✅ |  |
| 0023 Learning + Controlled Self-Modification |  |  |  | ✅ |  | ✅ |  |
| 0024 Persistence + Provenance |  | ✅ |  | ✅ | ✅ |  | ✅ |
| 0025 Runtime + Connector Boundary | ✅ | ✅ |  |  | ✅ |  |  |
| 0026 Scope Hierarchy + Tenant Isolation | ✅ | ✅ | ✅ | ✅ | ✅ |  | ✅ |
| 0027 Context Assembly + Memory Scoping | ✅ | ✅ | ✅ | ✅ | ✅ |  |  |
| 0028 Runtime Topology |  |  |  |  |  |  | ✅ |

## Architecture consistency rule

When an Accepted/Experimental ADR changes:

1. update all affected canonical views in the same change;
2. update the traceability matrix;
3. if no diagram should change, mark the ADR as policy-only and explain why;
4. do not add a diagram merely to duplicate ADR prose.

ADR-0001…ADR-0016 remain historical records superseded by the active ADR set.
