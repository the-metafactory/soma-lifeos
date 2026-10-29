# Analyse reports

1. Resolve every requested report with `ListSources.ts`. Record vendor, full title, publication year and edition URL. For a two-report request, retain both report identities through the answer. Ask which edition only if the request remains ambiguous after listing.
2. Read each original report, using the fetch tool for HTML pages or an available PDF reader for PDFs. A retrieved landing page is not the full report. If access fails, name that report and the reason; deliver only the evidence available and label the comparison incomplete. Do not infer findings from the catalog, search snippets or archive summaries.
3. Build an evidence ledger under the skill's state directory. Each claim records the exact page (`p. 12`, `pp. 12-14`) or section heading (`Section Initial Access`), the edition URL and the report identity. Verify every figure against its original locator. Claims comparing reports cite each contributing report.
4. Separate publication year from the data's observation period; read that period from each report. Compare definitions, populations, denominators and collection methods before comparing figures. Retain disagreements and vendor-specific actor names. Label your interpretation and cite its supporting observations; do not average incompatible metrics.
5. Write the ledger in the format below and run `bun Tools/Analyze.ts <evidence.json>` from the member directory. It refuses uncited claims, unknown report IDs, missing years, missing locators and reports with no cited claims. It checks citation structure, not whether a claim is true or a locator exists. Read the rendered answer against the originals before delivery.
6. Deliver the rendered analysis, naming all requested reports, the editions and coverage periods, and any unavailable reports or limits. Every factual claim must carry its report citation with page or section. Put caveats about source coverage in `limitations`; a factual finding belongs in a cited claim.

## Evidence format

The following is synthetic input illustrating the schema; the report URLs and numbers are not research evidence. Replace them with the reports you actually read.

```json
{
  "reports": [
    {"id": "dbir", "vendor": "Verizon", "name": "Data Breach Investigations Report", "year": 2026, "url": "https://example.org/dbir-2026", "coverage": "Read the methodology for the observed period"},
    {"id": "mtrends", "vendor": "Mandiant", "name": "M-Trends", "year": 2026, "url": "https://example.org/mtrends-2026", "coverage": "Read the methodology for the observed period"}
  ],
  "claims": [
    {"text": "The two reports describe different collection methods; compare their populations before comparing their figures.", "citations": [
      {"report": "dbir", "locator": "Section Methodology"},
      {"report": "mtrends", "locator": "p. 4"}
    ]}
  ],
  "limitations": "Synthetic schema example. Replace with evidence from both original editions."
}
```
