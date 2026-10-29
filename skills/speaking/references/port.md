# Speaking port

Source: `danielmiessler/PAI`, `LifeOS/install/skills/Speaking`, commit `fb9aef4640a73feae4c2e6483b26f58491ce2665`. The root [NOTICE.md](../../../NOTICE.md) carries the MIT notice.

The port retains topic-fit research, organizer verification, deadline ordering, urgency windows, explicit pay status, and locally drafted talk/panel proposals. The upstream list check becomes validation at collection time: missing, malformed, ambiguous and expired deadlines cannot become active results. The new Bun tools search configured organizer pages without a model or API account. Broader discovery uses the calling agent's web tools, then adds verified pages to private config.

## Omitted upstream behavior

The port omits the upstream research-fleet workflow, subsystem path helper, personal customization paths, notification delivery (including Vigil), scheduled monitoring, inference integration, speaker-record auto-loading, contact research, paid-only/prestige gating, fee tiers, speaker/bureau monitoring, submission tracking and archive migration. Outputs go to the terminal or local Markdown. Unknown and unpaid calls may appear with explicit payment labels, as this node requests topic and region fit rather than a minimum fee.

No personal overlay, speaker biography, employer, contact details, credentials, goals or private state was copied. The bundled topics and European region come from this node's specification. No upstream file containing personal data was copied into the member.

## Bundled source evidence

The [organizer snapshot](../../../test/fixtures/speaking-fraunhofer-2026-10-29.json) records selected visible-text excerpts fetched from the bundled source on 29 October 2026. It includes the capture time, source URL, SHA-256 of the fetched HTML, and the count of deadline-label occurrences in the full visible text. Contact details and form fields are omitted.

`bun test test/speaking.test.ts` checks the bundled config against these excerpts: the open-call marker, location and unique supported deadline yield a matching call due 30 November 2026. It also checks expiry after that date. This is dated extraction evidence; it does not prove the page remains unchanged. Run `bun Tools/Speaking.ts search --config config.json` from the member directory to check the current page. Refresh the source when its conference cycle ends.
