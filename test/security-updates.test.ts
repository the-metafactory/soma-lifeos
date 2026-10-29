import { afterEach, expect, test } from "bun:test";
import { YAML } from "bun";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { collect, collectSources, parseArgs, parseFeed, parseHtml, publicationDate } from "../skills/security-updates/Tools/Collect";
import { buildDigest, canonicalUrl, categorize, parseSources, parseState, renderDigest } from "../skills/security-updates/Tools/Digest";
import type { Item, Source, State } from "../skills/security-updates/Tools/Digest";

const directories: string[] = [];
const servers: ReturnType<typeof Bun.serve>[] = [];
const now = new Date("2026-10-29T12:00:00Z");
const initial: State = { version: 1, last_check_timestamp: null, seen: [] };
const member = resolve(import.meta.dir, "../skills/security-updates");
const source: Source = {
  id: "test", name: "Test Research", url: "https://example.org/", collect_url: "https://example.org/feed",
  adapter: "feed", categories: ["research"],
};

afterEach(() => {
  for (const server of servers.splice(0)) server.stop(true);
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function home(): string {
  const directory = mkdtempSync(join(tmpdir(), "security-updates-test-"));
  directories.push(directory);
  return directory;
}

function item(overrides: Partial<Item> = {}): Item {
  return { title: "Security research paper", url: "https://example.org/paper", summary: "", date: now.toISOString(), source: source.id, category: "research", ...overrides };
}

function rss(items: string): string {
  return `<rss version="2.0"><channel><title>Test</title>${items}</channel></rss>`;
}

function entry(title: string, url = "https://example.org/story", date = ""): string {
  return `<item><title>${title}</title><link>${url}</link><description>Research listing</description>${date ? `<pubDate>${date}</pubDate>` : ""}</item>`;
}

test("canonicalization strips tracking but preserves article queries and ports", () => {
  expect(canonicalUrl("https://WWW.example.org:8443/post/?utm_source=x&id=2#part")).toBe("example.org:8443/post?id=2");
  expect(canonicalUrl("http://example.org/post/?id=1")).not.toBe(canonicalUrl("https://example.org/post/?id=2"));
  expect(() => canonicalUrl("javascript:alert(1)")).toThrow("HTTP(S)");
});

test("RSS handles CDATA, entities, relative links and the CERT-EU timezone", () => {
  const items = parseFeed(rss(`<item><title><![CDATA[Critical PHP &amp; server patch]]></title><link>/php?x=1&amp;y=2</link><description>&lt;p&gt;Install updates.&lt;/p&gt;</description><pubDate>Fri, 23 Oct 2026 16:36:26 CEST</pubDate></item>`), source, source.url);
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ title: "Critical PHP & server patch", url: "https://example.org/php?x=1&y=2", summary: "Install updates.", date: "2026-10-23T14:36:26.000Z", category: "research" });
});

test("Atom selects the alternate article link and publication date", () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Security culture</title><link rel="self" href="/api/1"/><link rel="alternate" href="/article"/><published>2026-10-28T12:00:00Z</published><summary type="html">&lt;p&gt;Commentary&lt;/p&gt;</summary></entry></feed>`;
  expect(parseFeed(xml, source, source.url)[0]).toMatchObject({ url: "https://example.org/article", date: "2026-10-28T12:00:00.000Z", category: "ideas" });
});

test("an empty feed is healthy while HTML, truncated entries and bad dates fail", () => {
  expect(parseFeed(rss(""), source, source.url)).toEqual([]);
  expect(() => parseFeed("<html>Bot challenge</html>", source, source.url)).toThrow("complete RSS");
  expect(() => parseFeed(rss("<item><title>Broken</title>"), source, source.url)).toThrow("incomplete");
  expect(() => publicationDate("invalid date")).toThrow("publication date");
});

test("date-only listings retain their calendar day in the Swiss host timezone", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "Europe/Zurich";
    expect(publicationDate("27 October 2026")).toBe("2026-10-27T00:00:00.000Z");
    expect(publicationDate("2026-10-27")).toBe("2026-10-27T00:00:00.000Z");
    expect(categorize("CVE-2026-12345", "ideas")).toBe("research");
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("NCSC cards extract dates, summaries and links at the redirected origin", async () => {
  const ncsc: Source = { ...source, id: "ncsc", adapter: "ncsc" };
  const html = `<div class="card"><p><span class="meta-info__item">27 October 2026</span></p><h3>Week 43: WhatsApp phishing</h3><div class="card__description"><p>Scammers target accounts.</p></div><a href="/en/26w43-en">More</a></div>`;
  expect((await parseHtml(html, ncsc, "https://www.bacs.admin.ch/en/hot-topics"))[0]).toMatchObject({ title: "Week 43: WhatsApp phishing", summary: "Scammers target accounts.", url: "https://www.bacs.admin.ch/en/26w43-en", date: "2026-10-27T00:00:00.000Z", category: "news" });
  await expect(parseHtml("<html>Changed</html>", ncsc, source.url)).rejects.toThrow("layout may have changed");
});

test("newsletter adapter extracts article links without inventing summaries or dates", async () => {
  const newsletter: Source = { ...source, adapter: "newsletter" };
  expect(await parseHtml('<nav>Home</nav><a href="/p/410">Newsletter <strong>410</strong> research</a>', newsletter, source.url))
    .toEqual([item({ title: "Newsletter 410 research", url: "https://example.org/p/410", summary: "", date: null })]);
});

test("ranked digest merges URL and title aliases and remembers undated items", () => {
  const items = [
    item({ title: "Security strategy", url: "https://example.org/strategy", category: "ideas", date: null }),
    item({ title: "Critical exploited CVE-2026-12345 patch", url: "https://example.org/patch?utm_source=x", source: "alpha", category: "news" }),
    item({ title: "Critical exploited CVE-2026-12345 patch", url: "http://www.example.org/patch/#top", source: "beta", category: "news" }),
    item({ title: "Another publisher on CVE-2026-12345", url: "https://other.org/news", source: "gamma" }),
    item({ title: "SECURITY strategy!", url: "https://other.org/strategy", source: "beta", category: "ideas", date: null }),
  ];
  const digest = buildDigest([{ kind: "available", source, items }], initial, now);
  expect(digest.items).toHaveLength(3);
  expect(digest.items[0]?.sources).toEqual(["alpha", "beta"]);
  expect(digest.items[0]?.score).toBeGreaterThan(digest.items[1]?.score ?? 0);
  const second = buildDigest([{ kind: "available", source, items }], digest.nextState, new Date(now.getTime() + 1000));
  expect(second.items).toEqual([]);
  expect(renderDigest(second)).toContain("No new items since last check");
});

test("cap remembers overflow and the seven-day window excludes old and future items", () => {
  const items = Array.from({ length: 40 }, (_, i) => item({ title: `Research ${i}`, url: `https://example.org/${i}` }));
  items.push(item({ title: "Old item", url: "https://example.org/old", date: "2026-10-01T00:00:00Z" }), item({ title: "Future item", url: "https://example.org/future", date: "2026-10-30T00:00:00Z" }));
  const results = [{ kind: "available", source, items }] satisfies Parameters<typeof buildDigest>[0];
  const digest = buildDigest(results, initial, now);
  expect(digest.items).toHaveLength(32);
  expect(digest.considered).toBe(40);
  expect(digest.omittedByCap).toBe(8);
  expect(renderDigest(digest)).toContain("8 additional new items omitted by the cap");
  expect(buildDigest(results, digest.nextState, now).items).toHaveLength(0);
});

test("article URL keys survive long absences", () => {
  const first = item({ date: null });
  const digest = buildDigest([{ kind: "available", source, items: [first] }], initial, now);
  const later = item({ date: null, source: "another" });
  expect(buildDigest([{ kind: "available", source, items: [later] }], digest.nextState, new Date("2027-10-29T00:00:00Z")).items).toEqual([]);
});

test("recurring headlines and later CVE developments remain new", () => {
  const prior = [item({ title: "Friday Squid Blogging", date: "2026-10-23T12:00:00Z" }), item({ title: "CVE-2026-12345 patch released", url: "https://example.org/patch" })];
  const digest = buildDigest([{ kind: "available", source, items: prior }], initial, now);
  const followups = [
    item({ title: "Friday Squid Blogging", url: "https://example.org/next-friday", date: "2026-10-30T12:00:00Z" }),
    item({ title: "CVE-2026-12345 exploited in the wild", url: "https://example.org/exploited" }),
  ];
  expect(buildDigest([{ kind: "available", source, items: followups }], digest.nextState, new Date("2026-10-30T12:00:00Z")).items).toHaveLength(2);
  const old = { ...initial, last_check_timestamp: "2026-09-01T00:00:00Z" };
  const md = renderDigest(buildDigest([{ kind: "available", source, items: [] }], old, now));
  expect(md).toContain("**Period:** Last 7 days");
  expect(md).not.toContain("**Period:** Since");
});

test("bad config and malformed state fail instead of resetting seen history", () => {
  expect(() => parseState({ version: 1, last_check_timestamp: "yesterday", seen: [] })).toThrow("malformed");
  expect(() => parseState({ version: 1, last_check_timestamp: null, seen: ["not a key"] })).toThrow("malformed");
  expect(() => parseSources({ sources: [{ ...source, categories: [] }] })).toThrow("categories");
  expect(() => parseSources({ sources: [source, source] })).toThrow("duplicate");
  expect(() => parseSources({ sources: [{ ...source, collect_url: "file:///etc/passwd" }] })).toThrow("HTTP(S)");
  expect(() => parseArgs(["--soma-home"])).toThrow("needs a path");
  expect(() => parseArgs(["--unknown"])).toThrow("unknown");
  expect(parseArgs(["--soma-home", "/tmp/security-test"]).somaHome).toBe("/tmp/security-test");
  const previous = process.env.SOMA_HOME;
  try {
    delete process.env.SOMA_HOME;
    expect(parseArgs([]).somaHome).toBe(join(homedir(), ".soma"));
  } finally {
    if (previous === undefined) delete process.env.SOMA_HOME;
    else process.env.SOMA_HOME = previous;
  }
});

test("HTTP, parse, transport and oversized-response failures preserve healthy results", async () => {
  const ids = ["good", "http", "parse", "transport", "oversized"];
  const results = await collectSources(ids.map(id => ({ ...source, id, collect_url: `https://example.org/${id}` })), async url => {
    if (url.endsWith("http")) return new Response("Unavailable", { status: 503 });
    if (url.endsWith("parse")) return new Response("<html>Challenge</html>");
    if (url.endsWith("transport")) throw new Error("request timed out");
    if (url.endsWith("oversized")) return new Response("x".repeat(2_000_001));
    return new Response(rss(entry("A security research story")));
  });
  expect(results.map(result => result.kind)).toEqual(["available", "unavailable", "unavailable", "unavailable", "unavailable"]);
  const md = renderDigest(buildDigest(results, initial, now));
  expect(md).toContain("A security research story");
  expect(md).toContain("unavailable (HTTP 503)");
  expect(md).toContain("request timed out");
});

test("all-source failure leaves state and digest untouched and releases the lock", async () => {
  const somaHome = home();
  const successful = await collect({ somaHome, sources: [source], now, fetcher: async () => new Response(rss(entry("A security story"))) });
  const directory = join(somaHome, "memory/SKILLS/security-updates");
  const previousState = readFileSync(join(directory, "seen.json"), "utf8");
  const previousDigest = readFileSync(join(directory, "digest.md"), "utf8");
  const failure = await collect({ somaHome, sources: [source], now, fetcher: async () => { throw new Error("offline"); } });
  expect(successful.items).toHaveLength(1);
  expect(renderDigest(failure)).toContain("Collection failed: all sources unavailable");
  expect(renderDigest(failure)).not.toContain("No new items since last check");
  expect(readFileSync(join(directory, "seen.json"), "utf8")).toBe(previousState);
  expect(readFileSync(join(directory, "digest.md"), "utf8")).toBe(previousDigest);
  expect(existsSync(join(directory, "collect.lock"))).toBe(false);
});

test("malformed state and simultaneous collectors cannot discard history", async () => {
  const somaHome = home();
  const directory = join(somaHome, "memory/SKILLS/security-updates");
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "seen.json"), "broken");
  await expect(collect({ somaHome, sources: [source], fetcher: async () => new Response(rss("")) })).rejects.toThrow();
  expect(readFileSync(join(directory, "seen.json"), "utf8")).toBe("broken");
  expect(existsSync(join(directory, "collect.lock"))).toBe(false);
  writeFileSync(join(directory, "collect.lock"), "another collector");
  await expect(collect({ somaHome, sources: [source] })).rejects.toThrow("already holds");
  expect(readFileSync(join(directory, "collect.lock"), "utf8")).toBe("another collector");
});

test("real CLI from member directory persists seen-state in SOMA_HOME and names an unavailable source", async () => {
  const server = Bun.serve({ port: 0, fetch(request) {
    return new URL(request.url).pathname === "/failed" ? new Response("offline", { status: 503 })
      : new Response(rss(entry("Critical breach patch", "https://example.org/live")));
  } });
  servers.push(server);
  const somaHome = home();
  const config = join(somaHome, "sources.json");
  writeFileSync(config, JSON.stringify({ sources: [
    { ...source, collect_url: new URL("/feed", server.url).href },
    { ...source, id: "failed", name: "Unavailable Source", collect_url: new URL("/failed", server.url).href },
  ] }));
  async function run(json: boolean) {
    const process = Bun.spawn(["bun", "Tools/Collect.ts", "--sources", config, ...(json ? ["--json"] : [])], {
      cwd: member, env: { ...Bun.env, SOMA_HOME: somaHome }, stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, code] = await Promise.all([new Response(process.stdout).text(), new Response(process.stderr).text(), process.exited]);
    expect(stderr).toBe("");
    expect(code).toBe(0);
    return stdout;
  }
  const first = JSON.parse(await run(true));
  expect(first.items).toHaveLength(1);
  expect(first.sources[1]).toMatchObject({ id: "failed", status: "unavailable", reason: "HTTP 503" });
  const second = await run(false);
  expect(second).toContain("No new items since last check");
  expect(second).toContain("available sources only");
  expect(second).toContain("Unavailable Source: unavailable (HTTP 503)");
  const directory = join(somaHome, "memory/SKILLS/security-updates");
  expect(parseState(JSON.parse(readFileSync(join(directory, "seen.json"), "utf8"))).seen.length).toBeGreaterThan(0);
  expect(readFileSync(join(directory, "digest.md"), "utf8")).toBe(second);
});

test("CLI --soma-home isolates an all-source failure and invalid options exit 2", async () => {
  const server = Bun.serve({ port: 0, fetch() { return new Response("offline", { status: 503 }); } });
  servers.push(server);
  const somaHome = home();
  const config = join(somaHome, "sources.json");
  writeFileSync(config, JSON.stringify({ sources: [{ ...source, collect_url: server.url.href }] }));
  const failure = Bun.spawn(["bun", "Tools/Collect.ts", "--soma-home", somaHome, "--sources", config], { cwd: member, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(failure.stdout).text(), new Response(failure.stderr).text(), failure.exited]);
  expect(code).toBe(1);
  expect(stderr).toBe("");
  expect(stdout).toContain("Collection failed: all sources unavailable");
  expect(existsSync(join(somaHome, "memory/SKILLS/security-updates/seen.json"))).toBe(false);
  const invalid = Bun.spawn(["bun", "Tools/Collect.ts", "--soma-home"], { cwd: member, stdout: "pipe", stderr: "pipe" });
  expect(await new Response(invalid.stderr).text()).toContain("needs a path");
  expect(await invalid.exited).toBe(2);
});

test("bundled sources retain six upstream identities plus Swiss NCSC and CERT-EU, and skill pointers resolve", () => {
  const sources = parseSources(JSON.parse(readFileSync(join(member, "sources.json"), "utf8")));
  expect(sources.map(source => source.id)).toEqual(["tldrsec", "nosecurity", "krebsonsecurity", "thehackernews", "schneier", "riskybusiness", "ncsc", "cert-eu"]);
  expect(sources.find(source => source.id === "ncsc")?.url).toContain("ncsc.admin.ch");
  const skill = readFileSync(join(member, "SKILL.md"), "utf8");
  expect(skill).toContain("name: security-updates");
  for (const match of skill.matchAll(/\]\(([^)]+)\)/g)) expect(existsSync(resolve(member, match[1] ?? ""))).toBe(true);
  const reference = readFileSync(join(member, "references/port.md"), "utf8");
  for (const match of reference.matchAll(/\]\(([^)]+)\)/g)) expect(existsSync(resolve(member, "references", match[1] ?? ""))).toBe(true);
  const manifest = YAML.parse(readFileSync(join(member, "arc-manifest.yaml"), "utf8"));
  expect(manifest.upstream).toEqual({ repo: "danielmiessler/PAI", path: "LifeOS/install/skills/SecurityUpdates", commit: "fb9aef4640a73feae4c2e6483b26f58491ce2665" });
});
