import { argumentsFor, catalogYearLabel, describe, entries, loadCatalog } from "./Catalog.ts";

export function listSources({ directory, args }: ReturnType<typeof argumentsFor>): string {
  const catalog = loadCatalog(directory);
  let rows = entries(catalog);
  const [option, ...terms] = args;
  if (option) {
    const term = terms.join(" ").toLowerCase();
    if (option === "--search" || option === "--vendor") {
      if (!term) throw new Error(`${option} needs a search term`);
      rows = rows.filter(({ report }) => (option === "--vendor" ? report.vendor : `${report.vendor} ${report.name}`).toLowerCase().includes(term));
    } else if (option.startsWith("--")) throw new Error(`Unknown option: ${option}`);
    else {
      const category = args.join(" ").toLowerCase().replace(/\s+/g, "_");
      rows = rows.filter(row => row.category === category);
    }
    if (!rows.length) throw new Error(`No reports matched: ${args.join(" ")}`);
  }
  return [
    `# Annual security reports (${rows.length} of ${catalog.metadata.totalReports})`,
    `Catalog source: ${catalog.metadata.source}`, `Catalog updated: ${catalog.metadata.lastUpdated}`,
    ...(catalog.metadata.yearSource ? [`Index year source: ${catalog.metadata.yearSource}`] : []),
    ...rows.map(({ section, category, report }) =>
      `\n- ${report.vendor}: ${report.name}\n  Year: ${catalogYearLabel(report.year)}\n  Category: ${section}/${category}\n  URL: ${report.url}`),
  ].join("\n") + "\n";
}

if (import.meta.main) {
  try { process.stdout.write(listSources(argumentsFor(process.argv.slice(2)))); }
  catch (error) { process.stderr.write(`${describe(error)}\n`); process.exitCode = 1; }
}
