# Project Brief — Adaptive Problem Solver

- **Status:** Architecture defined; validation and implementation planning
- **Working name:** Adaptive Problem Solver / Universal Solver
- **Repository:** skills-for-decision-making
- **General entry point:** adaptive-problem-solver
- **Specialist decision subsystem:** decision-orchestrator

## 1. One-sentence definition

Build a reusable problem-solving system in which an AI agent can take a real task, select or create the required capabilities, perform the work, verify the result against evidence, adapt when reality changes, and turn repeated successful behavior or failures into reusable system knowledge and capabilities.

## 2. Problem

General-purpose AI agents are flexible but unreliable when long multi-step work is governed only by natural-language instructions. Errors accumulate, plans become stale when new information appears, work is repeated unnecessarily, and successful one-off solutions are often not converted into reusable capabilities.

At the same time, building every workflow, integration and decision method from scratch would create excessive maintenance cost and ignore the growing ecosystem of skills, connectors, APIs, workflow systems and AI agents.

The project therefore needs to combine:

- adaptive reasoning where the problem is genuinely uncertain;
- deterministic control where reliability matters;
- aggressive reuse of existing skills, flows, primitives and connectors;
- evidence-driven verification and replanning;
- progressive conversion of repeated successful work into reusable, tested capabilities.

## 3. Product thesis

The system as a whole is the Problem Solver. The AI agent is an adaptive operator inside the system, not the entire control mechanism.

The central design principle is:

> **Deterministic skeleton + probabilistic leaves.**

Semantic work such as interpretation, synthesis, fuzzy ranking and strategy generation may use an AI model. Critical control decisions such as state transitions, retries, plan changes, permissions and promotion of reusable capabilities should be explicit, testable and governed by stable rules wherever practical.

## 4. North Star

A user should be able to invoke one root capability with a real-world task and receive a verified result with minimal human intervention, while the system becomes cheaper and more reliable on repeated task classes.

Success is evaluated in this order:

1. **Quality** — the result meets the acceptance threshold for the task class and, where relevant, compares favorably with a human or reference baseline.
2. **Reliability** — the system repeatedly produces acceptable results on representative and regression cases.
3. **SLA** — the result is delivered within the required time constraint.
4. **Cost** — among solutions that pass the first three gates, the system minimizes expected monetary cost.

Important operational signals include human-intervention minutes, goal progress, prediction error, information gain, iteration cost, strategy survival and reuse gain.

## 5. Primary user experience

The user should not need to understand internal architecture or choose individual skills.

The user provides a real task. The root capability interprets the task, the AI agent selects or adapts the required capabilities, the system performs and verifies the work, and the user receives the final result.

Specialist subsystems such as decision-orchestrator are used only when their methods match the structure of the task.

## 6. Execution model

Tasks are routed to the smallest sufficient mode:

- **L0 Action** — a direct action is sufficient;
- **L1 Known Flow** — a tested reusable workflow already matches the task;
- **L2 Problem** — bounded planning, verification and local replanning are required;
- **L3 Open Problem** — explicit state modelling, alternative strategies, short-horizon planning and repeated evidence-driven replanning are required.

For non-trivial work the system follows a closed-loop problem-solving cycle: define the goal, model the current state, retrieve reusable capabilities, decide whether to think, observe or act, create a short-horizon plan, verify the plan, execute a bounded step, observe the result, verify it, update the state, and decide whether to continue, replan, escalate or stop.

The next action should be chosen according to expected progress, information gain, risk, time and cost. Plans are versioned, and material changes are made explicitly rather than silently rewriting history.

## 7. Reusable asset model

The system distinguishes four reusable asset types:

- **Skill** — adaptive knowledge about task semantics, methods, failure modes, quality criteria and capability discovery;
- **Flow** — a reusable strategy for a recurring class of work;
- **Primitive** — an atomic capability with a stable contract and known side effects or risks;
- **Eval** — evidence used to establish trust, such as deterministic checks, golden cases, regression cases or semantic and adversarial evaluations.

The governing principle is **reuse before inventing**. The system should first reuse a proven flow, then adapt a close flow, then compose existing primitives, then consult skills and available connectors, and only then create a genuinely missing capability.

## 8. Learning model

Runtime learning and system learning are separate.

- New facts update the current task and world model.
- Repeated successful patterns may become reusable Flow or Primitive candidates.
- Reproducible production failures should become regression Evals.
- Repeated strategic lessons or failure modes may update Skills or routing policy.

AI agents may propose system changes, but reusable behavior must not change silently in production. Changes are isolated, evaluated, compared with the current stable alternative where applicable, and promoted only after passing explicit quality and reliability gates.

## 9. Scope

### In scope

- one root skill for general problem solving;
- AI-agent orchestration and capability discovery;
- structured planning and evidence-driven replanning;
- a reusable Skill / Flow / Primitive / Eval model;
- deterministic verification and promotion gates;
- formal decision-analysis methods through specialist skills;
- replaceable workflow and connector boundaries;
- versioned architecture decisions and operational provenance;
- business, office, research and software-assisted tasks that can be executed through available tools and integrations.

### Not a goal

- one giant prompt or skill containing every workflow;
- a visual workflow builder as the core development model;
- rebuilding every external integration ourselves;
- letting an AI model silently control critical state transitions or production self-modification;
- locking the architecture permanently to a specific workflow runtime, connector provider or AI-model vendor;
- forcing the full adaptive solver loop onto trivial tasks.

## 10. Architecture boundaries

The architecture deliberately separates:

- **Root Skill + AI Agent** — adaptive entry point and meta-orchestration;
- **Solver Control Plane** — task, planning, replanning and verification authority;
- **Reusable Asset Layer** — Skills, Flows, Primitives and Evals;
- **Workflow Runtime Boundary** — a replaceable mechanism for recurring workflows;
- **Connector Boundary** — external tools, integrations and APIs;
- **Versioned Definition Store** — architecture, policies, reusable capability definitions and decisions;
- **Operational Store** — task state, plans, observations, evidence and telemetry.

The canonical C4 and dynamic architecture views live in the architecture documentation.

## 11. Trust and safety model

External skills, connectors, web content and tool outputs are untrusted until inspected and evaluated.

Capability acquisition follows a controlled lifecycle: discover the candidate, isolate it, inspect it, test it, fix its exact source or version, explicitly trust it, and promote it only when appropriate.

Consequential writes, deletes, payments, legal or financial commitments and other high-risk side effects require explicit policy or approval. Tenant and client credentials and context must remain isolated.

## 12. Current project stage

The architecture and ADR set are defined. The Adaptive Problem Solver itself should not yet be treated as a completed product.

Current work should prioritize validation of the architecture assumptions before committing to a large implementation:

1. validate the root-skill operating contract on representative tasks;
2. validate the minimum planning, replanning and verification contracts;
3. test reusable capability retrieval and promotion on real recurring tasks;
4. compare workflow-runtime candidates on representative workloads;
5. validate connector coverage, security boundaries and operational provenance;
6. turn real failures into regression cases from the beginning.

## 13. Definition of project success

The project is successful when representative real tasks can be handled through the root skill such that:

- users do not manually choose internal skills or methods;
- known task classes reuse tested capabilities instead of being recreated from scratch;
- non-trivial tasks visibly adapt to new evidence through structured replanning;
- important claims and results are independently verifiable;
- production failures become durable regression constraints;
- repeated task classes show measurable reuse gain and lower human-intervention cost;
- runtime, framework and vendor choices remain replaceable behind stable architecture boundaries.

Exact quality, reliability, SLA and cost thresholds belong to task-family policies and evaluations rather than this brief.

## 14. Sources of truth

- **Project brief / intent:** BRIEF.md
- **Canonical architecture views:** docs/architecture/README.md
- **Architecture decisions:** docs/architecture/adr/
- **Root operating skill:** adaptive-problem-solver/SKILL.md
- **Decision-analysis subsystem:** decision-orchestrator/SKILL.md

## 15. Brief maintenance rule

BRIEF.md describes what we are building, why, the North Star, scope and product-level success criteria. It should stay short and stable.

When implementation changes but the product thesis does not, update implementation or architecture documentation rather than this brief. When a durable architectural choice changes, update the relevant ADR and architecture view. Update the brief only when the project's purpose, scope, North Star or major product assumptions change.
