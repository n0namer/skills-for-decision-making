# Extended Decision Engine Architecture

## North star

Turn an ambiguous real-world decision into a reproducible analysis where:

1. the agent frames the decision and gathers evidence;
2. every important numeric input has provenance;
3. deterministic or reproducible code performs calculations;
4. method selection follows explicit rules;
5. the agent explains results and identifies the next valuable piece of information.

## Design rule

**LLM for semantics; code for arithmetic and algorithms.**

The LLM may propose alternatives, identify uncertainties, search for evidence, and explain results. It must not silently replace a supported calculator or choose an arbitrary mathematical method.

## Data flow

```text
user problem
   |
   v
skill / LLM framing
   |
   v
DecisionSpec 1.0
   |
   +--> validation
   |
   +--> deterministic method router
           |
           +--> existing JS engine: EV / EU / VoI / robustness / calibration
           +--> MCDA adapter
           +--> sensitivity adapter
           +--> later: Bayesian-network / Bayesian-model / optimization adapters
   |
   v
AnalysisResult
   |
   v
LLM explanation + next test / information action
```

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
| multiple scored criteria | MCDA |
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

## Initial integration sequence

### Phase 1 — now

- DecisionSpec validation
- deterministic method router
- reuse existing JS EV/EU/VoI/Pareto/robustness/calibration

### Phase 2 — first external adapters

- MCDA: evaluate Scikit-Criteria as the default permissive-license implementation
- sensitivity: evaluate SALib

### Phase 3 — only after a demonstrated use case

- pgmpy for dependent probabilistic events / Bayesian networks
- PyMC for richer Bayesian statistical inference from data
- pymoo for large multi-objective search/optimization spaces

## Guardrails

1. Same structured inputs must produce the same result unless the method is explicitly stochastic.
2. Stochastic methods must accept/report a seed when practical.
3. Unknown inputs remain unknown; the system may request or estimate them only with explicit provenance.
4. The agent may not fabricate precision. Prefer ranges and sensitivity tests when evidence is weak.
5. No external library is added merely because it exists; every dependency requires a concrete decision use case and tests.
