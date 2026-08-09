# Skill lifecycle architecture

The skill installer is split into policy and mechanism so routing/orchestration code does not need to know about filesystem layout or Git commands.

## Sources of truth

- `skills.sources.json` describes where skills come from. It is versioned with `schemaVersion`.
- `.agents/skills.lock.json` records managed projections, source fingerprints, Git revisions when available, and rollback history.
- `.agents/.sdm-backups/<transaction>/` contains the previous lock and filesystem snapshots for transactional rollback.

`skills.sources.json` supports:

```json
{
  "schemaVersion": 1,
  "sources": [
    {
      "id": "local-decision-skills",
      "type": "local",
      "path": ".",
      "maxDepth": 2
    },
    {
      "id": "remote-skills",
      "type": "git",
      "repository": "https://github.com/example/skills.git",
      "ref": "main",
      "subdir": ".",
      "maxDepth": 2
    }
  ]
}
```

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

`GitSkillStore` owns clone/fetch/ref resolution and uses isolated cache checkouts per `repository + ref`. `SkillLifecycleManager` only consumes materialized sources.

## CLI

Stateful lifecycle commands:

```bash
sdm-skills sync --target agents --scope project --mode auto
sdm-skills status --scope project
sdm-skills rollback --scope project
sdm-skills rollback --scope project --transaction <id>
```

Use `--dry-run` to inspect a sync or rollback without writing targets or lifecycle state. Use `--force` only when an existing unmanaged or drifted target is intentionally being replaced.

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
materialize sources
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
- `source-changed-live` for a managed symlink whose source changed in place

Managed copy installs update from changed sources without requiring `--force`. Unmanaged or manually drifted targets require an explicit force or are rejected.
