# soma-lifeos

Skills from Daniel Miessler's [PAI / LifeOS](https://github.com/danielmiessler/PAI), ported to run on top of [Soma](https://github.com/the-metafactory/soma) and installable as one arc library.

```bash
arc install https://github.com/the-metafactory/soma-lifeos
```

Soma projects each member into every substrate it is installed for, the same way it projects its own skills.

## What is in the pack

Two kinds of member, both listed in `arc-manifest.yaml`:

- **Moved skills.** Skills that came into Soma when `~/.claude/skills` (a PAI install) was migrated on 2026-06-12, and that Soma did not rewrite into its own doctrine. They move here from soma-home so Soma's core holds only what Soma owns.
- **Ported skills.** Skills first published in LifeOS 8.761.0 that fit a Soma principal, adapted to Soma's runtime: no LifeOS subsystems (STATVS, Assay, Pulse, Vigil) assumed.

Each member carries an `upstream:` block (repo, path, full commit). `NOTICE.md` holds the MIT notice.

## Gate

```bash
bun test test/
bun scripts/check-pack.ts
```

`check-pack.ts` checks the library manifest, that every member is `type: skill` with an `upstream:` pin to `danielmiessler/PAI` at a 40-hex commit, that each `SKILL.md` has a matching `name` and a description, and that `arc validate` passes on it.

## Execution logs

Paths in this section are relative to the configured Soma home. Moved thinking
and web skills write records under `memory/SKILLS/<skill>/`. An append-capable
file tool writes to `execution.jsonl`; a replacement-only tool creates a new
single-record `execution-<UTC timestamp>-<unique suffix>.jsonl` instead of
rewriting history. Collect both `execution.jsonl` and `execution-*.jsonl` and
order records by their `ts` field.

Earlier versions wrote all skills to `memory/SKILLS/execution.jsonl`. Existing
history stays there; installation does not migrate it. Aggregators must read
that shared file alongside the per-skill files for a complete history.

To migrate manually, parse each legacy JSON line and use a file tool to write
it to the directory identified by its `skill` field. Map earlier PascalCase
skill names to the installed kebab-case names. Keep unrecognized or malformed
records in the legacy file for inspection. Verify migrated record counts before
archiving the legacy file, then update aggregators to read only the migrated
copy to avoid counting records twice. Keep log data outside shell commands.

## Work

The pack's work lives on its orienteer map (issue #1). Decisions about which LifeOS ideas Soma adopts beyond skills live on [soma#1114](https://github.com/the-metafactory/soma/issues/1114).

## License

MIT. See `NOTICE.md` for the upstream copyright.
