# Port reference

Ported from `danielmiessler/PAI`, `LifeOS/install/skills/SecurityUpdates`, commit `fb9aef4640a73feae4c2e6483b26f58491ce2665`. The root [NOTICE.md](../../../NOTICE.md) contains the MIT notice.

## Collection and ranking

The six upstream source identities, URLs, types and category assignments remain in `sources.json`. Feed URLs select machine-readable listings where available. Swiss NCSC hot topics and CERT-EU advisories are added. The NCSC URL follows the publisher's redirect to its current site. RSS and Atom are read as bounded listing formats; HTML adapters select NCSC cards and newsletter article links. HTTP errors, timeouts, unexpected formats and empty unrecognized listings are reported as unavailable. A valid empty feed counts as available.

Candidates dated within seven days, plus undated candidates, are considered. Dates beyond the current time are excluded. Date-only listings use midnight UTC so the host timezone cannot move their calendar date. Every item links to its listing's article URL; summaries are short excerpts from publisher listings, not generated claims about an unread article. An absent summary stays absent.

Ranking is deterministic within News, Research and Ideas. Active exploitation and breach terms add 40 points, critical severity or remote code execution adds 25, an actionable patch or mitigation adds 15, and publication recency adds up to 14. A source's first category is its fallback; incident terms select News, research terms select Research, and strategy terms select Ideas. The global top 32 are then grouped into the three sections. Scores are a reading priority heuristic, not CVSS or an assessment of the reader's exposure.

Canonical article URLs ignore scheme, `www`, fragments, trailing slashes and tracking parameters, while preserving article-identifying query parameters and ports. Identical normalized titles on the same publication day also merge duplicates across publishers. Undated titles merge only within the current batch; their URLs persist across runs. A recurring headline on a later date or a new article about a previously covered CVE can appear. Other differently worded reports may need editorial merging; the tool does not claim semantic story equivalence. Merged items retain each source attribution.

## State and failures

`seen.json` contains `version: 1`, `last_check_timestamp`, and an array of SHA-256 keys. Each key identifies a canonical URL or a normalized title with its publication day. All eligible candidates are remembered, including merged aliases and overflow below the cap. The digest reports how many new items the cap omitted. Keys have no expiry, so unchanged article URLs cannot return after a retention window. A missing file starts fresh; a malformed file fails without silently discarding history. Each run covers the latest seven days of available listings, even after a longer gap; it does not promise complete coverage since the previous check.

The collector creates its state directory under the selected Soma home. An exclusive `collect.lock` prevents concurrent writers. State and digest use temporary files followed by rename. State is saved after the digest file. If every source is unavailable, state and the last successful digest stay unchanged. If the process is killed, remove `collect.lock` only after verifying that no collector still owns that Soma home. Keep a separate Soma home for probes; never reset production seen-state for a test.

`bun Tools/Collect.ts --help` lists flags. Exit 0 means at least one source responded, 1 means all sources were unavailable, and 2 means invalid input, malformed state or a local I/O error. `--json` returns the same items and source statuses used to render the Markdown digest. Human output and `digest.md` contain explicit source status and per-category counts, including empty runs.

## Upstream adaptations and omissions

The standalone collector replaces agent-specific WebFetch orchestration. The upstream state helpers are adapted to the Soma home without the upstream Paths and Invariant imports. Deterministic ranking replaces model-based editorial ranking. The three categories and 32-item limit remain.

The upstream customization-directory convention and setup instructions are omitted. A private JSON source list replaces prose preferences; only its `sources` array configures the collector. The upstream target of roughly ten items per category is omitted; the cap stays fixed at 32 with global priority ranking. No upstream subsystem integration, personal overlay, execution log, scheduler, inference helper or publishing action is included. No personal preference or state file was copied.
