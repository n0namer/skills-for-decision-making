# Update workflows

This repository supports two different update jobs. Choose the one the user actually asked for.

---

## A. Consumer update: update installed skills from this branch

Use this when the user gives a link to this repository/branch and says things like:

- update the skills
- install the latest skills
- sync the skills from this branch
- refresh my local agent skills

The repository is a **delivery source**. Do not create a normal project checkout for it in the user's Documents, EXPERIMENTS, workspace, or current project.

### Authoritative source

Read `skills.sources.json`. At the time of writing it points to the active delivery branch in our fork.

Do not replace that Git source with `type: local` for consumer updates.

### Bootstrap rule

If the updater code is not already available locally, obtain this repository only in a cache or temporary directory outside the user's project.

Examples of acceptable locations:

```text
~/.cache/sdm/bootstrap/skills-for-decision-making
%LOCALAPPDATA%/sdm/bootstrap/skills-for-decision-making
<OS temp>/sdm-bootstrap/skills-for-decision-making
```

A bootstrap/cache checkout is disposable implementation state. It is not a user project and must not be presented as the result of the update.

When creating or refreshing a bootstrap checkout on Windows, keep shell scripts as LF. This repository includes `.gitattributes` for that purpose.

### Project root rule

The user's real workspace remains the lifecycle `--project-root`.

For example, if the user is working in:

```text
D:/Users/NIKITA/Documents/EXPERIMENTS/my-project
```

and the updater code lives in a cache, execute conceptually as:

```text
node <cache>/scripts/skills.js ... --project-root D:/Users/NIKITA/Documents/EXPERIMENTS/my-project
```

Do not use the cache checkout as `--project-root`.

### Supported target locations

Project scope:

```text
agents / codex -> <project>/.agents/skills
opencode       -> <project>/.opencode/skills
cline          -> <project>/.cline/skills
claude         -> <project>/.claude/skills
```

Global scope:

```text
agents / codex -> ~/.agents/skills
opencode       -> ~/.config/opencode/skills
cline          -> ~/.cline/skills
claude         -> ~/.claude/skills
```

`agents` and `codex` intentionally share the same physical target.

### Which targets to update

For an **update**, only synchronize target profiles that are already in use for this repository's skills.

Do not run `--target all` simply because the command exists. `all` may create new projections the user never asked for.

Determine existing profiles from lifecycle lock state and/or existing matching skill directories.

Then run the lifecycle operation for each existing physical target profile.

Example for a project that already uses `.agents/skills`:

```text
node <cache>/scripts/skills.js status --scope project --project-root <user-project>
node <cache>/scripts/skills.js sync --target agents --scope project --project-root <user-project> --mode auto
node <cache>/scripts/skills.js status --scope project --project-root <user-project>
```

If the project also already uses OpenCode, synchronize that profile separately:

```text
node <cache>/scripts/skills.js sync --target opencode --scope project --project-root <user-project> --mode auto
```

Repeat only for profiles that actually exist or are already managed.

### Existing legacy installs without a lock

Old/manual installations may exist before `.agents/skills.lock.json` was introduced.

The lifecycle manager deliberately fails closed instead of silently overwriting them.

When this happens:

1. inspect the existing target;
2. verify the directory name and `SKILL.md` identity correspond to a skill provided by this repository;
3. perform a dry-run with `--force` for that already-existing profile;
4. if the plan only replaces the intended decision-making skills, perform the real sync with `--force`;
5. after that, normal managed updates should no longer need `--force`.

Do not use `--force` to replace unrelated or ambiguous directories.

### What `sync` must do

The configured Git source is materialized by `GitSkillStore` into the lifecycle cache.

Git revisions are materialized into immutable commit-SHA checkout directories. A new remote revision therefore gets a new source directory instead of mutating the source behind an installed symlink. This preserves transactional swap and rollback semantics.

The lifecycle flow is:

```text
GitHub repository + ref
        ↓ fetch/resolve latest commit
immutable cache checkout for commit SHA
        ↓
discover skills
        ↓
compare with installed managed targets
        ↓
snapshot previous targets + lock
        ↓
atomic target replacement
        ↓
write new skills.lock.json
```

### Consumer validation

A consumer skill update must not be blocked merely because the full repository maintainer test suite cannot run in the user's environment.

In particular, do not turn a local shell/tooling issue into "skills were not updated" when the lifecycle operation itself can safely run.

The lifecycle manager must still fail closed on its own errors, conflicts, invalid manifests, or filesystem failures.

If practical, updater-focused Node tests may be run from the bootstrap cache. Full `npm run check` is maintainer/repository validation, not a mandatory precondition for every consumer sync.

### Required completion report

After the update, report:

```text
source repository
source ref
old resolved commit SHA
new resolved commit SHA
updated target profiles
skills changed
final lifecycle status
```

The result is the updated installed skills, not the bootstrap repository cache.

### Rollback

For a managed update:

```text
node <cache>/scripts/skills.js rollback --scope project --project-root <user-project>
```

Use `--transaction <id>` when a specific transaction must be restored.

---

## B. Maintainer update: pull the original project into our fork

Use this only when the user explicitly wants to update/develop the fork itself.

This operation is separate from consumer skill delivery.

### Repositories

Original upstream:

```text
https://github.com/romainsimon/skills-for-decision-making.git
```

Our fork:

```text
https://github.com/n0namer/skills-for-decision-making.git
```

Fork base branch:

```text
master
```

The active development/delivery ref is the `ref` configured in `skills.sources.json`.

### Branch model

```text
romainsimon/skills-for-decision-making : master
                    ↓ fast-forward upstream changes
n0namer/skills-for-decision-making     : master
                    ↓ merge updated base
active development branch from skills.sources.json
```

The goal is to keep our `master` as close as possible to a clean mirror/tracking base for the original upstream while keeping our custom lifecycle work on the development branch.

### Safe maintainer procedure

Use a real maintainer checkout for this workflow.

Configure remotes conceptually as:

```text
origin   = https://github.com/n0namer/skills-for-decision-making.git
upstream = https://github.com/romainsimon/skills-for-decision-making.git
```

Then:

```text
git fetch origin
git fetch upstream

git switch master
git merge --ff-only upstream/master
git push origin master

git switch <active-development-ref>
git merge master
```

Resolve custom-code conflicts on the development branch, not by adding fork-specific changes to `master`.

After the development-branch merge, run the repository validation appropriate for the maintainer environment, then push the development branch.

### Stop conditions

Stop instead of guessing when:

- fork `master` cannot fast-forward to `upstream/master`;
- `master` contains fork-specific commits;
- a merge conflict changes decision-engine/lifecycle semantics and cannot be resolved mechanically;
- a force push/reset would be required.

Do not automatically force-push or destructively reset shared branches.

---

## One-line intent mapping for agents

If the user says:

> Update my skills from this branch/link.

Run **Consumer update A**.

If the user says:

> Update our fork from the original project/upstream.

Run **Maintainer update B**.

Never substitute B for A.
