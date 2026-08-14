# Skill lifecycle architecture

The skill installer is split into policy and mechanism so routing/orchestration code does not need to know about filesystem layout or Git commands.

For agent-facing update behavior, read `../AGENTS.md` and `../UPDATE.md` first.

## Sources of truth

- `skills.sources.json` describes where skills come from. It is versioned with `schemaVersion`.
- `update-policy.json` describes consumer-vs-maintainer update policy. It does not duplicate the delivery repository/ref; those stay in `skills.sources.json`.
- `.agents/skills.lock.json` records managed projections, source fingerprints, Git revisions when available, and rollback history.
- `.agents/.sdm-backups/<transaction>/` contains the previous lock and filesystem snapshots for transactional rollback.

The active branch is configured as a Git source, not as a local-project source:

```json
{
  "schemaVersion": 1,
  "sources": [
    {
      "id": "decision-making-fork",
      "type": "git",
      "repository": "https://github.com/n0namer/skills-for-decision-making.git",
      "ref": "refactor/skill-lifecycle-foundations",
      "subdir": ".",
      "maxDepth": 2
    }
  ]
}
```

The manifest format still supports local sources for tests or intentionally local development, but consumer delivery for this fork is configured through Git.

Unknown source types, schema versions, scopes, targets and install modes fail closed.

## Boundaries

```text
skills.sources.json
        |
        v
SkillSourceRegistry ----> GitSkillStore
        |
        v
SkillLifecycleManager
   |       |        |
   v       v        v
Target   Lock    Installer
Resolver Store   (filesystem)
```

`GitSkillStore` owns clone/fetch/ref resolution. Repository fetch state is cached separately from materialized source trees. Each resolved commit is exposed through an immutable checkout keyed by repository/ref + commit SHA.

That matters for symlink installs: fetching a newer branch revision must not mutate the directory behind an already-installed symlink. The lifecycle manager sees the new revision at a new source path and can snapshot/swap the target transactionally while the old checkout remains available for rollback.

`SkillLifecycleManager` only consumes materialized sources and does not contain Git commands.

## Consumer delivery vs maintainer development

These are deliberately separate workflows.

Consumer delivery:

```text
GitHub delivery branch
        |
        v
cache/bootstrap updater code (outside user project)
        |
        v
GitSkillStore immutable revision cache
        |
        v
SkillLifecycleManager
        |
        v
already-used skill targets in the user's project/global scope
```

Maintainer development:

```text
romainsimon/... master
        |
        v
n0namer/... master
        |
        v
active development branch configured by skills.sources.json
```

A consumer update must not create a normal checkout in the user's project or silently run the maintainer upstream-sync workflow. See `../UPDATE.md`.

## CLI

Stateful lifecycle commands:

```bash
sdm-skills sync --target agents --scope project --mode auto
sdm-skills status --scope project
sdm-skills rollback --scope project
sdm-skills rollback --scope project --transaction <id>
```

Use `--project-root` when updater code is running from a cache checkout but the target is a separate user project.

Use `--dry-run` to inspect a sync or rollback without writing targets or lifecycle state. Use `--force` only when an existing unmanaged or drifted target is intentionally being adopted/replaced after verification.

Do not use `--target all` for a routine update unless the user explicitly wants new projections. Consumer agents should synchronize only target profiles already in use.

The old command remains available:

```bash
sdm-skills-install
```

It is a compatibility wrapper over the same implementation. It preserves the old skip-on-existing behavior and output shape and does not create lifecycle lock state.

## Sync transaction

A stateful sync follows this order:

```text
validate manifest/options
        |
        v
materialize immutable source revision
        |
        v
build complete plan
        |
        v
fail closed on conflicts
        |
        v
snapshot targets + previous lock
        |
        v
atomic per-target swap
        |
        v
write new lock atomically
```

If applying the plan throws after snapshots are created, changed targets and the previous lock are restored before the error is returned.

## Idempotency and drift

Repeated syncs do not create new transactions when managed targets and sources are unchanged.

`sdm-skills status` reports states such as:

- `current`
- `missing`
- `drifted`
- `source-changed`
- `source-changed-live` for a managed symlink whose deliberately local source changed in place

Remote Git delivery avoids mutable-source symlinks by materializing each commit into a distinct immutable checkout.

Managed copy installs update from changed sources without requiring `--force`. Unmanaged or manually drifted targets require an explicit force or are rejected.
