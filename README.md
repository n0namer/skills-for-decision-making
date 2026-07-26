<h1 align="center">Skills for Decision Making</h1>

<p align="center">
  <b>Agent skills built from <a href="https://algorithmsbook.com"><i>Algorithms for Decision Making</i></a>.</b>
</p>

<p align="center">
  <i>Most business advice is vibes in a confident tone.<br/>This is the arithmetic underneath it.</i>
</p>

<p align="center">
  <a href="https://github.com/romainsimon/skills-for-decision-making/actions/workflows/ci.yml"><img src="https://github.com/romainsimon/skills-for-decision-making/actions/workflows/ci.yml/badge.svg" alt="check"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT"></a>
  <img src="https://img.shields.io/badge/skills-8-brightgreen" alt="8 skills">
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="zero dependencies">
  <img src="https://img.shields.io/badge/eval%20delta-%2B39%20pts%20over%20baseline-brightgreen" alt="eval delta +39 points over baseline">
</p>

---

Your agent already gives confident business advice. It will tell you to run the A/B test,
match the competitor's price cut, and kill the product with no conversions. Sometimes that
advice is right. You cannot tell which times, because there is no number under it.

These eight skills put the number under it.

```
> The team wants three weeks to build a churn prediction model.
  It flags at-risk accounts with 92% accuracy. Worth it?
```

> **Value of information: zero.** Not low. Zero.
>
> You already send the retention email to everyone in the at-risk segment, and the email
> costs nothing, so emailing everyone is already the optimal action. There is no prediction
> the model could return that changes what you do, and an observation that cannot change
> the action has no value however accurate it is. The 92% is doing rhetorical work, not
> decision work.
>
> This becomes worth building the day the retention action has a real per-customer cost,
> because then you have to choose who to spend it on. Test that first: it is cheaper than
> three weeks of engineering.

That is the whole idea. Eight situations you actually face, eight skills, a calculator
behind each one.

## What it is

Markdown skills that work with any agent that can read files: [Claude
Code](https://claude.com/product/claude-code), [Claude
Cowork](https://claude.com/product/cowork), [Codex](https://openai.com/codex/),
[Cursor](https://cursor.com), [Windsurf](https://windsurf.com), [Cline](https://cline.bot),
[Aider](https://aider.chat). Each skill is backed by a zero-dependency Node calculator, so
beta posteriors and expected utilities get computed rather than guessed in prose.

The source is [*Algorithms for Decision Making*](https://algorithmsbook.com) by Mykel
Kochenderfer, Tim Wheeler and Kyle Wray (MIT Press, 2022): 700 pages on acting under
uncertainty, written for collision-avoidance systems and Mars rovers. The mathematics is
aimed at aircraft. The problem structure is the one an operator faces every week.

[`references/book-map.md`](references/book-map.md) maps every technique chapter to where it
lands, including an honest list of what does not transfer and a suggested reading order if
you only read six chapters.

## What it is not

- **Not a forecasting or BI tool.** It does no data collection and connects to nothing. You
  bring the numbers; it tells you what follows from them.
- **Not an oracle.** Several of the calculators depend on utilities and priors you supply,
  and they say so in their own output. The value is that those inputs become visible and
  arguable instead of buried in someone's prose.
- **Not a replacement for judgement.** Two of the eight skills exist mainly to tell you
  that a question is a values decision, or that you should stop analysing and ship.
- **Not a port of the book's machinery.** Policy gradients, neural value approximation and
  exact POMDP solvers are in the book and deliberately not here. `references/book-map.md`
  says which parts do not transfer and why.

## Install

Paste into your agent:

```
Install all the skills from the github repo
https://github.com/romainsimon/skills-for-decision-making
Then read references/book-map.md and tell me which of my open decisions each one covers.
```

Or clone it:

```bash
git clone https://github.com/romainsimon/skills-for-decision-making
cd skills-for-decision-making && npm run check
```

Zero dependencies. Node 18 or later.

To install one skill rather than all eight, copy that skill's directory plus `scripts/`,
`lib/` and `examples/`, which it reaches by symlink.

**If your installer fetches files one by one through the GitHub API, it will turn those
symlinks into small text files** and the calculators will not run. Clone the repo instead,
or copy the three shared directories in by hand. `npm run check` catches this: the
validator fails when a skill's `scripts` entry is not a symlink.

## The eight skills

| Skill | Fires when | Gives you |
|---|---|---|
| **`framing-decisions`** | "should we do A or B", a stalled debate, before any decision memo | Explicit actions, a named unknown, a sourced prior, one utility scale, and a ranked answer with the margin over second place |
| **`valuing-information`** | someone proposes a test, survey, study, dashboard or consultant | What that information is worth before you buy it, which is **zero** whenever no result would change the action |
| **`allocating-effort`** | "what should I work on", budget splits, "should we kill this" | A defensible split across products or channels, and a refusal to cut anything that has not been tried enough times to judge |
| **`planning-horizons`** | roadmaps, backlog triage, short-term versus long-term arguments | A discount rate derived from runway, the depth past which planning stops paying, and a backlog pruned by arithmetic |
| **`stress-testing-plans`** | before a launch, price change or migration; premortems | Whether the ranking survives your assumptions, the most likely failure path, and the trade-off you are actually making |
| **`tracking-beliefs`** | a metric moved and someone wants to act | Whether the move is bigger than noise explains, and which explanation the evidence supports |
| **`reading-rivals`** | a competitor moved, or you are considering a price change | What they optimise, what they do next, and whether the exchange of responses ends somewhere you want to be |
| **`learning-from-outcomes`** | retrospectives, postmortems, monthly and quarterly reviews | A calibration score for your own forecasts, credit assigned across time, and changed numbers instead of lessons |

Each one is named for the situation, not the algorithm. Nobody wakes up wanting Thompson
sampling.

## Ask it things

```
> We have 90k in the bank, burn 30k a quarter, and I cannot decide between shipping
  the paid tier and doubling down on SEO.

> Split 40 hours a week across my five side projects. Product D has 14 signups and
  zero conversions, I want to kill it.

> Traffic dropped 30% last week. Everyone says it is a Google update.

> Our competitor just cut prices 30%. My instinct is to match so we do not look weak.

> The paywall made us 4900 a month but organic signups fell from 3100 to 900.
  Was it a mistake? Give me one number that settles it.

> Revenue is up 20% and everyone is crediting the paid tier we launched this quarter.

> Leadership wants a three-year plan. We replan monthly. Push back or comply?

> Score my last twelve predictions. Am I actually any good at this?
```

Some of the answers are "you are asking the wrong question", "that is a values decision and
no analysis can make it for you", and "stop analysing and ship". Those are the ones that
pay for the repo.

## The calculators

Agents are unreliable at beta quantiles, UCB bonuses and expected utility, so none of that
is left to prose. One CLI, seventeen commands, no dependencies:

```bash
node scripts/calc.js voi study.json           # is this research worth doing
node scripts/calc.js meu decision.json        # rank actions by expected utility
node scripts/calc.js allocate arms.json       # Thompson sampling over a budget
node scripts/calc.js compare arms.json        # P(A beats B), honestly
node scripts/calc.js track metric.json        # is this week's move real
node scripts/calc.js belief drop.json         # update across competing explanations
node scripts/calc.js robust plan.json         # does the ranking survive the assumptions
node scripts/calc.js pareto options.json      # the trade-off, without an invented score
node scripts/calc.js prune backlog.json       # branch and bound over a backlog
node scripts/calc.js horizon depths.json      # where planning deeper stops paying
node scripts/calc.js game market.json         # equilibrium, cycles, level-k play
node scripts/calc.js calibrate history.json   # are your probabilities any good
node scripts/calc.js credit result.json       # who earned this quarter's result
node scripts/calc.js discount --half-life 6   # what a discount factor commits you to
node scripts/calc.js precision --successes 3 --trials 10000   # how precise is this rate
node scripts/calc.js samplesize --p 0.002 --rse 0.2           # how many trials do I need
node scripts/calc.js importance --true-rate 0.002 --proposal-rate 0.1 --n 10000
```

`node scripts/calc.js help` lists them all.

Every command takes `--json`. There is a runnable example for each in
[`examples/`](examples/).

```
$ node scripts/calc.js allocate examples/allocate.json --budget 40

Strategy: thompson

arm        share  amount  posterior mean  observations
---------  -----  ------  --------------  ------------
product-c  52.7%  21.1    0.231           11
product-b  29.5%  11.8    0.176           72
product-d  7.4%   3       0.063           14
product-a  5.4%   2.2     0.099           421
product-e  5.0%   2       0.058           137

Too little evidence to judge (fewer than 30 observations). Do not cut these yet:
  product-c: 11 observations
  product-d: 14 observations
```

Note what that output refuses to do. Product D has zero wins from fourteen tries and still
gets hours, because zero from fourteen is a 6% estimate, not a 0% one. Killing it there is
the most common expensive mistake in a multi-product portfolio.

## Does it actually help

A skill that tells the model something it already knew is worse than no skill: it burns
context and adds nothing. So [`evals/`](evals/) runs every case twice, once with the skill
available and once against a neutral baseline, grades both with the same assertions, and
reports the **delta**. That delta is the only number that means anything.

```bash
node evals/run.js --plan-only              # what would run, spends nothing
node evals/run.js --skill valuing-information
node evals/run.js                          # 31 evals, 150 assertions, both modes
```

Measured with claude-sonnet-4-6 across all 8 skills, 31 cases, 150 assertions:

```
skill                   with   without  delta   assertions
----------------------  -----  -------  ------  ----------
valuing-information       95%      40%   + 55%          20
stress-testing-plans      85%      35%   + 50%          20
planning-horizons        100%      53%   + 47%          15
allocating-effort         94%      50%   + 44%          18
tracking-beliefs          89%      44%   + 44%          18
framing-decisions         89%      47%   + 42%          19
reading-rivals            89%      63%   + 26%          19
learning-from-outcomes    67%      57%   + 10%          21
```

**These are single-run numbers and the noise is real.** One run per arm, so treat the
per-skill figures as roughly plus or minus ten points. Concretely: `learning-from-outcomes`
measured 86/81 on one sweep and 67/57 on the next, with only a small edit between them.
Both arms moved together, which is variance rather than signal. The ordering at the top and
bottom of the table is stable; the middle rows are not meaningfully distinguishable from
each other.

**`learning-from-outcomes` is the weak one, at +10.** Its baseline scores 57%, because a
capable model already knows how to run a decent retrospective: separate process from
outcome, don't punish variance, check the proxy metric. The skill's remaining value is
narrow, mostly forcing the calculator to be run instead of Brier scores being estimated in
prose. If you only install some of these, install that one last.

Three things the harness caught, all worth knowing if you write skills yourself:

**The first draft of `valuing-information` scored 70%.** Reading the failed assertions
showed why: the skill said what to *think* and never said what to *put in the answer*, so
the good reasoning stayed in scratch work where nobody could challenge it. Adding an output
template took it to 95%. The same fix went into the other seven.

**My first baselines were rigged in my own favour, by accident.** They said things like
"you are advising on whether research is worth doing", which hands the model the exact
framing the skill teaches. Same skill, same evals: **0%** delta against a primed baseline,
**+55%** against a neutral one. Measure a framing skill against a primed baseline and you
will conclude, wrongly, that it does nothing.

**Editing a skill did not invalidate its cached results.** The with-skill prompt only points
at `SKILL.md`, so the cache key never changed when the file did, and `--reuse-cache` would
happily serve pre-edit answers. Every revision would have appeared to change nothing. The
key now includes a content hash of the skill and all its references.

## Layout

```
skills-for-decision-making/
├── framing-decisions/        each skill: SKILL.md + references/ + evals/
├── valuing-information/
├── allocating-effort/
├── planning-horizons/
├── stress-testing-plans/
├── tracking-beliefs/
├── reading-rivals/
├── learning-from-outcomes/
├── lib/                      the maths: beta posteriors, utility, VOI, games, filters
├── scripts/calc.js           the CLI
├── examples/                 a runnable input for every command
├── references/book-map.md    the book, chapter by chapter, mapped to where it lands
├── evals/                    with-skill versus without-skill harness
└── test/                     47 unit tests, 23 CLI smoke checks, spec validator
```

```bash
npm run check   # tests + CLI smoke + skill spec validation
```

The validator enforces the [Agent Skills
specification](https://agentskills.io/specification) plus this repo's own conventions: body
under 500 lines, references one level deep and resolving, a Gotchas section, an output
template, no backslash paths, at least three evals per skill, and no skill referencing a CLI
command that does not exist.

Several unit tests reproduce worked examples from the book, so you can trust the calculators
without rereading them: beta quantiles against example 15.3, the umbrella decision against
example 6.3, posterior win probabilities against example 15.1.

Skills reach the shared `scripts/`, `lib/` and `examples/` through symlinks, so each skill
works standalone while the calculators live in one place.

CI runs `npm run check` on Node 18 and 22 for every push and pull request: unit tests, CLI
smoke test, and skill spec validation. There is no install step, because there are no
dependencies, and keeping it that way is deliberate.

## Credit

The ideas are from *Algorithms for Decision Making*, Mykel J. Kochenderfer, Tim A. Wheeler
and Kyle H. Wray, MIT Press 2022, released under CC BY-NC-ND and free to read at
[algorithmsbook.com](https://algorithmsbook.com). Source at
[github.com/algorithmsbooks](https://github.com/algorithmsbooks). Buy the book. It is better
than this repo, and this repo is a translation layer on top of it.

Structure follows [Paperasse](https://github.com/romainsimon/paperasse), which does the same
job for French bureaucracy.

MIT licensed. Contributions welcome, and [`CONTRIBUTING.md`](CONTRIBUTING.md) is specific
about what a good skill and a good eval look like.
