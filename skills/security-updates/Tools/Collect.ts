import { randomUUID } from "node:crypto";
import { YAML } from "bun";
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { buildDigest, categorize, httpUrl, parseSources, parseState, renderDigest } from "./Digest";
import type { Digest, Item, Source, SourceResult, State } from "./Digest";

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 5;

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
const errno = (error: unknown): unknown => error instanceof Error && "code" in error ? error.code : undefined;

function allowedHosts(sources: Source[]): Set<string> {
  const manifest: unknown = YAML.parse(readFileSync(resolve(import.meta.dir, "..", "arc-manifest.yaml"), "utf8"));
  if (typeof manifest !== "object" || manifest === null || !("capabilities" in manifest)
    || typeof manifest.capabilities !== "object" || manifest.capabilities === null
    || !("network" in manifest.capabilities) || !Array.isArray(manifest.capabilities.network)) {
    throw new Error("manifest needs network capabilities");
  }
  const hosts = new Set(sources.flatMap(source => [new URL(source.url).host, new URL(source.collect_url).host]));
  for (const entry of manifest.capabilities.network) {
    if (typeof entry !== "object" || entry === null || !("host" in entry) || typeof entry.host !== "string") {
      throw new Error("manifest network capability needs a host");
    }
    hosts.add(entry.host.toLowerCase());
  }
  return hosts;
}

async function fetchListing(url: string, hosts: Set<string>, fetcher: Fetcher): Promise<{ response: Response; base: string }> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let redirects = 0; ; redirects++) {
    const response = await fetcher(url, {
      signal, redirect: "manual",
      headers: { "User-Agent": "soma-security-updates/0.1", Accept: "application/rss+xml, application/atom+xml, text/html, */*" },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, base: url };
    await response.body?.cancel();
    if (redirects >= MAX_REDIRECTS) throw new Error(`redirect limit exceeded (${MAX_REDIRECTS})`);
    const location = response.headers.get("Location");
    if (!location) throw new Error("redirect is missing Location");
    const next = httpUrl(location, url);
    if (!hosts.has(new URL(next).host)) throw new Error(`redirect host not allowed: ${new URL(next).host}`);
    url = next;
  }
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", hellip: "…" };
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, key: string) => {
    if (!key.startsWith("#")) return named[key.toLowerCase()] ?? entity;
    const code = key[1]?.toLowerCase() === "x" ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "";
  });
}

export function plainText(text: string): string {
  return decodeEntities(decodeEntities(text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"))
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ").replace(/<[^>]*>/g, " "))
    .replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

function field(block: string, tag: string): string {
  return new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}\\s*>`, "i").exec(block)?.[1] ?? "";
}

export function publicationDate(text: string): string | null {
  if (!text.trim()) return null;
  const clean = plainText(text).replace(/\bCEST\b/, "+0200").replace(/\bCET\b/, "+0100");
  const dated = /^\d{1,2} [a-z]+ \d{4}$/i.test(clean) ? `${clean} 00:00:00 GMT` : clean;
  const ms = Date.parse(dated);
  if (!Number.isFinite(ms)) throw new Error(`unrecognized publication date: ${text.slice(0, 80)}`);
  return new Date(ms).toISOString();
}

function makeItem(raw: { title: string; url: string; summary: string; date: string }, source: Source, base: string): Item {
  const title = plainText(raw.title).slice(0, 500);
  if (!title || !raw.url.trim()) throw new Error("listing item is missing its title or article URL");
  const summary = plainText(raw.summary).slice(0, 480);
  return {
    title, url: httpUrl(decodeEntities(raw.url), base), summary, date: publicationDate(raw.date),
    source: source.id, category: categorize(`${title} ${summary}`, source.categories[0]),
  };
}

export function parseFeed(xml: string, source: Source, base: string): Item[] {
  const clean = xml.replace(/<!--[\s\S]*?-->/g, "");
  const rss = /<rss\b/i.test(clean) && /<\/rss\s*>/i.test(clean);
  const atom = /<feed\b/i.test(clean) && /<\/feed\s*>/i.test(clean);
  if (!rss && !atom) throw new Error("expected a complete RSS or Atom feed");
  const tag = rss ? "item" : "entry";
  const blocks = [...clean.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}\\s*>`, "gi"))];
  if (blocks.length !== (clean.match(new RegExp(`<${tag}(?:\\s|>)`, "gi")) ?? []).length) {
    throw new Error("incomplete feed entries");
  }
  return blocks.map(match => {
    const block = match[1] ?? "";
    const atomLinks = [...block.matchAll(/<link\b([^>]*?)\/?\s*>/gi)];
    const alternate = atomLinks.find(link => !/\brel\s*=/.test(link[1] ?? "") || /\brel\s*=\s*["']alternate["']/i.test(link[1] ?? ""));
    const atomUrl = /\bhref\s*=\s*["']([^"']+)["']/i.exec(alternate?.[1] ?? "")?.[1] ?? "";
    const url = rss ? field(block, "link").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : atomUrl;
    return makeItem({
      title: field(block, "title"), url,
      summary: field(block, "description") || field(block, "summary") || field(block, "content:encoded") || field(block, "content"),
      date: field(block, "pubDate") || field(block, "published") || field(block, "updated") || field(block, "dc:date"),
    }, source, base);
  });
}

export async function parseHtml(html: string, source: Source, base: string): Promise<Item[]> {
  const raw: { title: string; url: string; summary: string; date: string }[] = [];
  let current: (typeof raw)[number] | undefined;
  const rewriter = new HTMLRewriter();
  if (source.adapter === "ncsc") {
    rewriter.on(".card", { element() { current = { title: "", url: "", summary: "", date: "" }; raw.push(current); } })
      .on(".card h3", { text(chunk) { if (current) current.title += chunk.text; } })
      .on(".card .card__description", { text(chunk) { if (current) current.summary += chunk.text; } })
      .on(".card .meta-info__item", { text(chunk) { if (current) current.date += chunk.text; } })
      .on(".card a[href]", { element(element) { if (current) current.url = element.getAttribute("href") ?? ""; } });
  } else {
    rewriter.on('a[href*="/p/"]', {
      element(element) { current = { title: "", url: element.getAttribute("href") ?? "", summary: "", date: "" }; raw.push(current); },
      text(chunk) { if (current) current.title += chunk.text; },
    });
  }
  await rewriter.transform(new Response(html)).text();
  const items = raw.filter(entry => plainText(entry.title).length >= 8 && entry.url).map(entry => makeItem(entry, source, base));
  if (!items.length) throw new Error("no recognizable article listings; source layout may have changed");
  return items;
}

async function boundedText(response: Response): Promise<string> {
  if (!response.body) throw new Error("empty response body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BYTES) throw new Error(`response exceeds ${MAX_BYTES} bytes`);
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel();
  }
}

export async function collectSources(sources: Source[], fetcher: Fetcher = fetch): Promise<SourceResult[]> {
  const hosts = allowedHosts(sources);
  return Promise.all(sources.map(async (source): Promise<SourceResult> => {
    try {
      const { response, base } = await fetchListing(source.collect_url, hosts, fetcher);
      if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
      const text = await boundedText(response);
      const items = source.adapter === "feed" ? parseFeed(text, source, base) : await parseHtml(text, source, base);
      return { kind: "available", source, items };
    } catch (error) {
      return { kind: "unavailable", source, reason: message(error) };
    }
  }));
}

function loadState(path: string): State {
  try {
    return parseState(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    if (errno(error) === "ENOENT") {
      return { version: 1, last_check_timestamp: null, seen: [] };
    }
    throw error;
  }
}

function atomicWrite(path: string, content: string): void {
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, content, { flag: "wx", mode: 0o600 });
    renameSync(temp, path);
  } finally {
    try { unlinkSync(temp); } catch (error) {
      if (errno(error) !== "ENOENT") throw error;
    }
  }
}

export async function collect(options: { sources: Source[]; somaHome: string; now?: Date; fetcher?: Fetcher }): Promise<Digest> {
  const directory = join(resolve(options.somaHome), "memory", "SKILLS", "security-updates");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const lockPath = join(directory, "collect.lock");
  let lock: number;
  try { lock = openSync(lockPath, "wx", 0o600); } catch (error) {
    if (errno(error) === "EEXIST") throw new Error("a collector already holds collect.lock for this Soma home");
    throw error;
  }
  try {
    writeFileSync(lock, `${process.pid}\n`);
    const statePath = join(directory, "seen.json");
    const state = loadState(statePath);
    const results = await collectSources(options.sources, options.fetcher);
    const digest = buildDigest(results, state, options.now ?? new Date());
    if (results.some(result => result.kind === "available")) {
      atomicWrite(join(directory, "digest.md"), renderDigest(digest));
      atomicWrite(statePath, JSON.stringify(digest.nextState, null, 2) + "\n");
    }
    return digest;
  } finally {
    closeSync(lock);
    unlinkSync(lockPath);
  }
}

export function parseArgs(args: string[]): { somaHome: string; sourcesPath: string; json: boolean } {
  let somaHome = process.env.SOMA_HOME?.trim() || join(homedir(), ".soma");
  let sourcesPath = resolve(import.meta.dir, "..", "sources.json");
  let json = false;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === "--json") { json = true; continue; }
    if (flag !== "--soma-home" && flag !== "--sources") throw new Error(`unknown option: ${flag}`);
    const value = args[++i];
    if (!value?.trim() || value.startsWith("--")) throw new Error(`${flag} needs a path`);
    if (flag === "--soma-home") somaHome = resolve(value);
    else sourcesPath = resolve(value);
  }
  return { somaHome, sourcesPath, json };
}

export async function main(args: string[]): Promise<number> {
  if (args.length === 1 && args[0] === "--help") {
    process.stdout.write("Usage: bun Tools/Collect.ts [--soma-home PATH] [--sources PATH] [--json]\n");
    return 0;
  }
  try {
    const options = parseArgs(args);
    const sources = parseSources(JSON.parse(readFileSync(options.sourcesPath, "utf8")));
    const digest = await collect({ sources, somaHome: options.somaHome });
    const { nextState, sources: results, ...output } = digest;
    const statuses = results.map(result => result.kind === "available"
      ? { id: result.source.id, name: result.source.name, status: result.kind, candidates: result.items.length }
      : { id: result.source.id, name: result.source.name, status: result.kind, reason: result.reason });
    process.stdout.write(options.json ? JSON.stringify({ ...output, sources: statuses }, null, 2) + "\n" : renderDigest(digest));
    return results.some(result => result.kind === "available") ? 0 : 1;
  } catch (error) {
    process.stderr.write(`security-updates: ${message(error)}\n`);
    return 2;
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
