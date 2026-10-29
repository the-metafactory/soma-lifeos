import { afterAll, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { YAML } from "bun";
import { argumentsFor, entries, httpUrl, loadCatalog, parseCatalog, seedPath } from "../skills/annual-reports/Tools/Catalog.ts";
import { parseMarkdownReports } from "../skills/annual-reports/Tools/UpdateSources.ts";
import { renderAnalysis } from "../skills/annual-reports/Tools/Analyze.ts";
import { extractText } from "../skills/annual-reports/Tools/FetchReport.ts";

const member = resolve(import.meta.dir, "../skills/annual-reports");
const homes: string[] = [];
const servers: ReturnType<typeof Bun.serve>[] = [];
function home() { const path = mkdtempSync(join(tmpdir(), "annual-reports-test-")); homes.push(path); return path; }
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Fixture output is incomplete");
  return value;
}
afterAll(() => { for (const server of servers) server.stop(true); for (const path of homes) rmSync(path, { recursive: true, force: true }); });

async function cli(tool: string, args: string[], somaHome = home(), fixtureOrigin?: URL) {
  const preload: string[] = [];
  if (fixtureOrigin) {
    const path = join(home(), "fixture-transport.ts");
    writeFileSync(path, `
      const transport = globalThis.fetch;
      globalThis.fetch = (input, init) => {
        const url = new URL(String(input));
        if (url.hostname !== "www.verizon.com") throw new Error("Unexpected fixture host: " + url.hostname);
        return transport(new URL(url.pathname + url.search, ${JSON.stringify(fixtureOrigin.href)}), init);
      };
    `);
    preload.push("--preload", path);
  }
  const child = Bun.spawn(["bun", ...preload, `Tools/${tool}.ts`, ...args], {
    cwd: member, env: { ...Bun.env, SOMA_HOME: somaHome }, stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, code };
}

const readme = `## Contents
- [Not a report](https://example.org) - [Ignore](ignored.pdf) (2020)
## Analysis Reports
### Data Breaches
- [Verizon](https://www.verizon.com/dbir-2026) - [Data Breach Investigations Report](archive/dbir.pdf) (2026) - Description
## Survey Reports
### Industry Trends
- [Mandiant](https://www.verizon.com/m-trends-2026) - [M-Trends](archive/m-trends.pdf) (2026) - Description
## Resources
### Other
- [Not a report](https://example.org) - [Ignore](ignored.pdf) (2020)
`;

// Synthetic report excerpts exercise the complete two-report citation path.
const dbir = "<h1>Data Breach Investigations Report 2026</h1><h2>Sample</h2><p>This fixture covers 40 confirmed incidents.</p>";
const mtrends = "<h1>M-Trends 2026</h1><h2>Scope</h2><p>This fixture covers 20 incident-response engagements.</p>";
function evidence() {
  return {
    reports: [
      { id: "dbir", vendor: "Verizon", name: "Data Breach Investigations Report", year: 2026, editionEvidence: { locator: "Section Data Breach Investigations Report 2026", quote: "Data Breach Investigations Report 2026" }, url: "https://www.verizon.com/dbir-2026", coverage: "Synthetic fixture period" },
      { id: "mtrends", vendor: "Mandiant", name: "M-Trends", year: 2026, editionEvidence: { locator: "Section M-Trends 2026", quote: "M-Trends 2026" }, url: "https://www.verizon.com/m-trends-2026", coverage: "Synthetic fixture period" },
    ],
    claims: [
      { text: "The DBIR fixture covers 40 confirmed incidents.", citations: [{ report: "dbir", locator: "Section Sample" }] },
      { text: "The M-Trends fixture covers 20 incident-response engagements.", citations: [{ report: "mtrends", locator: "Section Scope" }] },
      { text: "These fixtures describe different populations; their counts are not a common rate.", citations: [{ report: "dbir", locator: "Section Sample" }, { report: "mtrends", locator: "Section Scope" }] },
    ],
    limitations: "Synthetic test evidence, not findings about actual vendor reports.",
  };
}

test("escaped entity text is decoded only once", () => {
  expect(extractText("<p>&amp;lt; &amp;gt; &amp;quot; &amp;#39; &amp;nbsp;</p>"))
    .toBe("&lt; &gt; &quot; &#39; &nbsp;");
});

test("catalog rejects private and ungranted network destinations", () => {
  for (const url of ["http://169.254.169.254/latest/meta-data", "http://127.0.0.1/report", "http://10.0.0.1/report", "http://[::1]/report", "https://ungranted.example/report"]) {
    expect(() => parseMarkdownReports(readme.replace("https://www.verizon.com/dbir-2026", url))).toThrow();
  }
});

test("analysis requires original edition evidence rather than a copied catalog year", () => {
  const missing = evidence();
  const { editionEvidence, ...copied } = required(missing.reports[0]);
  expect(() => renderAnalysis({ ...missing, reports: [copied, missing.reports[1]] })).toThrow("edition evidence");
  const mismatch = evidence();
  required(mismatch.reports[0]).editionEvidence.quote = "Data Breach Investigations Report 2024";
  expect(() => renderAnalysis(mismatch)).toThrow("must contain the report year");
  const noLocator = evidence();
  required(noLocator.reports[0]).editionEvidence.locator = "catalog";
  expect(() => renderAnalysis(noLocator)).toThrow("Citation needs");
  const corrected = evidence();
  required(corrected.reports[0]).year = 2024;
  required(corrected.reports[0]).editionEvidence = { locator: "p. 1", quote: "Data Breach Investigations Report 2024" };
  expect(renderAnalysis(corrected)).toContain("Data Breach Investigations Report (2024)");
});

test("seed retains all pinned source identities, with unverified index years and immutable provenance", () => {
  const catalog = loadCatalog(join(home(), "memory/SKILLS/annual-reports"));
  const rows = entries(catalog);
  expect(rows).toHaveLength(492);
  expect(rows.every(({ report }) => typeof report.year === "number")).toBe(true);
  const identities = rows.map(({ section, category, report }) => [section, category, report.vendor, report.name, report.url]);
  expect(new Bun.CryptoHasher("sha256").update(JSON.stringify(identities)).digest("hex"))
    .toBe("b1d9beeb154490bc9e6806377d441bd38ffbd14b530691098167a02fc9507d15");
  expect(catalog.metadata.yearSource).toContain("10100c7ab4c85e3cbb7cd2c2b7ae83b625985919");
});

test("real default list CLI prints every source with its year and URL from the member directory", async () => {
  const result = await cli("ListSources", []);
  expect(result.code).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.stdout.match(/  Year: /g)).toHaveLength(492);
  expect(result.stdout.match(/  URL: /g)).toHaveLength(492);
  expect(result.stdout.match(/index label; unverified edition/g)).toHaveLength(492);
  for (const { report } of entries(loadCatalog(home()))) {
    expect(result.stdout).toContain(`- ${report.vendor}: ${report.name}\n  Year: ${report.year}`);
    expect(result.stdout).toContain(`URL: ${report.url}`);
  }
  expect(result.stdout).toContain("Verizon: Data Breach Investigations Report");
  expect(result.stdout).toContain("Mandiant: M Trends");
});

test("list search, vendor and category modes filter reports and reject bad arguments", async () => {
  for (const args of [["--vendor", "Verizon"], ["--search", "M Trends"], ["data breaches"]]) {
    const result = await cli("ListSources", args);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Year: 2026");
    expect(result.stdout).toContain("URL: https://");
  }
  for (const args of [["--vendor"], ["--search"], ["--unknown"], ["missing category"], ["--soma-home"]]) {
    expect((await cli("ListSources", args)).code).toBe(1);
  }
});

test("parser handles both sections, preserves full category keys and excludes unrelated links", () => {
  const catalog = parseMarkdownReports(readme);
  expect(catalog.categories.analysis.data_breaches?.[0]).toEqual({ vendor: "Verizon", name: "Data Breach Investigations Report", year: 2026, url: "https://www.verizon.com/dbir-2026" });
  expect(entries(catalog)).toHaveLength(2);
  expect(parseMarkdownReports(readme.replaceAll(" (2026)", "")).categories.analysis.data_breaches?.[0]?.year).toBeNull();
  expect(() => parseMarkdownReports("# Changed format")).toThrow("empty");
  expect(() => parseMarkdownReports(readme.replace("https://www.verizon.com/dbir-2026", "file:///etc/passwd"))).toThrow("HTTP(S)");
  expect(() => parseMarkdownReports(readme.replace("- [Verizon]", "- [Broken entry]" ).replace(" - [Data Breach Investigations Report](archive/dbir.pdf)", " changed format"))).toThrow("Unrecognized");
});

test("update CLI previews without writes, saves to Soma state, and that state drives listing", async () => {
  const somaHome = home();
  const input = join(somaHome, "README.md");
  writeFileSync(input, readme);
  const seedBefore = readFileSync(seedPath, "utf8");
  for (const flag of ["--dry-run", "--diff"]) {
    const result = await cli("UpdateSources", ["--readme", input, flag], somaHome);
    expect(result).toMatchObject({ code: 0, stderr: "" });
    expect(result.stdout).toContain("Total parsed: 2");
    expect(result.stdout).toContain("Preview only");
    expect(existsSync(join(somaHome, "memory"))).toBe(false);
  }
  expect((await cli("UpdateSources", ["--readme", input, "--soma-home", somaHome], home())).code).toBe(0);
  const path = join(somaHome, "memory/SKILLS/annual-reports/sources.json");
  const saved = parseCatalog(JSON.parse(readFileSync(path, "utf8")));
  expect(entries(saved)).toHaveLength(2);
  const listing = await cli("ListSources", [], somaHome);
  expect(listing.stdout).toContain("(2 of 2)");
  expect(listing.stdout).toContain("Mandiant: M-Trends");
  expect(readFileSync(seedPath, "utf8")).toBe(seedBefore);
  const repeat = await cli("UpdateSources", ["--readme", input], somaHome);
  expect(repeat.stdout).toContain("New or changed reports: 0");
  expect(repeat.stdout).toContain("Removed or changed reports: 0");
});

test("empty or partial updates and malformed state cannot silently replace a good catalog", async () => {
  const somaHome = home(), input = join(somaHome, "README.md");
  writeFileSync(input, readme);
  expect((await cli("UpdateSources", ["--readme", input], somaHome)).code).toBe(0);
  const path = join(somaHome, "memory/SKILLS/annual-reports/sources.json");
  const before = readFileSync(path, "utf8");
  for (const content of ["# No reports", readme.slice(0, readme.indexOf("## Survey Reports")), readme.replace("https://www.verizon.com/dbir-2026", "http://169.254.169.254/secret")]) {
    writeFileSync(input, content);
    const result = await cli("UpdateSources", ["--readme", input], somaHome);
    expect(result.code).toBe(1);
    expect(readFileSync(path, "utf8")).toBe(before);
  }
  writeFileSync(path, "malformed");
  expect((await cli("ListSources", [], somaHome)).code).toBe(1);
  writeFileSync(input, readme);
  expect((await cli("UpdateSources", ["--readme", input], somaHome)).code).toBe(1);
  expect(readFileSync(path, "utf8")).toBe("malformed");
  for (const args of [["--readme"], ["--unknown"]]) expect((await cli("UpdateSources", args)).code).toBe(1);
});

test("fetch CLI caches readable sections from real HTTP and preserves prior files on failure", async () => {
  const server = Bun.serve({ port: 0, fetch(request) {
    expect(request.headers.get("user-agent")).toBe("Soma-AnnualReports/1.0");
    const path = new URL(request.url).pathname;
    if (path === "/pdf") return new Response("%PDF", { headers: { "Content-Type": "application/pdf" } });
    if (path === "/error") return new Response("Unavailable", { status: 503 });
    if (path === "/binary") return new Response("data", { headers: { "Content-Type": "application/octet-stream" } });
    if (path === "/empty") return new Response("<script>secret</script>", { headers: { "Content-Type": "text/html" } });
    return new Response(path === "/dbir-2026" ? dbir : mtrends, { headers: { "Content-Type": "text/html" } });
  } });
  servers.push(server);
  const somaHome = home();
  const directory = join(somaHome, "memory/SKILLS/annual-reports");
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "sources.json"), JSON.stringify(parseMarkdownReports(readme)));
  for (const args of [["Verizon", "Data Breach Investigations"], ["--url", "https://www.verizon.com/m-trends-2026"]]) {
    const result = await cli("FetchReport", args, somaHome, server.url);
    expect(result).toMatchObject({ code: 0, stderr: "" });
  }
  const listing = await cli("FetchReport", ["--list-cached"], somaHome);
  expect(listing.code).toBe(0);
  const files = listing.stdout.trim().split("\n");
  expect(files).toHaveLength(2);
  expect(files.some(path => readFileSync(path, "utf8").includes("## Sample\n\nThis fixture covers 40"))).toBe(true);
  expect(files.some(path => readFileSync(path, "utf8").includes("Year: 2026 (index label; unverified edition)"))).toBe(true);
  expect(files.some(path => readFileSync(path, "utf8").includes("## Scope\n\nThis fixture covers 20"))).toBe(true);
  const before = files.map(path => readFileSync(path, "utf8"));
  for (const path of ["pdf", "error", "binary", "empty"]) {
    const result = await cli("FetchReport", ["--url", `https://www.verizon.com/${path}`], somaHome, server.url);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("no new page saved");
  }
  expect((await cli("FetchReport", ["--list-cached"], somaHome)).stdout).toBe(listing.stdout);
  expect(files.map(path => readFileSync(path, "utf8"))).toEqual(before);
  expect(readdirSync(directory).sort()).toEqual(["Reports", "sources.json"]);
}, 15_000);

test("catalog selection refuses missing and ambiguous reports before fetching", async () => {
  expect((await cli("FetchReport", ["does-not-exist", "missing"])).stderr).toContain("found 0");
  expect((await cli("FetchReport", ["a", "report"])).stderr).toContain("narrow the vendor");
  for (const args of [[], ["--url"], ["--url", "file:///etc/passwd"], ["--unknown"]]) {
    expect((await cli("FetchReport", args)).code).toBe(1);
  }
  expect((await cli("FetchReport", ["--list-cached"])).stdout).toContain("No cached");
});

test("fetch transport errors and oversized text responses fail rather than returning content", async () => {
  const server = Bun.serve({ port: 0, fetch() { return new Response("x".repeat(10_000_001)); } });
  servers.push(server);
  expect((await cli("FetchReport", ["--url", "https://www.verizon.com/large"], home(), server.url)).stderr).toContain("10 MB");
  const closed = Bun.serve({ port: 0, fetch() { return new Response("ok"); } });
  const url = closed.url;
  closed.stop(true);
  expect((await cli("FetchReport", ["--url", "https://www.verizon.com/closed"], home(), url)).code).toBe(1);
  expect(extractText("<style>bad</style><script>bad</script><h2>Heading</h2><p>A &amp; B</p>")).toBe("## Heading\n\nA & B");
});

test("fetch CLI validates custom URLs and each redirect before sending a request", async () => {
  const requested: string[] = [];
  const server = Bun.serve({ port: 0, fetch(request) {
    const path = new URL(request.url).pathname;
    requested.push(path);
    if (path === "/relative") return new Response(null, { status: 302, headers: { location: "/report" } });
    if (path === "/loop") return new Response(null, { status: 307, headers: { location: "/loop" } });
    if (path === "/missing") return new Response(null, { status: 301 });
    if (path === "/private") return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/secret" } });
    if (path === "/ungranted") return new Response(null, { status: 308, headers: { location: "https://ungranted.example/report" } });
    return new Response(dbir, { headers: { "Content-Type": "text/html" } });
  } });
  servers.push(server);
  const somaHome = home();
  const success = await cli("FetchReport", ["--url", "https://www.verizon.com/relative"], somaHome, server.url);
  expect(success).toMatchObject({ code: 0, stderr: "" });
  expect(success.stdout).toContain("Source: https://www.verizon.com/report");
  expect(requested.splice(0)).toEqual(["/relative", "/report"]);
  for (const path of ["private", "ungranted", "loop", "missing"]) {
    const result = await cli("FetchReport", ["--url", `https://www.verizon.com/${path}`], somaHome, server.url);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("no new page saved");
    expect(requested.splice(0)).toEqual(Array(path === "loop" ? 6 : 1).fill(`/${path}`));
  }
  for (const url of ["http://127.0.0.1/report", "http://10.0.0.1/report", "http://[::1]/report", "https://www.verizon.com:8080/report", "https://ungranted.example/report"]) {
    expect((await cli("FetchReport", ["--url", url], somaHome, server.url)).stderr).toContain("not granted");
    expect(requested).toEqual([]);
  }
}, 15_000);

test("real analysis CLI names both reports and cites sections and quotes in retrieved fixture text", async () => {
  const server = Bun.serve({ port: 0, fetch(request) {
    return new Response(new URL(request.url).pathname === "/dbir-2026" ? dbir : mtrends, { headers: { "Content-Type": "text/html" } });
  } });
  servers.push(server);
  const somaHome = home(), path = join(somaHome, "evidence.json");
  const ledger = evidence();
  const retrieved = new Map<string, string>();
  for (const report of ledger.reports) {
    const result = await cli("FetchReport", ["--url", report.url], somaHome, server.url);
    expect(result).toMatchObject({ code: 0, stderr: "" });
    const cachePath = required(result.stdout.split("\n")[0]).replace("Saved report page: ", "");
    const retrievedText = required(readFileSync(cachePath, "utf8").split("## Retrieved page text\n\n")[1]);
    const content = required(retrievedText.split("\n\n## Reading limits")[0]);
    retrieved.set(report.id, content);
    expect(content).toContain(report.editionEvidence.quote);
    expect(content).toContain(`# ${report.editionEvidence.locator.replace("Section ", "")}`);
  }
  for (const claim of ledger.claims) {
    for (const citation of claim.citations) {
      const content = required(retrieved.get(citation.report));
      const heading = citation.locator.replace("Section ", "");
      expect(content).toContain(`## ${heading}\n\n`);
      const section = required(required(content.split(`## ${heading}\n\n`)[1]).split(/\n#+ /)[0]);
      if (claim.citations.length === 1) {
        expect(claim.text.replace(/The (?:DBIR|M-Trends) fixture/, "This fixture")).toBe(section.trim());
      }
    }
  }
  writeFileSync(path, JSON.stringify(ledger));
  const result = await cli("Analyze", [path], somaHome);
  expect(result).toMatchObject({ code: 0, stderr: "" });
  expect(result.stdout).toContain("Verizon: Data Breach Investigations Report (2026)");
  expect(result.stdout).toContain("Mandiant: M-Trends (2026)");
  for (const report of ledger.reports) {
    expect(result.stdout).toContain(`Edition evidence: “${report.editionEvidence.quote}” ([${report.editionEvidence.locator}](${report.url}))`);
  }
  expect(result.stdout).toContain("[Verizon, Data Breach Investigations Report (2026), Section Sample](https://www.verizon.com/dbir-2026)");
  expect(result.stdout).toContain("[Mandiant, M-Trends (2026), Section Scope](https://www.verizon.com/m-trends-2026)");
  for (const claim of ledger.claims) {
    const rendered = result.stdout.split("\n").find(line => line.startsWith(`- ${claim.text} `));
    expect(rendered).toBeDefined();
    for (const citation of claim.citations) {
      const report = required(ledger.reports.find(report => report.id === citation.report));
      expect(rendered).toContain(`${citation.locator}](${report.url})`);
    }
  }
  expect(result.stdout).toContain("not findings about actual vendor reports");
});

test("analysis refuses missing identities, missing citations, missing locators and unused reports", () => {
  const missingReport = evidence(); missingReport.reports.pop();
  expect(() => renderAnalysis(missingReport)).toThrow("two reports");
  const noCitations = evidence(); noCitations.claims[0]?.citations.splice(0);
  expect(() => renderAnalysis(noCitations)).toThrow("Every claim");
  const missingLocator = evidence(); missingLocator.claims[0]?.citations.splice(0, 1, { report: "dbir", locator: "https://example.org" });
  expect(() => renderAnalysis(missingLocator)).toThrow("Citation needs");
  const unknownReport = evidence(); unknownReport.claims[0]?.citations.splice(0, 1, { report: "unknown", locator: "p. 5" });
  expect(() => renderAnalysis(unknownReport)).toThrow("Unknown cited report");
  const unused = evidence(); unused.claims.splice(1);
  expect(() => renderAnalysis(unused)).toThrow("Report has no cited claim: M-Trends");
  const duplicate = evidence();
  duplicate.reports[1] = { ...required(duplicate.reports[0]), name: "DBIR" };
  expect(() => renderAnalysis(duplicate)).toThrow("unique IDs");
  expect(() => renderAnalysis({ ...evidence(), reports: evidence().reports.map(report => ({ ...report, year: null })) })).toThrow("Verify the report year");
  const pages = evidence(); pages.claims[0]?.citations.splice(0, 1, { report: "dbir", locator: "pp. 12-14" });
  expect(renderAnalysis(pages)).toContain("pp. 12-14");
});

test("boundary validation rejects malformed catalog entries and credential URLs", () => {
  const catalog = parseMarkdownReports(readme);
  expect(() => parseCatalog({ ...catalog, metadata: { ...catalog.metadata, totalReports: 99 } })).toThrow("inconsistent");
  expect(() => parseCatalog({ ...catalog, categories: { analysis: { invalid: "not an array" }, survey: {} } })).toThrow("Invalid category");
  expect(() => parseCatalog({ ...catalog, categories: { analysis: { invalid: [{ vendor: "x", name: "x", url: "https://www.verizon.com", year: 1 }] }, survey: {} } })).toThrow("year");
  expect(() => httpUrl("https://user:password@example.org")).toThrow("credentials");
  expect(() => argumentsFor(["--soma-home", "--dry-run"])).toThrow("needs a path");
});

test("member pin, source host grants, instruction pointers and portability stay intact", () => {
  const manifest = YAML.parse(readFileSync(join(member, "arc-manifest.yaml"), "utf8"));
  expect(manifest.upstream).toEqual({ repo: "danielmiessler/PAI", path: "LifeOS/install/skills/AnnualReports", commit: "fb9aef4640a73feae4c2e6483b26f58491ce2665" });
  const hosts = new Set(manifest.capabilities.network.map((entry: { host: string }) => entry.host));
  for (const { report } of entries(loadCatalog(home()))) expect(hosts.has(new URL(report.url).hostname)).toBe(true);
  const skill = readFileSync(join(member, "SKILL.md"), "utf8");
  expect(skill).toContain("name: annual-reports");
  for (const file of ["SKILL.md", "references/analysis.md", "references/port.md"]) {
    const content = readFileSync(join(member, file), "utf8");
    for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
      if (match[1] && !match[1].startsWith("https:")) expect(existsSync(resolve(member, file, "..", match[1]))).toBe(true);
    }
  }
  const files = readdirSync(member, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile());
  for (const file of files) {
    const content = readFileSync(join(file.parentPath, file.name), "utf8");
    expect({ file: file.name, forbidden: /~\/\.claude|LIFEOS_|(?:^|[\s"`])\/(?:Users|home)\//m.test(content) }).toEqual({ file: file.name, forbidden: false });
    expect(content).not.toMatch(/Pulse\s+(?:API|page)|localhost:\d+\/api/i);
  }
});
