import { afterAll, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { YAML } from "bun";
import { inspectPage, isoDate, parseConfig, renderDraft, renderSearch, search, visibleText } from "../skills/speaking/Tools/Calls.ts";

const member = resolve(import.meta.dir, "../skills/speaking");
const now = new Date("2026-10-29T12:00:00Z");
const source = {
  name: "Example Security Conference", url: "https://example.org/cfp", region: "Europe",
  location: "Berlin, Germany", locationText: "Berlin", deadlineLabel: "Submission deadline:",
  openText: "Submit your abstract now", payment: { status: "unknown" },
};
const config = () => parseConfig({ topics: [
  { name: "security operations", terms: ["security", "incident response"] },
  { name: "crisis management", terms: ["crisis", "resilience"] },
  { name: "AI infrastructure", terms: ["AI infrastructure", "GPU"] },
], region: "Europe", sources: [source] });
const page = (date = "2026-11-05", subject = "security") => `<main><h1>Example Security Conference</h1><p>Submit your abstract now</p>
<p>Berlin</p><p>We welcome talks on ${subject}.</p><p>Submission deadline: <b>${date}</b></p></main>`;
const folders: string[] = [];
const servers: ReturnType<typeof Bun.serve>[] = [];
function temporary() { const path = mkdtempSync(join(tmpdir(), "speaking-test-")); folders.push(path); return path; }
function serve(handler: (request: Request) => Response) {
  const server = Bun.serve({ port: 0, fetch: handler }); servers.push(server); return server;
}
afterAll(() => { for (const server of servers) server.stop(true); for (const path of folders) rmSync(path, { recursive: true, force: true }); });

test("config validates untrusted values and leaves topic and region choices in data", () => {
  expect(config().topics.map(t => t.name)).toEqual(["security operations", "crisis management", "AI infrastructure"]);
  for (const value of [null, {}, { ...config(), topics: [] }, { ...config(), region: "" },
    { ...config(), sources: [{ ...source, url: "file:///etc/passwd" }] },
    { ...config(), sources: [{ ...source, url: "https://user:password@example.org" }] },
    { ...config(), sources: [{ ...source, payment: { status: "yes" } }] },
    { ...config(), sources: [{ ...source, name: "line\nline" }] },
    { ...config(), topics: [{ name: "security", terms: [123] }] },
    { ...config(), sources: [source, source] }]) expect(() => parseConfig(value)).toThrow();
});

test("open call reports the deadline location pay URL topic and urgency", () => {
  const c = config();
  const result = inspectPage(c.sources[0]!, c, page(), "2026-10-29");
  expect(result).toMatchObject({ kind: "checked", outcome: "matched", calls: [{
    name: source.name, url: source.url, deadline: "2026-11-05", location: "Berlin, Germany",
    payment: { status: "unknown" }, topics: ["security operations"], urgency: "Immediate",
  }] });
  for (const [date, urgency] of [["2026-11-20", "High Priority"], ["2026-12-10", "Worth Watching"]]) {
    expect(inspectPage(c.sources[0]!, c, page(date), "2026-10-29")).toMatchObject({ calls: [{ urgency }] });
  }
});

test("expired and explicitly closed calls never become active results", () => {
  const c = config();
  expect(inspectPage(c.sources[0]!, c, page("2026-10-28"), "2026-10-29")).toMatchObject({ outcome: "expired", calls: [] });
  expect(inspectPage(c.sources[0]!, c, page("2026-10-29"), "2026-10-29")).toMatchObject({ outcome: expect.stringContaining("verify closing time"), calls: [] });
  expect(inspectPage(c.sources[0]!, c, page() + "<p>Submissions are now closed</p>", "2026-10-29")).toMatchObject({ outcome: "closed", calls: [] });
  expect(inspectPage(c.sources[0]!, c, page() + "<p>Call for papers is cancelled</p>", "2026-10-29")).toMatchObject({ outcome: "closed", calls: [] });
});

test("malformed missing and ambiguous deadlines fail rather than reuse a stale date", () => {
  const c = config();
  for (const html of [page("2026-02-30"), page("31.11.2026"), page("November 2026"), page("2026-11-05T00:00:00Z"),
    page().replace("Submission deadline:", "Date:"), page() + "Submission deadline: 2027-01-01",
    page().replace("Submit your abstract now", "Coming soon"), page().replace("Berlin", "Paris")]) {
    expect(() => inspectPage(c.sources[0]!, c, html, "2026-10-29")).toThrow();
  }
  expect(isoDate("2028-02-29")).toBe("2028-02-29");
  expect(() => isoDate("2026-02-29")).toThrow();
  for (const date of ["05.11.2026", "5 November 2026"]) {
    expect(inspectPage(c.sources[0]!, c, page(date), "2026-10-29")).toMatchObject({ calls: [{ deadline: "2026-11-05" }] });
  }
});

test("topic matching ignores hidden code and honors configured terms without substring matches", () => {
  const c = parseConfig({ ...config(), topics: [{ name: "AI infrastructure", terms: ["AI"] }] });
  const html = page("2026-11-05", "railways") + "<script>AI</script><style>AI</style><!-- AI -->";
  expect(inspectPage(c.sources[0]!, c, html, "2026-10-29")).toMatchObject({ outcome: "no topic match", calls: [] });
  expect(inspectPage(c.sources[0]!, c, html + "<p>AI</p>", "2026-10-29")).toMatchObject({ calls: [{ topics: ["AI infrastructure"] }] });
  const literal = parseConfig({ ...c, topics: [{ name: "C++", terms: ["C++"] }] });
  expect(inspectPage(literal.sources[0]!, literal, page("2026-11-05", "C++"), "2026-10-29")).toMatchObject({ outcome: "matched" });
  expect(visibleText("<p>Security&nbsp; &amp; &#67;risis &#x41;I</p>")).toBe("Security & Crisis AI");
});

test("yes and no payment require the configured evidence on the current page", () => {
  const c = config();
  for (const status of ["yes", "no"]) {
    const s = parseConfig({ ...c, sources: [{ ...source, payment: { status, evidence: "Speaker fee statement" } }] }).sources[0]!;
    expect(inspectPage(s, c, page() + "<p>Speaker fee statement</p>", "2026-10-29")).toMatchObject({ calls: [{ payment: { status, evidence: "Speaker fee statement" } }] });
    expect(inspectPage(s, c, page(), "2026-10-29")).toMatchObject({ calls: [{ payment: { status: "unknown" } }] });
  }
});

test("real collection skips other regions sorts deadlines and renders coverage gaps", async () => {
  let nonEuropeanRequests = 0;
  const server = serve(request => {
    const path = new URL(request.url).pathname;
    if (path === "/outside") { nonEuropeanRequests++; return new Response(page()); }
    if (path === "/failure") return new Response("offline", { status: 503 });
    return new Response(page(path === "/later" ? "2026-12-10" : path === "/expired" ? "2026-01-01" : "2026-11-05"));
  });
  const c = parseConfig({ ...config(), sources: ["later", "sooner", "expired", "outside", "failure"].map(id => ({
    ...source, name: id, url: new URL(`/${id}`, server.url).href, region: id === "outside" ? "Asia" : "Europe",
  })) });
  const result = await search(c, now);
  expect(nonEuropeanRequests).toBe(0);
  expect(result.calls.map(call => call.name)).toEqual(["sooner", "later"]);
  const markdown = renderSearch(result);
  for (const field of ["2026-11-05", "Berlin, Germany", "Pays: unknown", "Topic match: security operations", "HTTP 503", "Coverage is incomplete"]) expect(markdown).toContain(field);
  expect(markdown).not.toContain("## expired");
  const empty = await search({ ...c, region: "Oceania" }, now);
  expect(empty.sources).toHaveLength(0);
  expect(renderSearch(empty)).toContain("No sources configured for this region");
});

test("network failures oversized pages and layout changes stay explicit and redirects are never fetched", async () => {
  let redirected = 0;
  const target = serve(() => { redirected++; return new Response(page()); });
  const server = serve(request => {
    switch (new URL(request.url).pathname) {
      case "/redirect": return Response.redirect(target.url.href);
      case "/oversize": return new Response("x".repeat(2_000_001));
      case "/bad": return new Response("challenge page");
      default: return new Response(page());
    }
  });
  const c = parseConfig({ ...config(), sources: ["redirect", "oversize", "bad", "healthy"].map(id => ({ ...source, name: id, url: new URL(`/${id}`, server.url).href })) });
  const result = await search(c, now);
  expect(redirected).toBe(0);
  expect(result.sources.map(s => s.kind)).toEqual(["unavailable", "unavailable", "unavailable", "checked"]);
  expect(renderSearch(result)).toContain("redirects refused");
  expect(renderSearch(result)).toContain("2 MB limit");
  expect(result.calls).toHaveLength(1);
});

test("proposal contains chosen call and supplied content with explicit principal review", () => {
  const c = config();
  const result = inspectPage(c.sources[0]!, c, page(), "2026-10-29");
  if (result.kind !== "checked" || !result.calls[0]) throw new Error("fixture must yield a call");
  const input = { call: result.calls[0], checkedAt: now.toISOString(), title: "Containment decisions", angle: "A framework for incident decisions.", takeaways: ["Map objectives.", "Name authority.", "Rehearse choices."] };
  const markdown = renderDraft(input);
  for (const detail of [source.name, source.url, "2026-11-05", input.title, input.angle, "Name authority.", "principal confirms this complete draft"]) expect(markdown).toContain(detail);
  expect(() => renderDraft({ ...input, takeaways: [] })).toThrow();
  expect(() => renderDraft({ ...input, angle: "" })).toThrow();
});

async function cli(args: string[], somaHome: string) {
  const child = Bun.spawn(["bun", "Tools/Speaking.ts", ...args], { cwd: member, env: { ...Bun.env, SOMA_HOME: somaHome }, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, code };
}

test("member CLI uses explicit config and saves search and freshly checked proposal to an isolated home", async () => {
  let closed = false;
  let requests = 0;
  const server = serve(() => { requests++; return new Response(page("2099-11-05") + (closed ? "Submissions are closed" : "")); });
  const home = temporary();
  const configPath = join(home, "config.json");
  const c = parseConfig({ ...config(), sources: [{ ...source, url: server.url.href }] });
  writeFileSync(configPath, JSON.stringify(c));
  const searched = await cli(["search", "--config", configPath, "--json", "--save"], home);
  expect(searched.code).toBe(0);
  expect(searched.stderr).toBe("");
  const json = JSON.parse(searched.stdout);
  expect(json.calls[0]).toMatchObject({ deadline: "2099-11-05", url: server.url.href });
  const directory = join(home, "memory/SKILLS/speaking");
  expect(readFileSync(join(directory, "opportunities.md"), "utf8")).toContain("Pays: unknown");
  const draftArgs = ["draft", "--config", configPath, "--call", server.url.href, "--title", "Crisis decisions", "--angle", "Decide when to contain an incident.",
    "--takeaway", "Map objectives.", "--takeaway", "Name authority.", "--takeaway", "Rehearse choices.", "--save"];
  const draft = await cli(draftArgs, home);
  expect(draft.code).toBe(0);
  expect(draft.stderr).toBe("");
  expect(readFileSync(join(directory, "proposal.md"), "utf8")).toBe(draft.stdout);
  expect(requests).toBe(2);
  closed = true;
  const rejected = await cli(draftArgs, home);
  expect(rejected.code).toBe(2);
  expect(rejected.stderr).toContain("not currently open");
  expect(readFileSync(join(directory, "proposal.md"), "utf8")).toBe(draft.stdout);
});

test("private config takes precedence and unavailable sources differ from a successful empty search", async () => {
  const home = temporary();
  const server = serve(request => new URL(request.url).pathname === "/failed" ? new Response("down", { status: 503 }) : new Response(page("2001-01-01")));
  const path = join(home, "selected.json");
  writeFileSync(path, JSON.stringify({ ...config(), sources: [{ ...source, url: server.url.href }] }));
  const empty = await cli(["search", "--config", path, "--soma-home", home, "--save"], temporary());
  expect(empty.code).toBe(0);
  expect(empty.stdout).toContain("expired");
  const state = join(home, "memory/SKILLS/speaking");
  writeFileSync(join(state, "config.json"), JSON.stringify({ ...config(), sources: [{ ...source, url: new URL("/failed", server.url).href }] }));
  const failed = await cli(["search"], home);
  expect(failed.code).toBe(1);
  expect(failed.stdout).toContain("HTTP 503");
  expect(failed.stdout).toContain("Coverage is incomplete");
  writeFileSync(join(state, "config.json"), "broken");
  const broken = await cli(["search"], home);
  expect(broken.code).toBe(2);
  expect(broken.stderr).not.toBe("");
});

test("CLI rejects invalid options before requesting any sources", async () => {
  const home = temporary();
  for (const args of [[], ["search", "--config"], ["search", "--wat"], ["search", "--call", "https://example.org"], ["search", "--json", "--json"], ["draft", "--json"]]) {
    expect((await cli(args, home)).code).toBe(2);
  }
  expect((await cli(["--help"], home)).code).toBe(0);
});

test("member provenance pointers registration and forbidden-path guard", () => {
  const manifest = YAML.parse(readFileSync(join(member, "arc-manifest.yaml"), "utf8"));
  expect(manifest).toMatchObject({ upstream: { repo: "danielmiessler/PAI", path: "LifeOS/install/skills/Speaking", commit: "fb9aef4640a73feae4c2e6483b26f58491ce2665" } });
  const root = YAML.parse(readFileSync(resolve(member, "../../arc-manifest.yaml"), "utf8"));
  expect(root).toMatchObject({ artifacts: expect.arrayContaining([expect.objectContaining({ path: "skills/speaking" })]) });
  for (const path of ["SKILL.md", "references/usage.md", "references/port.md", "config.json", "Tools/Calls.ts", "Tools/Speaking.ts", "arc-manifest.yaml"]) {
    const content = readFileSync(join(member, path), "utf8");
    expect(content).not.toMatch(/~\/\.claude|LIFEOS_/);
    for (const match of content.matchAll(/\]\(([^)]+)\)/g)) expect(existsSync(resolve(member, path === "references/port.md" ? "references" : ".", match[1] ?? ""))).toBe(true);
  }
  expect(readFileSync(join(member, "SKILL.md"), "utf8")).toContain("name: speaking");
  expect(parseConfig(JSON.parse(readFileSync(join(member, "config.json"), "utf8")))).toMatchObject({ region: "Europe" });
});
