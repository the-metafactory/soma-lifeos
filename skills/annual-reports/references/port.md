# Port reference

Member source: `danielmiessler/PAI`, `LifeOS/install/skills/AnnualReports`, commit `fb9aef4640a73feae4c2e6483b26f58491ce2665`. The MIT notice is in [NOTICE.md](../../../NOTICE.md).

## Catalog provenance

The 492 vendor/title/URL entries and category assignments in the pinned seed are retained. The pinned seed did not record publication years. Each entry was matched by the exact vendor, title and URL against the [report index at revision 10100c7ab4c85e3cbb7cd2c2b7ae83b625985919](https://github.com/jacobdjwilson/awesome-annual-security-reports/blob/10100c7ab4c85e3cbb7cd2c2b7ae83b625985919/README.md); all 492 matched, and their explicitly stated years were added. `metadata.yearSource` records that immutable source. Catalog years identify editions, not the period the data covers. Verify the edition on the original report before analysis.

`UpdateSources.ts` reads the current README from that index's main branch. It parses Analysis and Survey categories, keeps vendor report URLs, and captures explicitly stated years; missing years stay `null` and list as unknown. It rejects empty parses, malformed report entries, invalid URLs and loss of a previously populated section. An accepted update replaces the saved catalog atomically. `--dry-run` and `--diff` both preview counts without writing; counts include identity, category, URL or year changes. `--readme PATH` parses a local README instead of fetching it, for offline review and testing. The output labels local input; the catalog origin remains the index URL and does not prove a network fetch. The bundled seed stays unchanged.

## Fetching and state

State is confined to the selected Soma home's `memory/SKILLS/annual-reports/`: `sources.json`, `Reports/`, and agent-authored evidence and analyses. An absent saved catalog uses the bundled seed; invalid saved state never silently resets it. Update writes use a unique temporary file and rename. Concurrent updates are complete snapshots with the last successful write winning.

The fetch tool selects exactly one catalog result, or accepts `--url URL`. It saves full extracted HTML text with headings, source URL, redirected URL and retrieval timestamp. The filename includes the edition and a hash of the report identity to keep distinct reports apart. These are retrieved pages, not generated summaries. HTTP errors, transport failures, empty text, unsupported content and PDFs exit nonzero without writing a new page; an older cached page may remain. A successful HTTP response can still be an access challenge or registration page, so read it before making claims. PDF reading and registration remain manual or use the host's existing reader. Requests identify `Soma-AnnualReports/1.0`; they time out after 30 seconds and stop after 10 MB of text. No contact value or secret is embedded.

The manifest lists the bundled publishers' hosts and the report index host. New publishers, custom `--url` destinations and redirects to other hosts require the caller's runtime to permit those network destinations. Network fetching is read-only HTTP(S), follows redirects, and rejects URL credentials. Only request trusted public report URLs; the tools do not isolate untrusted network destinations. `--soma-home PATH`, `--readme PATH`, and the analysis evidence path require caller permission for those paths; flags do not expand filesystem grants.

## Adaptations and omissions for the supervisor's PR body

- Replaced upstream customization and path helpers with the Soma state directory; omitted Config.md contact parsing, preferences overlays and Setup.md installation instructions. No private customization, personal data or saved state was copied.
- Replaced category-count-only default listing with the full source list, year and URL. Added runtime input validation and isolated state for updates and fetched pages.
- Replaced truncated landing-page summaries with full retrieved page text and explicit reading limits. Added a citation-checking analysis renderer; the agent still reads originals and performs the synthesis.
- No dashboard, publishing, scheduling, inference helper or other upstream subsystem integration is included. The pinned member contains no dashboard/API implementation to port. Installation and machine-wide projection belong to the pack's integration work.
