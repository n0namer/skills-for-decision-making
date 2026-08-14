# Extended Decision Engine Architecture

## North star

Turn an ambiguous real-world decision into a reproducible analysis where:

1. the user invokes one entrypoint: `decision-orchestrator`;
2. the agent frames the decision and gathers evidence;
3. every important numeric input has provenance;
4. deterministic or reproducible code performs calculations;
5. routing selects the minimum useful skill pipeline;
6. the selected pipeline is executed, not merely reported;
7. the agent explains results and identifies the next valuable action.

## Design rule

**LLM for semantics and skill execution; code for routing, execution control, arithmetic and algorithms.**

The LLM may propose alternatives, identify uncertainties, search for evidence, apply the selected skill instructions, and explain results. It must not silently replace a supported calculator, choose an arbitrary skill chain, or choose an arbitrary mathematical method.

## End-to-end data flow

```text
user problem
   |
   v
decision-orchestrator                    <- single user-facing skill
   |
   +--> intent signals
   +--> relevant .agents/context
   |
   v
deterministic skill router
   |
   v
PipelinePlanner                          <- minimal ordered pipeline + dependencies
   |
   v
PipelineExecutor                         <- execution control / fail closed
   |
   +--> skill step -> materialized SKILL.md -> current agent applies instructions
   |
   +--> method step -> deterministic calculator / adapter
   |
   +--> each output is passed to the next step
   |
   v
DecisionSpec / AnalysisResult / step outputs
   |
   v
one synthesized user-facing answer
```

`plan` is diagnostic output. It is not completion. Normal agent execution materializes a `bundle` and processes every selected step before answering.

## Executor boundary

`lib/pipeline-executor.js` is deliberately vendor-neutral. It does not call Claude, OpenAI, Codex, OpenCode, or another model API directly.

It owns the parts that must be deterministic across agent runtimes:

- resolve every selected skill to a real installed/discoverable `SKILL.md`;
- embed the exact skill instructions into an execution step;
- preserve planner order and dependencies;
- pass prior step outputs into later steps;
- stop immediately when a required step fails;
- expose an injectable `runSkill` / `runMethod` boundary for the host agent runtime.

The host AI agent that invoked `decision-orchestrator` is the normal `runSkill` implementation. This keeps the system portable while still giving it one orchestration entrypoint.

Programmatic integrations may call `executeOrchestration({ runSkill, runMethod, ... })`. Agent runtimes normally use:

```bash
sdm-orchestrate bundle --text "<request>"
```

and then execute `execution.steps` in order as required by `decision-orchestrator/SKILL.md`.

## DecisionSpec

`DecisionSpec` is the stable contract between agent reasoning and numerical tools.

Required concepts:

- `decision`: what is being chosen;
- `alternatives`: at least two options; include a status-quo/do-nothing option when meaningful;
- `criteria`: independent value dimensions such as money, time, psychological load, risk, reversibility, strategic value;
- `evidence`: provenance metadata for important inputs;
- optional probabilistic `outcomes`;
- optional candidate `observations` for Value of Information;
- optional uncertain `parameters` with ranges for sensitivity analysis.

### Provenance kinds

- `fact`: directly observed or authoritative input;
- `calculated`: output of deterministic/reproducible code;
- `estimate`: judgement supplied by a person or model;
- `prior`: explicit probability before new evidence;
- `unknown`: missing input that must not be silently invented.

## Method routing policy

The router, not the LLM, determines allowed analysis families from the spec:

| Structure | Method |
|---|---|
| probabilistic outcomes | Expected Value / Expected Utility |
| candidate observations + probabilistic decision | Value of Information |
| multiple scored criteria with complete explicit weights | MCDA |
| multiple unweighted/conflicting criteria | Pareto filter |
| uncertain parameter ranges | sensitivity analysis |
| insufficient numeric structure | framing only |

Future adapters may extend this table, but each route must be deterministic and test-covered.

## Adapter boundary

External numerical libraries must be isolated behind adapters. Skills should never import a scientific library directly.

Target shape:

```text
engine/
  adapters/
    mcda/
    sensitivity/
    bayes/
    optimization/
```

Each adapter should accept a normalized subset of `DecisionSpec` and return JSON-serializable results with:

- method and implementation name/version;
- normalized inputs;
- result/ranking;
- warnings;
- reproducibility metadata such as random seed when applicable.

## Guardrails

1. The user should not need to choose an internal decision skill; `decision-orchestrator` is the single entrypoint.
2. A routing/plan response is not task completion. Every selected step must be applied or the system must expose a blocker.
3. Same structured inputs must produce the same deterministic method result.
4. Stochastic methods must accept/report a seed when practical.
5. Unknown inputs remain unknown; the system may request or estimate them only with explicit provenance.
6. The agent may not fabricate precision or criterion weights.
7. Pipeline execution is fail-closed: missing skill, missing runner, or failed required step stops the pipeline.
8. No external library is added merely because it exists; every dependency requires a concrete decision use case and tests.
