**What this changes**

**If it changes a skill**

- [ ] `npm run validate` passes
- [ ] Evals were run for the affected skill, and the delta is in the description
- [ ] The skill was fixed rather than the assertions being loosened

Paste the before and after:

```
skill                   with   without  delta
```

**If it changes lib/ or scripts/**

- [ ] `npm test` passes, with a test covering the change
- [ ] No new dependencies

**If it adds a skill**

- [ ] At least three evals, one of which has "do less" as the right answer
- [ ] Listed in `marketplace.json` and `evals/config.json`
- [ ] Symlinks to `scripts/` and `examples/` in place
