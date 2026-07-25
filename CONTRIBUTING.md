# Contributing to Skills for Decision Making

## The doctrine: a skill is a decision situation

Each skill covers a situation an operator recognises without being taught the theory -
"should we do A or B", "is this test worth running", "what do we work on next". It is not
an algorithm with a wrapper.

The decision test for a new skill: **would someone describe this situation to a colleague
in a sentence, without using a technical term?** If yes, it may be a skill. If it takes a
paragraph of theory to explain when it applies, the trigger will never fire and the skill
will sit unused.

Corollaries:

- **The algorithm is the engine, not the interface.** `allocating-effort`, not
  `thompson-sampling`. Nobody wakes up wanting Thompson sampling.
- **Coherent units, not fragments.** A skill that always loads alongside another should
  probably be one skill. A skill that fires on two unrelated triggers should be two.
- **Shared machinery lives at the root.** `lib/`, `scripts/` and `examples/` are shared by
  symlink so each skill stays self-contained without duplication.

## Adding a skill

1. Fork, then create a directory named for the situation, in gerund form, lowercase with
   hyphens: `framing-decisions`, `valuing-information`.
2. Write `SKILL.md` with frontmatter (`name`, `description`, `license`, `metadata.source`,
   `includes`). The `name` must match the directory.
3. Add `references/` for anything that does not need to be in context on every run.
4. Add `evals/evals.json` with at least three cases. **This is not optional** - without it
   there is no way to know whether the skill helps.
5. Symlink the shared resources: `ln -s ../scripts scripts && ln -s ../examples examples`.
6. Add the skill to `marketplace.json` and to `evals/config.json`.
7. Run `npm test && bash test/smoke.sh`, then open a PR.

## Writing a SKILL.md

Follows the [Agent Skills specification](https://agentskills.io/specification) and the
[authoring best practices](https://agentskills.io/skill-creation/best-practices).

**Frontmatter.** `name` max 64 chars, lowercase alphanumeric and hyphens, matching the
directory. `description` max 1024 chars, third person, saying both what the skill does
**and when to use it**, with the words a user would actually type. The description is the
only thing loaded at startup; it is what makes the skill fire.

**Body under 500 lines.** Everything beyond that goes in `references/`, one level deep
from `SKILL.md`, and the SKILL.md must say *when* to read each file. "See references/ for
details" is not a trigger; "read `references/likelihoods.md` before estimating how
discriminating a test is" is.

**Add what the model lacks; cut what it knows.** For every paragraph, ask: would the agent
get this wrong without it? A model already knows what expected value is. It does not know
that you should compute the perfect-information ceiling before pricing a real study.

**Include an output template.** This is the highest-leverage section, measured. The first
version of `valuing-information` scored 70% on its evals; adding a template that said what
belonged in the answer took it to 95%. Skills that only say what to *think* leave the
useful parts in the model's scratch work.

**Include a Gotchas section.** Concrete corrections to mistakes the agent will make
otherwise, not general advice. "Handle errors appropriately" is worthless. "A zero-win arm
never has a zero estimate" is the whole point.

**Provide defaults, not menus.** One recommended approach with a brief escape hatch beats
four options presented as equals. If you list four, the agent will pick badly and slowly.

**Prefer a calculator to prose.** Anything numeric goes in `lib/` with a test. Agents are
unreliable at beta quantiles and expected utility, and a wrong number stated confidently
is worse than no number.

## Writing evals

Three or more per skill, in `evals/evals.json`:

```json
{
  "id": 1,
  "name": "short-kebab-name",
  "prompt": "What a user would actually type, in their words, without naming the method",
  "expected_output": "What a good answer does",
  "files": ["examples/something.json"],
  "assertions": ["Each one independently checkable by a grader"]
}
```

Rules learned the hard way:

**Test a real gap.** Run the prompt without the skill first. If a capable model already
handles it, the eval measures nothing. The first version of eval 1 in
`valuing-information` scored 5/5 on the baseline and had to be replaced.

**Write the prompt in a user's words.** "Should we build a churn model, the 92% accuracy
is really good" - not "compute the value of information for a diagnostic observation".
A prompt that names the method tests whether the model can follow instructions, not
whether the skill fires.

**Make assertions binary and independent.** A grader must be able to answer yes or no from
the output alone. Avoid assertions about phrasing unless the phrasing is the point.

**Include at least one eval where the right answer is "do less".** Skills that only ever
recommend more analysis are worse than nothing.

**Do not tune assertions until the skill passes.** If the skill fails, fix the skill.
Editing the assertion to match the output is how a benchmark becomes decorative.

## Running evals

```bash
node evals/run.js --plan-only                 # what would run, spends nothing
node evals/run.js --skill valuing-information # one skill
node evals/run.js --reuse-cache               # skip runs already recorded
node evals/run.js --workers 8                 # more in flight
```

Needs a `claude` CLI on PATH and `ANTHROPIC_API_KEY` set. Adjust `runCommand` and
`gradeCommand` in `evals/config.json` for a different agent.

Every eval runs twice, with and without the skill, and only the **delta** counts. A skill
scoring 95% with and 95% without is not helping.

**Baseline prompts must stay neutral.** These skills teach framing, so a baseline that
names the frame hands the model the skill's contribution. Measured on
`valuing-information`: a primed baseline gave a 0% delta, a neutral one gave +55%. That is
a measurement artefact, not a real difference, and it is easy to fool yourself with.

## The revision loop

The first draft of a skill is a hypothesis. The loop:

1. Run the evals.
2. Read the **failed assertions**, and the passing traces too.
3. Ask what caused each failure - vague instruction, missing output requirement, or a
   genuine gap in the guidance.
4. Fix the skill, not the eval.
5. Re-run.

One pass improves a skill noticeably. Two or three is normal for anything subtle.

## Changing lib/

Anything in `lib/` needs a test in `test/`, and where the book gives a worked example, the
test should reproduce it. Several already do - beta quantiles against example 15.3, the
umbrella decision against example 6.3, posterior means against example 15.1. That is what
makes it possible to trust the calculators without rereading them.

```bash
npm test              # 47 unit tests
bash test/smoke.sh    # every CLI command against its example
```

No dependencies. That is deliberate: it means the skills work anywhere Node runs, with no
install step, and it keeps the supply chain empty.

## Licence

MIT. By contributing you agree your contribution ships under it.
