# From the book to the business

A map from *Algorithms for Decision Making* (Kochenderfer, Wheeler & Wray, MIT Press,
2022) to the decisions an operator actually makes, and to the skill in this repo that
covers each one.

The book is about autonomous systems: collision avoidance, rovers, wildfire surveillance.
None of that transfers. What transfers is the **problem structure**, which is identical:
act under uncertainty, with an imperfect model, imperfect observations, delayed rewards,
and other agents responding to you.

## Contents

- Part I: Probabilistic reasoning
- Part II: Sequential problems
- Part III: Model uncertainty
- Part IV: State uncertainty
- Part V: Multiagent systems
- What does not transfer
- Reading order

---

## Part I: Probabilistic reasoning (ch. 2-6)

| Concept | Where it lands | Skill |
|---|---|---|
| Probability as a degree of belief | Every forecast gets a number, so it can be scored | framing-decisions |
| Beta and Dirichlet posteriors, pseudocounts (4.2) | Conversion rates from tiny samples. 0 of 14 is not 0% | allocating-effort |
| Bayesian score prefers simple structures on small data (5.1) | Three data points do not support an elaborate causal story | tracking-beliefs |
| Rational preference axioms (6.1) | If preferences are intransitive or frame-dependent, no analysis helps | framing-decisions |
| Utility functions, diminishing marginal utility (6.2) | Log utility on cash. Halving hurts as much as doubling helps | framing-decisions |
| Utility elicitation (6.3) | Fix best at 1, worst at 0, locate the rest. Avoids anchoring | framing-decisions |
| Maximum expected utility (6.4) | The decision rule. Rank actions, report the advantage of second place | framing-decisions |
| Decision networks, informational edges (6.5) | Who knows what, when. Deleting an informational edge is a different problem | framing-decisions |
| **Value of information (6.6)** | **The highest-leverage idea in the book for an operator** | valuing-information |
| Irrationality: framing, certainty effects (6.7) | Bias checks on our own decisions; and the inverse, in pricing and copy | framing-decisions |

**Why VOI is the standout.** It is a one-line calculation that says most proposed
research, dashboards and A/B tests are worth nothing, because no result would change the
action. Nothing else in the book removes as much work per unit of effort. The second-order
effect matters too: pricing information before gathering it forces you to state the
decision, which frequently reveals that the decision was already made.

## Part II: Sequential problems (ch. 7-14)

| Concept | Where it lands | Skill |
|---|---|---|
| Discount factor gamma (7.1) | Runway sets the discount rate. Short-term versus long-term is an arithmetic argument | planning-horizons |
| Policy evaluation before improvement (7.2, 7.4) | Score the current plan before replacing it. Most pivots skip this | planning-horizons |
| Advantage function (7.3) | How much better is this than the default? Usually the decision-relevant number | framing-decisions |
| Receding horizon planning (9.1) | Plan to depth d, commit the first step, replan. The roadmap discipline | planning-horizons |
| Rollout with lookahead (9.2) | "If we did X and carried on as usual." Beats the default policy, and nobody does it | planning-horizons |
| Branch and bound (9.4) | Backlog triage by arithmetic: prune anything whose best case loses to a known floor | planning-horizons |
| Sparse sampling (9.5) | Three representative scenarios instead of enumerating futures | planning-horizons |
| Monte Carlo tree search (9.6) | Deepen the options that keep looking good, without abandoning the rest | planning-horizons |
| Cross entropy method (10.4) | Generate m variants, keep the elite, refit the generator. Ad and landing page iteration | allocating-effort |
| **Performance metrics with confidence (14.1)** | Standard error, and relative error for rare events | valuing-information |
| **Importance sampling for rare events (14.2)** | Oversample churners, weight them down. Orders of magnitude cheaper | valuing-information |
| **Robustness and stress testing (14.3)** | Does the ranking survive the assumptions? Plan simple, evaluate rich | stress-testing-plans |
| **Trade analysis, Pareto frontier (14.4)** | Growth versus margin, paywall versus reach. Stop inventing exchange rates | stress-testing-plans |
| **Adversarial analysis, most likely failure (14.5)** | The premortem, constrained to individually likely steps | stress-testing-plans |
| The five-option response menu (14.5) | Change the action space / objective / dynamics / solver, or do not deploy | stress-testing-plans |

**Why chapter 14 punches above its weight.** It is the only chapter about validating a
decision rather than making one, and validation is where operators are weakest. The
five-option response menu in particular stops a review from inventing a sixth option that
is really "hope".

## Part III: Model uncertainty (ch. 15-18)

| Concept | Where it lands | Skill |
|---|---|---|
| **Exploration versus exploitation (15.1)** | Every allocation of scarce time. The framing that makes the trade-off legible | allocating-effort |
| Beta belief over payoff rates (15.2) | Posterior per product, channel, variant | allocating-effort |
| Epsilon-greedy, explore-then-commit (15.3) | Undirected. Simple, and wasteful because it ignores past outcomes | allocating-effort |
| UCB1, quantile, softmax (15.4) | Directed exploration. Optimism under uncertainty | allocating-effort |
| **Posterior sampling / Thompson (15.4)** | The default. No tuning; share equals probability of being best | allocating-effort |
| Prioritized sweeping (16.2.3) | Alert on change-in-value times probability it matters, not on raw thresholds | tracking-beliefs |
| **R-MAX optimism for the untried (16.3)** | Do not kill a channel on 14 observations. The most expensive portfolio error | allocating-effort |
| Model-free versus model-based (17) | When the mechanism is opaque, learn what worked rather than modelling the market | learning-from-outcomes |
| **Eligibility traces (17.4)** | Credit for results that arrive months after the decision that caused them | learning-from-outcomes |
| Reward shaping (17.5) | Proxy metrics. Optimise the proxy and you stop optimising the outcome | learning-from-outcomes |
| **Experience replay, catastrophic forgetting (17.7)** | Replay old decisions deliberately, or recent events overwrite older lessons | learning-from-outcomes |
| Behavioural cloning (18.1) | Copying a competitor's playbook. Fails off the demonstrated path | reading-rivals |
| **DAgger: query the expert on your own states (18.2)** | Ask advisors about your actual funnel, not about best practice in general | reading-rivals |
| **Inverse reinforcement learning (18.4-18.5)** | Infer what a competitor optimises from what they have done | reading-rivals |

**Why chapter 17.7 matters more than it looks.** Catastrophic forgetting is the formal
name for a familiar organisational failure: learning only from the last four weeks, so the
same mistake returns on a two-year cycle and feels new each time. The fix - deliberate
replay of old experience - is a twenty-minute agenda item that almost nobody runs.

## Part IV: State uncertainty (ch. 19-23)

| Concept | Where it lands | Skill |
|---|---|---|
| **You observe readings, not the state (19)** | MRR is not observed. Settlement lag, refunds, disputes, annual lumpiness | tracking-beliefs |
| Discrete state filter (19.2) | Bayesian update across competing explanations for a metric move | tracking-beliefs |
| Kalman filter (19.3) | Separate drift from measurement noise in a weekly series | tracking-beliefs |
| **Diffuse initial beliefs (19.1)** | A confident wrong prior takes many observations to recover from | tracking-beliefs |
| **Particle deprivation (19.7)** | Every hypothesis ruled out means the model is wrong, not the world | tracking-beliefs |
| Information-gathering actions (20-22) | Some actions exist only to reduce uncertainty. Price them with VOI | valuing-information |
| Upper and lower bounds, gap heuristic (21-22) | Explore where the gap between optimistic and pessimistic estimates is widest | planning-horizons |

## Part V: Multiagent systems (ch. 24-27)

| Concept | Where it lands | Skill |
|---|---|---|
| Simple games, joint action space (24.1) | The payoff table. Two players, two or three moves | reading-rivals |
| Best response (24.2) | What they do if we move. Evaluating a move against their current behaviour is wrong | reading-rivals |
| Dominant strategy (24.3) | Rare, decisive. If you have one, play it and stop analysing | reading-rivals |
| **Nash equilibrium (24.4)** | Where the exchange of responses settles. Predicts the destination, not the next move | reading-rivals |
| **Prisoner's dilemma structure** | The shape of a price war. Both cut, both worse off, nobody erred | reading-rivals |
| **Iterated best response cycles (24.6)** | A cycle *is* a price war. Playing it faster does not help | reading-rivals |
| **Hierarchical softmax, level-k (24.7)** | Rivals are not perfectly rational. Most operate at level 1 or 2 | reading-rivals |
| **Fictitious play (24.8)** | Best-respond to their observed frequencies. Better near-term forecast than equilibrium | reading-rivals |
| Correlated equilibrium (24.5) | Public signals coordinating behaviour without collusion. Published pricing, standards | reading-rivals |
| Dec-POMDP, cooperative agents (27) | A team acting on local information toward a shared goal, which is what a company is | (not covered) |

## What does not transfer

Honesty about the boundary is part of using the book well.

- **Neural value function approximation (ch. 8, 13, appendix D).** You do not have enough
  data, and the interpretability loss is fatal for a decision you must defend.
- **Policy gradient methods (ch. 11-12).** They need thousands of episodes. You get a few
  dozen decisions a year.
- **Exact POMDP solution methods (ch. 20-21).** Alpha vectors, point-based value
  iteration. The machinery is heavy and the payoff needs a well-specified model you will
  not have.
- **Dec-POMDPs (ch. 27).** Correct as a model of a company and computationally hopeless.
  The useful residue is a warning: coordinating agents acting on local information is
  genuinely hard, so expect it to be, and pay for communication.
- **Anything requiring a specified transition function.** Value iteration, policy
  iteration and their relatives assume you can write `T(s' | s, a)`. In a business you
  cannot, and pretending otherwise produces analysis that looks rigorous and is not.

The dividing line: **the book's conceptual apparatus transfers; its heavy solution
machinery does not.** Everything in this repo sits on the first side of that line, and the
calculators are deliberately small.

## Reading order

If you read only part of the book, read it in this order:

1. **Chapter 6** - utility, maximum expected utility, value of information, irrationality.
   The densest value per page in the book for an operator.
2. **Chapter 15** - exploration and exploitation. Reframes every allocation decision.
3. **Chapter 14** - policy validation. The chapter nobody reads and everybody needs.
4. **Chapter 24** - multiagent reasoning. Short, and it inoculates against price wars.
5. **Chapter 19, sections 1-3** - beliefs. Why you should not react to a single reading.
6. **Chapter 9, sections 1-6** - online planning. Receding horizon and branch and bound.

Everything else is optional unless you are building autonomous systems, in which case
read the whole thing in order.

The book is free to read online under a CC BY-NC-ND licence at
`algorithmsbook.com`, and the source repositories are at `github.com/algorithmsbooks`.
