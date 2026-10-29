# Harmonize

## Gather evidence

Run `bun Tools/CollectInputs.ts [--soma-home PATH] [PATH ...]` from the member
directory. Paths are relative to that directory unless absolute. For filenames
beginning with a dash, place `--` before the path list. The collector recursively
reads text files, lists skipped files and errors, and follows installed skill
links in the default set. Explicit paths replace the default set entirely.

Read all collected sources, including each selected skill's workflows, tools
and references. Search for restatements of key rules **inside the collected
scope only**. A pointer to another source is a coverage gap until that source
is included by the principal. Never execute source code as part of analysis.
Name every gap; an incomplete run cannot claim complete coverage.

For each input, record its principles, ultimate aim and source citations. For
the default run, derive the shared aim from `profile/purpose.md`. For explicit
inputs, use only their stated aims. If the inputs have no supportable shared
aim, ask for one before making alignment judgments. Never invent a purpose.

## Compare aims and mechanisms

Apply these three lenses to the gathered sources before writing findings:

- First principles: separate hard constraints from inherited assumptions.
- System design: identify the smallest shared rule or owner that could unify
  the set without erasing useful differences.
- Systems thinking: trace loops, competing controls and fixes that shift the
  burden to another input.

These are analysis steps, not dependencies on separately installed skills.
Record what each lens changed or confirmed. If an optional thinking skill is
actually invoked, name it and its contribution; never claim an invocation that
did not run.

Classify relevant relationships using these terms:

| Relationship | Meaning |
| --- | --- |
| reinforcing | One input helps another achieve its aim. |
| productive tension | Opposing pressures serve the shared aim; keep their balancing rule. |
| drift | Vocabulary or stale wording differs without incompatible aims. |
| duplication | Two inputs own the same job. |
| straggler | A remaining statement contradicts a current intent elsewhere in scope. |
| conflict | The cited rules demand outcomes that cannot both hold under the named conditions. |
| gap | A part of the stated aim has no support in scope. |

Every conflict includes both source paths, line numbers and exact excerpts,
plus the conditions under which one rule defeats the other. A wording
difference alone is insufficient. Review every finding against the original
sources; a second reader's agreement is not evidence.

## Write and check the report

Use these eight headings in this order:

1. **The verdict**: one sentence on coherence and the biggest fault line, or
   `No conflicts found within the inspected scope.` Include coverage limits.
2. **Summit**: the shared aim and its source, or the unresolved aim that
   prevents alignment judgments.
3. **Inputs**: one row per source with path, principles and aim. Include the
   exact scope, skipped files and unreadable inputs here.
4. **Harmony map**: use the table below. Every row cites A and B as `path:line`
   in separate cells. For a gap, B can be the source that states the unmet aim.
   Include exact excerpts in Evidence and the collision conditions in Mechanism.
5. **Stragglers**: list every leftover found in the inspected scope as a row
   starting with `path:line`, the stale rule, the current intent's citation and
   the proposed correction. Say `None found.` when empty.
6. **Unifying principle**: the smallest statement resolving the most conflicts,
   or `None identified.`
7. **Recommendations**: at most eight, ranked by harmony gained per effort.
   Each names finding IDs, the destination path, a verification probe and the
   approval needed. Keep the table headers with zero data rows when none are
   warranted, and say `None warranted.`
8. **Lens trail**: one line per lens with the finding it changed or confirmed.

```markdown
## Harmony map

| A | B | Relationship | Mechanism | Evidence (both sides) |
| --- | --- | --- | --- | --- |

## Recommendations

| # | Change | Resolves | Lands in | Proof it worked | Needs yes? |
| --- | --- | --- | --- | --- | --- |
```

Give findings stable IDs such as F1 in their Mechanism cells. When the harmony
map is empty, explicitly state `No conflicts found within the inspected scope.`
An absence claim covers only inspected sources, not excluded or unreadable ones.
Escape literal table pipes in excerpts as `&#124;`.

Save the report under `${SOMA_HOME}/memory/SKILLS/unify/`, with the same home
resolution as the collector. Run `bun Tools/CheckReport.ts <report.md>` and
correct any contract errors before printing the report. The checker cannot
verify quotations, scope completeness, semantic truth or recommendation value;
check those against the gathered sources yourself.

Stop at recommendations. Apply an accepted recommendation only in a separately
authorized implementation task.
