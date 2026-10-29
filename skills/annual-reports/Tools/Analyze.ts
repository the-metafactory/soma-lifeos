import { readFileSync } from "node:fs";
import { describe, httpUrl, object, reportYear, text } from "./Catalog.ts";

export function renderAnalysis(value: unknown): string {
  const input = object(value);
  if (!Array.isArray(input.reports) || input.reports.length < 2) throw new Error("Analysis needs at least two reports");
  const reports = input.reports.map(value => {
    const report = object(value);
    const year = reportYear(report.year);
    if (year === null) throw new Error("Verify the report year before analysis");
    return { id: text(report.id), vendor: text(report.vendor), name: text(report.name), year, url: httpUrl(report.url), coverage: text(report.coverage) };
  });
  const byId = new Map(reports.map(report => [report.id, report]));
  if (byId.size !== reports.length || new Set(reports.map(report => report.url)).size !== reports.length) {
    throw new Error("Reports need unique IDs and distinct edition URLs");
  }
  if (!Array.isArray(input.claims) || !input.claims.length) throw new Error("Analysis needs cited claims");
  const used = new Set<string>();
  const claims = input.claims.map(value => {
    const claim = object(value);
    const statement = text(claim.text);
    if (!Array.isArray(claim.citations) || !claim.citations.length) throw new Error("Every claim needs a citation");
    const citations = claim.citations.map(value => {
      const citation = object(value);
      const id = text(citation.report);
      const report = byId.get(id);
      if (!report) throw new Error(`Unknown cited report: ${id}`);
      const locator = text(citation.locator);
      if (!/^(?:p(?:p)?\.\s*\d+(?:[-–]\d+)?|section\s+\S.*)$/i.test(locator)) throw new Error("Citation needs p. N, pp. N-N, or Section <heading>");
      used.add(id);
      return `[${report.vendor}, ${report.name} (${report.year}), ${locator}](${report.url})`;
    });
    return `- ${statement} ${citations.join("; ")}`;
  });
  for (const report of reports) if (!used.has(report.id)) throw new Error(`Report has no cited claim: ${report.name}`);
  return [
    "# Cross-report analysis", "", "## Reports consulted", "",
    ...reports.map(report => `- [${report.vendor}: ${report.name} (${report.year})](${report.url}) — Data coverage: ${report.coverage}`),
    "", "## Claims", "", ...claims, "", "## Limitations", "", text(input.limitations), "",
    "Citation structure checked; source accuracy and comparability require reading the originals.", "",
  ].join("\n");
}

if (import.meta.main) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1 || !args[0] || args[0].startsWith("--")) throw new Error("Usage: Analyze.ts <evidence.json>");
    process.stdout.write(renderAnalysis(JSON.parse(readFileSync(args[0], "utf8"))));
  } catch (error) { process.stderr.write(`${describe(error)}\n`); process.exitCode = 1; }
}
