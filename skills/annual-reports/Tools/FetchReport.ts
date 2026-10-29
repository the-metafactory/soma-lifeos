import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { argumentsFor, catalogYearLabel, describe, entries, fetchText, networkUrl, loadCatalog, type Report, saveFile } from "./Catalog.ts";

export function extractText(html: string): string {
  return html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<h([1-6])\b[^>]*>/gi, (_, level: string) => `\n\n${"#".repeat(Number(level))} `)
    .replace(/<\/(?:h[1-6]|p|div|li|section|tr)>|<br\s*\/?>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/[\t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "report"; }

export function listCached(reportsDirectory: string): string {
  if (!existsSync(reportsDirectory)) return "No cached report pages\n";
  const files = readdirSync(reportsDirectory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(".md"))
    .map(entry => join(entry.parentPath, entry.name));
  return files.sort().join("\n") + "\n";
}

export function selectReport(directory: string, args: string[]): Report {
  if (args.length === 2 && args[0] === "--url") {
    const url = networkUrl(args[1]);
    return { vendor: "custom", name: basename(new URL(url).pathname) || "report", url, year: null };
  } else if (args.length >= 2 && !args.some(arg => arg.startsWith("--"))) {
    const vendor = args[0]?.toLowerCase() ?? "";
    const term = args.slice(1).join(" ").toLowerCase();
    const matches = entries(loadCatalog(directory)).map(entry => entry.report)
      .filter(report => report.vendor.toLowerCase().includes(vendor) && report.name.toLowerCase().includes(term));
    const unique = [...new Map(matches.map(report => [JSON.stringify(report), report])).values()];
    if (unique.length !== 1 || !unique[0]) throw new Error(`Expected one report, found ${unique.length}; narrow the vendor and title with ListSources.ts`);
    return unique[0];
  } else throw new Error("Usage: FetchReport.ts <vendor> <report-name> | --url <url> | --list-cached [--soma-home PATH]");
}

export async function fetchReport({ directory, args }: ReturnType<typeof argumentsFor>) {
  const reportsDirectory = join(directory, "Reports");
  if (args.length === 1 && args[0] === "--list-cached") return listCached(reportsDirectory);
  const report = selectReport(directory, args);
  const page = await fetchText(report.url);
  if (!/text\/(html|plain)|application\/xhtml\+xml/i.test(page.contentType)) throw new Error(`Unavailable: unsupported content type ${page.contentType || "missing"}`);
  const content = /html/i.test(page.contentType) ? extractText(page.content) : page.content;
  if (!content.trim()) throw new Error("Unavailable: page contains no readable text");
  const key = new Bun.CryptoHasher("sha256").update(JSON.stringify(report)).digest("hex").slice(0, 16);
  const path = join(reportsDirectory, slug(report.vendor), `${slug(report.name)}-${report.year ?? "unknown"}-${key}.md`);
  saveFile(path, `# ${report.vendor}: ${report.name}\n\nYear: ${catalogYearLabel(report.year)}\nRequested URL: ${report.url}\nRetrieved URL: ${page.url}\nFetched: ${new Date().toISOString()}\n\n## Retrieved page text\n\n${content}\n\n## Reading limits\n\nThis is a retrieved page, not an analysis or proof that the full report was available. Verify headings and figures in the original; registration pages and access challenges can return HTTP 200.\n`);
  return `Saved report page: ${path}\nSource: ${page.url}\n`;
}

if (import.meta.main) {
  try { process.stdout.write(await fetchReport(argumentsFor(process.argv.slice(2)))); }
  catch (error) { process.stderr.write(`Unavailable: ${describe(error)}; no new page saved\n`); process.exitCode = 1; }
}
