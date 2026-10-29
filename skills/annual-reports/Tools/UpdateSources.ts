import { readFileSync } from "node:fs";
import { join } from "node:path";
import { argumentsFor, type Catalog, describe, entries, fetchText, httpUrl, loadCatalog, parseCatalog, saveFile, text, upstream } from "./Catalog.ts";

export function parseMarkdownReports(markdown: string, source = upstream): Catalog {
  const categories: Catalog["categories"] = { analysis: {}, survey: {} };
  let section: keyof Catalog["categories"] | null = null;
  let category = "";
  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      section = line === "## Analysis Reports" ? "analysis" : line === "## Survey Reports" ? "survey" : null;
      category = "";
    } else if (section && line.startsWith("### ")) {
      category = line.slice(4).toLowerCase().replace(/\s+/g, "_");
      categories[section][category] ??= [];
    } else if (section && category && /^-\s+\[/.test(line)) {
      const match = /^-\s+\[([^\]]+)\]\(([^)]+)\)\s*-\s*\[([^\]]+)\]\(([^)]+)\)(?:\s*\((\d{4})\))?/.exec(line);
      if (!match) throw new Error(`Unrecognized report entry in ${section}/${category}`);
      const [, vendor, url, name, , year] = match;
      categories[section][category]?.push({ vendor: text(vendor), name: text(name), url: httpUrl(url), year: year ? Number(year) : null });
    }
  }
  const metadata = { source, lastUpdated: new Date().toISOString().slice(0, 10), totalReports: 0 };
  const result = { metadata, categories };
  metadata.totalReports = entries(result).length;
  return parseCatalog(result);
}

export function compareReports(current: Catalog, updated: Catalog) {
  const keys = (catalog: Catalog) => new Set(entries(catalog).map(({ section, category, report }) =>
    JSON.stringify([section, category, report.vendor, report.name, report.url, report.year])));
  const before = keys(current), after = keys(updated);
  return { added: [...after].filter(key => !before.has(key)).length, removed: [...before].filter(key => !after.has(key)).length };
}

export async function updateSources({ directory, args }: ReturnType<typeof argumentsFor>) {
  let dryRun = false, diff = false, readme: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--diff") diff = true;
    else if (arg === "--readme") {
      readme = args[++i];
      if (!readme || readme.startsWith("--")) throw new Error("--readme needs a path");
    } else throw new Error(`Unknown option: ${arg}`);
  }
  const markdown = readme ? readFileSync(readme, "utf8") : (await fetchText(upstream)).content;
  const updated = parseMarkdownReports(markdown);
  const current = loadCatalog(directory);
  for (const section of ["analysis", "survey"] satisfies (keyof Catalog["categories"])[]) {
    if (Object.values(current.categories[section]).some(reports => reports.length) &&
      !Object.values(updated.categories[section]).some(reports => reports.length)) throw new Error(`Parsed no ${section} reports; catalog unchanged`);
  }
  const changes = compareReports(current, updated);
  if (!dryRun && !diff) saveFile(join(directory, "sources.json"), JSON.stringify(updated, null, 2) + "\n");
  return `Input: ${readme ? "local README (not a verified upstream fetch)" : upstream}\nTotal parsed: ${updated.metadata.totalReports}\nNew or changed reports: ${changes.added}\nRemoved or changed reports: ${changes.removed}\n${dryRun || diff ? "Preview only; no changes saved" : "Updated state catalog"}\n`;
}

if (import.meta.main) {
  try { process.stdout.write(await updateSources(argumentsFor(process.argv.slice(2)))); }
  catch (error) { process.stderr.write(`${describe(error)}\n`); process.exitCode = 1; }
}
