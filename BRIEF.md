# Project Brief — Adaptive Problem Solver

- **Status:** Architecture defined; validation and implementation planning
- **Working name:** Adaptive Problem Solver / Universal Solver
- **Repository:** skills-for-decision-making
- **General entry point:** adaptive-problem-solver
- **Specialist decision subsystem:** decision-orchestrator

## 1. One-sentence definition

Build a reusable problem-solving system in which an AI agent can take a real task, decompose it into manageable parts, select the right methods and capabilities as the situation evolves, perform and verify the work, revise the plan when meaningful new information appears, and turn repeated successful behavior or failures into reusable system knowledge and capabilities.

## 2. Problem

General-purpose AI agents are flexible but unreliable when long multi-step work is governed only by natural-language instructions. Errors accumulate, plans become stale when new information appears, work is repeated unnecessarily, and successful one-off solutions are often not converted into reusable capabilities.

At the same time, building every workflow, integration and decision method from scratch would create excessive maintenance cost and ignore the growing ecosystem of skills, connectors, APIs, workflow systems and AI agents.

The project therefore needs to combine:

- decomposition of complex goals into manageable subproblems, dependencies and verifiable steps;
- adaptive reasoning where the problem is genuinely uncertain;
- deterministic control where reliability matters;
- dynamic selection of decision-making methods and problem-solving strategies;
- aggressive reuse of existing skills, flows, primitives and connectors;
- evidence-driven verification and replanning;
- progressive conversion of repeated successful work into reusable, tested capabilities;
- modular growth from a small working core to a richer system without rewriting the foundation.

## 3. Product thesis

The system as a whole is the Problem Solver. The AI agent is an adaptive operator inside the system, not the entire control mechanism.

The central design principle is:

> **Deterministic skeleton + probabilistic leaves.**

Semantic work such as interpretation, synthesis, fuzzy ranking, strategy generation and selection among ambiguous alternatives may use an AI model. Critical control decisions such as state transitions, retries, plan changes, permissions and promotion of reusable capabilities should be explicit, testable and governed by stable rules wherever practical.

The system is not built around one universal reasoning method. It should select the smallest useful combination of methods, roles and capabilities for the current state of the task.

## 4. North Star

A user should be able to invoke one root capability with a real-world task and receive a verified result with minimal human intervention, while the system becomes cheaper, more reliable and more capable on repeated task classes.

Success is evaluated in this order:

1. **Quality** — the result meets the acceptance threshold for the task class and, where relevant, compares favorably with a human or reference baseline.
2. **Reliability** — the system repeatedly produces acceptable results on representative and regression cases.
3. **SLA** — the result is delivered within the required time constraint.
4. **Cost** — among solutions that pass the first three gates, the system minimizes expected monetary cost.

Important operational signals include human-intervention minutes, goal progress, prediction error, information gain, iteration cost, strategy survival and reuse gain.

A successful iteration should either move the task measurably toward its goal, reduce decision-relevant uncertainty, reduce material risk, or create a reusable capability that improves future work without compromising the current task.

## 5. Primary user experience

The user should not need to understand internal architecture, manually decompose the task or choose individual skills, roles or decision methods.

The user provides a real task. The root capability interprets the goal and constraints, the AI agent decomposes the problem where necessary, the system selects or adapts the required methods and capabilities, performs and verifies the work, and returns the final result.

Specialist subsystems such as decision-orchestrator are used only when their methods match the current decision structure. The same task may require different methods at different moments as new information changes what decision must be made.

## 6. Decomposition and adaptive planning

For non-trivial work, the system should transform a broad goal into an explicit working structure consisting of the desired outcome, current state, constraints, material unknowns, subproblems, dependencies, steps and definitions of done.

Decomposition is not assumed to be permanent. It represents the best current model of how to reach the goal and may be revised when new evidence changes the problem.

The system should plan only far enough to choose reliable next actions while preserving awareness of the larger goal. It should avoid both extremes: acting without a useful plan and producing a long fixed plan that becomes obsolete before execution finishes.

After every material step, observation or external result, the system should assess whether the new information is significant enough to affect assumptions, constraints, dependencies, risks, priorities, the selected method or the expected path to the goal.

If the information is not material, the system continues the current plan. If it is material, the system explicitly decides whether to retry or repair a local step, change only the affected part of the plan, replace a larger portion of the plan, backtrack to an earlier assumption, change strategy, escalate a blocker or stop.

The plan therefore remains a living, versioned representation of the current best path rather than a one-time instruction created before execution begins.

## 7. Dynamic decision-making

Decision-making is a reusable capability of the solver, not a single fixed stage that happens once before execution.

A decision may be required while framing the problem, choosing a strategy, selecting a reusable capability, deciding whether to gather more information, allocating resources, interpreting an observation, responding to a failed assumption, comparing alternative plans or deciding whether further work is worth its cost.

The system should choose decision methods according to the structure of the current choice, available evidence and uncertainty. Depending on the situation this may include methods for expected value or utility, value of information, multi-criteria comparison, Pareto analysis, sensitivity analysis, Bayesian belief updating, resource allocation, robustness and premortem analysis, or other suitable methods.

No single method is mandatory for every task. The system may switch methods during execution when the decision itself changes.

The governing principle is that methods support the task rather than dictate it. The solver should use the minimum decision machinery needed to make a sufficiently reliable choice and should prefer additional information or a reversible experiment when that has greater expected value than more internal reasoning.

## 8. Execution model

Tasks are routed to the smallest sufficient mode:

- **L0 Action** — a direct action is sufficient;
- **L1 Known Flow** — a tested reusable workflow already matches the task;
- **L2 Problem** — bounded planning, verification and local replanning are required;
- **L3 Open Problem** — explicit state modelling, alternative strategies, short-horizon planning and repeated evidence-driven replanning are required.

For non-trivial work the system follows a closed-loop problem-solving cycle. It defines the goal, models the current state, retrieves reusable capabilities, decides whether the next useful move is more reasoning, more information or external action, creates and checks a short-horizon plan, performs a bounded step, observes and verifies the result, updates its understanding of the task, and then decides whether to continue, repair, replan, change strategy, escalate or stop.

The next action should be chosen according to expected progress, information gain, risk, time and cost. Plan changes must be explicit and attributable to the evidence that caused them rather than silently rewriting history.

## 9. Specialized roles

The solver may use specialized roles for different kinds of intellectual or operational work. Examples include planning, research, decision analysis, execution, critique, verification and synthesis.

Roles are modular capabilities, not permanently hard-wired stages. A task should use only the roles that materially improve the result, and the set of available roles may expand or change over time.

The architecture should allow a new role to be introduced without redesigning the core solving lifecycle. Roles may themselves use shared skills, methods, flows and primitives, and several roles may collaborate on a complex task when independent perspectives or separation of responsibilities improve reliability.

The initial role set should remain deliberately small until real tasks demonstrate the value of adding more specialization.

## 10. Reusable asset model

The system distinguishes four reusable asset types:

- **Skill** — adaptive knowledge about task semantics, methods, failure modes, quality criteria and capability discovery;
- **Flow** — a reusable strategy for a recurring class of work;
- **Primitive** — an atomic capability with a stable contract and known side effects or risks;
- **Eval** — evidence used to establish trust, such as deterministic checks, golden cases, regression cases or semantic and adversarial evaluations.

The governing principle is **reuse before inventing**. The system should first reuse a proven flow, then adapt a close flow, then compose existing primitives, then consult skills and available connectors, and only then create a genuinely missing capability.

Reusable assets should remain modular enough that new capabilities can be added without forcing unrelated parts of the solver to change.

## 11. Modular growth from simple to complex

The project should be developed as an expandable system rather than as a large all-at-once framework.

The first useful version should contain the smallest coherent core capable of solving at least one representative task end to end. That core should already demonstrate the essential lifecycle: understand the goal, decompose when necessary, choose the next useful action, execute, verify, react to significant new information and finish against an explicit definition of done.

Additional capabilities should then be added incrementally as independent modules when real tasks justify them. These additions may include new decision methods, specialized roles, reusable flows, primitives, verification mechanisms, connectors, domain knowledge and learning mechanisms.

The expected growth pattern is capability expansion rather than architecture replacement. Adding a new module should normally extend the system through stable boundaries rather than require rewriting the solving core.

The project should resist premature complexity. A capability should be generalized and promoted only after there is evidence that it is reusable or materially improves quality, reliability, speed, cost or human effort.

## 12. Learning model

Runtime learning and system learning are separate.

- New facts update the current task and world model.
- Repeated successful patterns may become reusable Flow or Primitive candidates.
- Reproducible production failures should become regression Evals.
- Repeated strategic lessons or failure modes may update Skills or routing policy.

AI agents may propose system changes, but reusable behavior must not change silently in production. Changes are isolated, evaluated, compared with the current stable alternative where applicable, and promoted only after passing explicit quality and reliability gates.

System learning should strengthen modularity rather than create hidden coupling. Lessons should be recorded in the smallest reusable layer that actually owns the behavior being improved.

## 13. Scope

### In scope

- one root skill for general problem solving;
- automatic decomposition of non-trivial goals into manageable subproblems and steps;
- AI-agent orchestration and capability discovery;
- structured planning and evidence-driven replanning throughout execution;
- dynamic selection and combination of decision-making methods;
- modular specialized roles;
- a reusable Skill / Flow / Primitive / Eval model;
- deterministic verification and promotion gates;
- formal decision-analysis methods through specialist skills;
- replaceable workflow and connector boundaries;
- versioned architecture decisions and operational provenance;
- incremental capability growth from a minimal working core;
- business, office, research and software-assisted tasks that can be executed through available tools and integrations.

### Not a goal

- one giant prompt or skill containing every workflow;
- one universal decision method for every problem;
- a permanently fixed decomposition or plan created before execution begins;
- a visual workflow builder as the core development model;
- rebuilding every external integration ourselves;
- letting an AI model silently control critical state transitions or production self-modification;
- locking the architecture permanently to a specific workflow runtime, connector provider or AI-model vendor;
- creating a large hierarchy of roles before real tasks prove their usefulness;
- forcing the full adaptive solver loop onto trivial tasks.

## 14. Architecture boundaries

The architecture deliberately separates:

- **Root Skill + AI Agent** — adaptive entry point and meta-orchestration;
- **Solver Control Plane** — task, decomposition, planning, replanning and verification authority;
- **Decision Capability** — selection and application of suitable decision methods whenever a choice arises during solving;
- **Role Layer** — optional specialized responsibilities that can be introduced or replaced independently;
- **Reusable Asset Layer** — Skills, Flows, Primitives and Evals;
- **Workflow Runtime Boundary** — a replaceable mechanism for recurring workflows;
- **Connector Boundary** — external tools, integrations and APIs;
- **Versioned Definition Store** — architecture, policies, reusable capability definitions and decisions;
- **Operational Store** — task state, plans, observations, evidence and telemetry.

The canonical C4 and dynamic architecture views live in the architecture documentation.

## 15. Trust and safety model

External skills, connectors, web content and tool outputs are untrusted until inspected and evaluated.

Capability acquisition follows a controlled lifecycle: discover the candidate, isolate it, inspect it, test it, fix its exact source or version, explicitly trust it, and promote it only when appropriate.

Consequential writes, deletes, payments, legal or financial commitments and other high-risk side effects require explicit policy or approval. Tenant and client credentials and context must remain isolated.

## 16. Current project stage

The architecture and ADR set are defined. The Adaptive Problem Solver itself should not yet be treated as a completed product.

Current work should validate the smallest coherent solving core before committing to a large implementation:

1. validate goal framing and task decomposition on representative tasks;
2. validate planning, verification and evidence-triggered replanning;
3. validate dynamic selection of decision methods during execution;
4. validate the smallest useful set of specialized roles;
5. test reusable capability retrieval and promotion on real recurring tasks;
6. compare workflow-runtime candidates on representative workloads;
7. validate connector coverage, security boundaries and operational provenance;
8. turn real failures into regression cases from the beginning;
9. add further modules only where measured workload demonstrates their value.

## 17. Definition of project success

The project is successful when representative real tasks can be handled through the root skill such that:

- users do not manually choose internal skills, roles or methods;
- complex tasks are decomposed into understandable and verifiable parts;
- known task classes reuse tested capabilities instead of being recreated from scratch;
- suitable decision methods are selected as decisions arise during execution rather than being fixed once at the start;
- after meaningful new information, the system explicitly decides whether the current plan remains valid or must be repaired, partially changed, rebuilt or replaced by another strategy;
- important claims and results are independently verifiable;
- production failures become durable regression constraints;
- repeated task classes show measurable reuse gain and lower human-intervention cost;
- new roles, methods and capabilities can be added through stable modular boundaries without rewriting the solving core;
- runtime, framework and vendor choices remain replaceable behind stable architecture boundaries.

Exact quality, reliability, SLA and cost thresholds belong to task-family policies and evaluations rather than this brief.

## 18. Sources of truth

- **Project brief / intent:** BRIEF.md
- **Canonical architecture views:** docs/architecture/README.md
- **Architecture decisions:** docs/architecture/adr/
- **Root operating skill:** adaptive-problem-solver/SKILL.md
- **Decision-analysis subsystem:** decision-orchestrator/SKILL.md

## 19. Brief maintenance rule

BRIEF.md describes what we are building, why, the North Star, scope and product-level success criteria. It should stay concise enough to orient a new contributor or AI agent without duplicating the architecture documentation.

The brief should change when the project's purpose, scope, North Star or major product assumptions change. Detailed internal structures, method implementations, role definitions and runtime choices belong in architecture documents, ADRs and later specifications rather than being frozen here.