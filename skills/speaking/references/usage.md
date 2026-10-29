# Configuration and tools

Run from the member directory:

```sh
bun Tools/Speaking.ts search
bun Tools/Speaking.ts search --json
bun Tools/Speaking.ts search --save
bun Tools/Speaking.ts search --config /path/to/private-config.json
bun Tools/Speaking.ts draft --call https://organizer.example/cfp \
  --title 'Deciding when to isolate a service' \
  --angle 'A decision framework for weighing containment against service continuity during an incident.' \
  --takeaway 'Map containment decisions to the incident objectives.' \
  --takeaway 'Identify who has authority to accept service disruption.' \
  --takeaway 'Rehearse the decision with a short tabletop exercise.' --save
```

`--call` must exactly match an open result's URL. Drafting performs a fresh search using the effective config; an expired call is rejected. A draft is a starting abstract with takeaways, not automatic completion of an organizer's form. The agent reads the CFP and adapts it before presenting it.

`--soma-home PATH` overrides `SOMA_HOME`, which otherwise defaults to `$HOME/.soma`. The private directory is `memory/SKILLS/speaking/` within that home. Put private overrides in its `config.json`; it replaces the bundled config as a whole. `--config PATH` reads an explicit alternative. `--save` creates `opportunities.md` or `proposal.md`, replacing the previous file of that kind. Search JSON is printed only when `--json` is selected; saved output remains Markdown. `--json` applies only to search. Terminal output is otherwise Markdown. Nothing is sent or scheduled.

Each topic has a `name` and nonempty `terms` array. Match terms are case-insensitive whole phrases in the organizer page's visible text; add synonyms deliberately. This is a discovery heuristic, not an assessment of speaker eligibility or a guarantee of editorial fit. Every result names the matched topics for the agent to assess. `region` matches a source's configured region, ignoring case; geography is curated metadata rather than inferred from a domain name.

Each source needs `name`, HTTP(S) `url` without credentials, `region`, `location`, `locationText`, `deadlineLabel`, `openText` and `payment`. `locationText` and `openText` must occur in the current visible page. `location` is the human-readable city/country verified by the person adding the source. The literal `deadlineLabel` must occur exactly once, immediately followed by a date in `YYYY-MM-DD`, `DD.MM.YYYY` or English `D Month YYYY` form. More than one matching label is rejected as ambiguous. The first bundled source uses `Submission deadline:`. Adapt labels or URLs when the organizer changes its page; failed extraction never falls back to an old deadline.

`payment` is either `{ "status": "unknown" }`, or `{ "status": "yes", "evidence": "literal organizer statement of speaker payment" }` (use `no` for an explicit statement of no fee). Evidence must appear in the current visible page; if it disappears, payment becomes unknown. Use a quote that establishes a fee, not merely expenses. No source payment is inferred from other speakers' participation.

New sources need network permission from the caller/runtime for their hosts; config does not expand the member manifest's grants. Explicit config and home overrides also need filesystem permission when outside the manifest paths. Requests have a 20-second deadline and a 2 MB body limit. Redirects are refused; configure the final organizer URL after checking it. HTTP, transport and extraction failures are reported per source, while healthy sources still produce results. Exit 0 means at least one in-region source was checked successfully (possibly no matches), 1 means every in-region source failed or none was configured, and 2 means invalid input, an unavailable chosen call, or local I/O failure.

Only sources in the configured region are requested. Past deadlines are excluded before topic matching. The tool lists only dates after the current UTC calendar day. Calls due today are held out for manual verification of the closing time, because a date alone cannot prove they are still open. Output notes that timezone and precise closing time need organizer verification. An explicit closed or cancelled CFP marker overrides a future date. Urgency is Immediate within 14 days, High Priority within 30, then Worth Watching. Calls are sorted by deadline. Search results describe this run only; no submission history, archives or notification service is maintained.
