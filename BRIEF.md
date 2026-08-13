# Project Brief — Adaptive Problem Solver

- **Status:** Architecture-defined / validation and implementation planning
- **Working name:** Adaptive Problem Solver / Universal Solver
- **Repository:** `skills-for-decision-making`
- **General entry point:** `adaptive-problem-solver`
- **Specialist decision subsystem:** `decision-orchestrator`

## 1. One-sentence definition

Build a reusable, code-first problem-solving system in which a coding agent such as Codex or Claude can take a real task, select or create the required capabilities, execute bounded work, verify results against evidence, replan when reality changes, and convert repeated successful behavior or failures into tested reusable system assets.

## 2. Problem

General-purpose AI agents are flexible but unreliable when a long multi-step business process is controlled only by natural-language instructions. Errors compound across steps, plans become stale when new information appears, models may repeat work, and successful one-off solutions are often not converted into reusable deterministic capability.

At the same time, building every workflow, integration and decision method from scratch would create excessive maintenance cost and discard the growing ecosystem of skills, MCP servers, APIs, workflow runtimes and coding agents.

The project therefore needs to combine:

- adaptive reasoning where the problem is genuinely uncertain;
- deterministic control where reliability matters;
- aggressive reuse of existing skills, flows, primitives and connectors;
- evidence-driven verification and replanning;
- progressive conversion of repeated ad-hoc work into tested reusable code.

## 3. Product thesis

The system as a whole is the **Problem Solver**. The LLM/coding agent is one adaptive operator inside it, not the entire runtime state machine.

Core design rule:

> **Deterministic skeleton + probabilistic leaves.**

Semantic work such as interpretation, synthesis, fuzzy ranking and strategy generation may use an LLM. State transitions, retries, plan mutation, schemas, invariants, permissions, promotion and other critical control logic should be deterministic and testable where practical.

## 4. North Star

A user should be able to invoke one root capability with a real-world task and receive a verified result with minimal human intervention, while the system becomes cheaper and more reliable on repeated task classes.

Success is evaluated in this order:

1. **Quality** — meets the task-family acceptance threshold and, where relevant, compares favorably with a human/reference baseline.
2. **Reliability** — repeatedly produces acceptable results on representative and regression cases.
3. **SLA** — completes within the required task deadline/latency target.
4. **Cost** — among solutions that pass the first three gates, minimizes expected monetary cost.

Key operational signals include human-intervention minutes, goal progress, prediction error, information gain, iteration cost, strategy survival and reuse gain.

## 5. Primary user experience

The user should not need to understand internal architecture or choose individual skills.

Conceptually:

`task → adaptive-problem-solver → Codex/Claude meta-orchestrator → controlled execution → verified result`

The root skill knows the operating model and architecture. The coding agent retrieves and adapts the required assets. Specialist subsystems such as `decision-orchestrator` are invoked only when their methods match the task.

## 6. Execution model

Tasks are routed to the smallest sufficient mode:

- **L0 Action** — direct primitive/tool action;
- **L1 Known Flow** — tested reusable workflow;
- **L2 Problem** — bounded planning, verification and local replanning;
- **L3 Open Problem** — explicit world model, alternative strategies, short-horizon planning and repeated evidence-driven replanning.

For non-trivial work the canonical loop is:

`FRAME → MODEL → RETRIEVE → META-DECIDE → PLAN → PLAN JUDGE → EXECUTE bounded step → OBSERVE → VERIFY → UPDATE → REPLAN/CONTINUE/STOP → FINAL JUDGE → DELIVER → LEARN`

`META-DECIDE` chooses whether the next best move is to **THINK**, **OBSERVE** or **ACT**, considering expected value of information/computation, time, risk and cost.

Plans are structured and versioned. Material changes use explicit evidence-backed replanning, preferably a `PlanPatch`, rather than silently rewriting history.

## 7. Reusable asset model

The system distinguishes four reusable asset types:

- **Skill** — adaptive knowledge: task semantics, methods, failure modes, quality criteria and discovery/adaptation guidance.
- **Flow** — reusable executable strategy for a recurring class of work.
- **Primitive** — atomic executable capability with a stable contract and side-effect/risk metadata.
- **Eval** — deterministic test, golden case, regression case or semantic/adversarial evaluation used to establish trust.

Retrieval follows **reuse before inventing**: use an exact stable Flow if available, otherwise adapt a close Flow, compose from existing Primitives, consult Skills/connectors, and write minimal new code only when required.

## 8. Learning model

Runtime learning and system learning are separate.

- New facts update the current task/world model.
- Repeated successful patterns may become Flow or Primitive candidates.
- Reproducible production failures should become regression Evals.
- Repeated strategic lessons or failure modes may update Skills or routing/policy.

Coding agents may propose system changes, but reusable executable behavior is not allowed to mutate production silently. Changes are isolated, tested/evaluated, compared against the current stable incumbent where applicable, and promoted through explicit gates.

## 9. Scope

### In scope

- a single root skill for general problem solving;
- coding-agent orchestration and capability discovery;
- structured planning and evidence-driven replanning;
- reusable Skill / Flow / Primitive / Eval model;
- deterministic verification and promotion gates;
- formal decision-analysis methods through specialist skills;
- replaceable workflow-runtime and connector boundaries;
- Git-native definitions and operational provenance;
- business/office/research/coding tasks that can be executed through software tools and APIs.

### Not a goal

- one giant prompt or `SKILL.md` containing every workflow;
- a visual workflow builder as the core development model;
- rebuilding every SaaS/API connector ourselves;
- letting an LLM silently control critical state transitions or production self-modification;
- locking the architecture permanently to Agno, Composio, a specific MCP provider or a specific LLM vendor;
- forcing the full adaptive solver loop onto trivial L0/L1 work.

## 10. Architecture boundaries

The current architecture deliberately separates:

- **Root Skill + Coding Agent** — adaptive entrypoint/meta-orchestration;
- **Solver Control Plane** — deterministic task/plan/replan/verification authority;
- **Reusable Asset Layer** — Skills, Flows, Primitives and Evals;
- **Workflow Runtime Adapter** — initial experimental hypothesis: Agno;
- **Connector Adapter Layer** — native tools, MCP, connector ecosystems and APIs;
- **Git** — source of truth for versioned definitions, policies and ADRs;
- **Operational store** — intended initial choice: Postgres for task state, plans, observations, evidence and telemetry.

The canonical C4 and dynamic architecture views live in [`docs/architecture/README.md`](docs/architecture/README.md).

## 11. Trust and safety model

External skills, MCP servers, web/tool content and connector capabilities are untrusted until inspected and evaluated. Capability acquisition should follow:

`discover → stage → inspect/audit → sandbox/test/eval → pin exact source/version → explicitly trust → promote when appropriate`

Consequential writes, deletes, payments, legal/financial commitments and other high-risk side effects require explicit policy/approval. Tenant/client credentials and context must remain isolated.

## 12. Current project stage

The **architecture and ADR set are defined**. The Adaptive Problem Solver runtime itself should not be treated as implemented merely because the repository already contains decision-engine and skill-lifecycle code.

Current work should therefore prioritize validation of architecture assumptions before building a large custom framework:

1. validate the root-skill operating contract on representative tasks;
2. spike the minimum deterministic Task Controller / Plan / PlanPatch contracts;
3. test Flow/Primitive retrieval and promotion on real recurring tasks;
4. compare workflow-runtime candidates on representative workloads, with Agno as the current experimental hypothesis;
5. validate connector coverage, security boundaries and operational provenance;
6. turn real failures into regression cases from the beginning.

## 13. Definition of project success

The project is successful when representative real tasks can be executed through the root skill such that:

- users do not manually choose internal skills/methods;
- known task classes reuse tested executable assets instead of being regenerated from scratch;
- non-trivial tasks visibly adapt to new evidence through structured replanning;
- important claims/results are independently verifiable;
- production failures become durable regression constraints;
- repeated task classes show measurable reuse gain and lower human-intervention cost;
- runtime/framework/vendor choices remain replaceable behind stable architecture contracts.

Exact quality, reliability, SLA and cost thresholds belong to task-family policies/evals rather than this brief.

## 14. Sources of truth

- **Project brief / intent:** this file, `BRIEF.md`
- **Canonical architecture views:** [`docs/architecture/README.md`](docs/architecture/README.md)
- **Architecture decisions:** [`docs/architecture/adr/`](docs/architecture/adr/)
- **Root operating skill:** [`adaptive-problem-solver/SKILL.md`](adaptive-problem-solver/SKILL.md)
- **Decision-analysis subsystem:** [`decision-orchestrator/SKILL.md`](decision-orchestrator/SKILL.md)

## 15. Brief maintenance rule

`BRIEF.md` describes **what we are building, why, the North Star, scope and product-level success criteria**. It should stay short and stable.

When implementation changes but the product thesis does not, update implementation/docs rather than this brief. When a durable architectural choice changes, update the relevant ADR and architecture view. Update the brief only when the project's purpose, scope, North Star or major product assumptions change.
