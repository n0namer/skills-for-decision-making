# Agent operating instructions

This repository has two distinct workflows. Do not mix them.

## 1. User asks to install or update skills from this repository/branch

Treat the GitHub repository as a **delivery source**, not as a user project.

Source configuration is authoritative in `skills.sources.json`.

When a user gives a link to this branch and asks to install/update/sync skills:

1. Read `skills.sources.json`, `update-policy.json`, and `UPDATE.md`.
2. Do **not** clone this repository into the user's project, Documents, EXPERIMENTS, or another normal workspace directory.
3. If updater code is needed locally, use only an OS/user cache or temporary directory outside the user's project. A cache checkout is an implementation detail and may be deleted later.
4. Keep the user's actual project/workspace as `--project-root`.
5. Fetch/materialize the latest configured Git ref through the lifecycle manager.
6. Update only supported target profiles that are already installed/managed unless the user explicitly asks to install into new targets.
7. Never use `--target all` merely to perform an update; it can create new projections.
8. Never overwrite an unmanaged/drifted target silently. Inspect it first. Use `--force` only for an intentional legacy adoption/replacement after verifying it is one of this repository's skills.
9. Do not make a full repository checkout or `npm run check` a prerequisite for a normal consumer update. Repository maintainer validation is separate from delivery. The updater/lifecycle operation itself must still fail closed on errors.
10. After synchronization, report old revision -> new revision, targets updated, skills changed, and final status.

### Same-session update + run

If the same user request says both **update the skills** and **run/use a skill afterward**, do not trust a skill definition that was loaded before synchronization. Many host agents cache skill instructions for the lifetime of a session.

After sync:

1. Resolve the new source revision from lifecycle status/lock.
2. Explicitly re-read the requested entry skill from the **new** resolved checkout/installed target:
   - `adaptive-problem-solver/SKILL.md` for general problem solving;
   - `decision-orchestrator/SKILL.md` for decision-analysis-only work.
3. Execute orchestration/controller code from that same revision.
4. For `decision-orchestrator`, use `bundle`, not `plan`, for normal execution.
5. For `adaptive-problem-solver`, use `sdm-solve`/`lib/problem-solver/` invariants for L2/L3 plan/replan operations rather than reproducing controller logic from memory.
6. Verify runtime/source revisions match when the invoked CLI exposes revision metadata.
7. Do not read an older cache checkout merely because its path was previously known.
8. If revisions differ, stop and reload the new revision before doing user work.

A successful `sync` plus `status: current` proves filesystem state, not that the host agent hot-reloaded an already cached skill definition.

Preferred lifecycle commands from a cache/bootstrap checkout:

```text
node <cache>/scripts/skills.js status --scope project --project-root <user-project>
node <cache>/scripts/skills.js sync --target agents --scope project --project-root <user-project> --mode auto
node <cache>/scripts/skills.js status --scope project --project-root <user-project>
```

Use `rollback` if a completed managed update must be reverted.

Detailed consumer procedure: `UPDATE.md`.

## 2. Maintainer asks to update our fork from the original upstream

This is a repository-development operation, not a skill-consumer update.

- Original upstream: `https://github.com/romainsimon/skills-for-decision-making.git`
- Our fork: `https://github.com/n0namer/skills-for-decision-making.git`
- Fork base branch: `master`
- Our active development/delivery ref is defined by `skills.sources.json`.

Keep `master` as the clean upstream-tracking base whenever possible. Update it from upstream with fast-forward-only semantics. Then merge the updated `master` into the active development branch and resolve any conflicts there, not by putting custom work into `master`.

Never force-reset or force-push shared branches as part of an automatic update workflow.

Detailed maintainer procedure: `UPDATE.md`.
