import { createHash } from "node:crypto";

export const MAX_ITEMS = 32;
export const DAY_MS = 86_400_000;
export const categories = ["news", "research", "ideas"] as const;
export type Category = (typeof categories)[number];
const adapters = ["feed", "ncsc", "newsletter"] as const;
export type Source = {
  id: string;
  name: string;
  url: string;
  collect_url: string;
  adapter: (typeof adapters)[number];
  categories: [Category, ...Category[]];
};
export type Item = {
  title: string;
  url: string;
  summary: string;
  date: string | null;
  source: string;
  category: Category;
};
export type RankedItem = Item & { score: number; sources: string[] };
export type SourceResult =
  | { kind: "available"; source: Source; items: Item[] }
  | { kind: "unavailable"; source: Source; reason: string };
export type State = { version: 1; last_check_timestamp: string | null; seen: string[] };
export type Digest = {
  generated: string;
  since: string | null;
  sources: SourceResult[];
  items: RankedItem[];
  considered: number;
  omittedByCap: number;
  nextState: State;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && categories.some(category => category === value);
}

function isAdapter(value: unknown): value is Source["adapter"] {
  return typeof value === "string" && adapters.some(adapter => adapter === value);
}

export function httpUrl(raw: string, base?: string): string {
  const url = new URL(raw.trim(), base);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("article and source URLs must use HTTP(S) without credentials");
  }
  return url.href;
}

export function parseSources(value: unknown): Source[] {
  if (!isObject(value) || !Array.isArray(value.sources) || !value.sources.length) {
    throw new Error("sources.json needs a nonempty sources array");
  }
  const ids = new Set<string>();
  return value.sources.map((entry: unknown) => {
    if (!isObject(entry) || !nonEmpty(entry.id) || !/^[a-z0-9-]+$/.test(entry.id)
      || !nonEmpty(entry.name) || !nonEmpty(entry.url) || !nonEmpty(entry.collect_url)
      || !Array.isArray(entry.categories)) throw new Error("invalid source entry");
    const [first, ...rest] = entry.categories;
    if (!isCategory(first) || !rest.every(isCategory)) throw new Error(`invalid categories for ${entry.id}`);
    if (!isAdapter(entry.adapter)) {
      throw new Error(`invalid adapter for ${entry.id}`);
    }
    if (ids.has(entry.id)) throw new Error(`duplicate source id ${entry.id}`);
    ids.add(entry.id);
    return {
      id: entry.id, name: entry.name, url: httpUrl(entry.url),
      collect_url: httpUrl(entry.collect_url), adapter: entry.adapter, categories: [first, ...rest],
    };
  });
}

export function parseState(value: unknown): State {
  if (!isObject(value) || value.version !== 1
    || !(value.last_check_timestamp === null || (typeof value.last_check_timestamp === "string"
      && Number.isFinite(Date.parse(value.last_check_timestamp))))
    || !Array.isArray(value.seen) || !value.seen.every((key: unknown) => typeof key === "string" && /^[a-f0-9]{64}$/.test(key))) {
    throw new Error("malformed security-updates seen-state; preserve it and repair from a backup");
  }
  return { version: 1, last_check_timestamp: value.last_check_timestamp, seen: value.seen };
}

export function canonicalUrl(raw: string): string {
  const url = new URL(httpUrl(raw));
  const params = [...url.searchParams.entries()]
    .filter(([key]) => !/^(utm_|fbclid$|gclid$|mc_|ref$|source$)/i.test(key))
    .sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv));
  const query = new URLSearchParams(params).toString();
  return `${url.host.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "")}${query ? `?${query}` : ""}`;
}

function normalizedTitle(item: Item): string {
  return item.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function itemKeys(item: Item): string[] {
  const bases = [`u:${canonicalUrl(item.url)}`];
  if (item.date) bases.push(`t:${normalizedTitle(item)}:${item.date.slice(0, 10)}`);
  return bases.map(basis => createHash("sha256").update(basis).digest("hex"));
}

function batchKeys(item: Item): string[] {
  const keys = itemKeys(item);
  if (item.date === null) {
    keys.push(createHash("sha256").update(`undated-title:${normalizedTitle(item)}`).digest("hex"));
  }
  return keys;
}

const incident = /\b(breach(?:ed|es)?|ransomware|exploited|exploitation|in the wild|zero.day|attack(?:s|ers)?|phishing)\b/i;
const critical = /\b(critical|remote code execution|unauthenticated|RCE)\b/i;
const actionable = /\b(patch(?:es|ed)?|updat(?:e|es|ing)|mitigat\w*|fix(?:es|ed)?|upgrade)\b/i;

export function categorize(text: string, fallback: Category): Category {
  if (incident.test(text)) return "news";
  if (/\b(CVE-\d{4}-\d{4,}|vulnerabilit\w*|research|paper|technique|disclosure)\b/i.test(text)) return "research";
  if (/\b(strategy|opinion|culture|career|regulation|policy)\b/i.test(text)) return "ideas";
  return fallback;
}

export function scoreItem(item: Item, now: Date): number {
  const text = `${item.title} ${item.summary}`;
  const age = item.date === null ? 7 : (now.getTime() - Date.parse(item.date)) / DAY_MS;
  return (incident.test(text) ? 40 : 0) + (critical.test(text) ? 25 : 0)
    + (actionable.test(text) ? 15 : 0) + Math.max(0, 14 - age * 2);
}

export function buildDigest(results: SourceResult[], state: State, now: Date): Digest {
  const seen = new Set(state.seen);
  const candidates = results.flatMap(result => result.kind === "available" ? result.items : [])
    .filter(item => item.date === null || (Date.parse(item.date) >= now.getTime() - 7 * DAY_MS && Date.parse(item.date) <= now.getTime()));
  const groups: { item: RankedItem; keys: Set<string> }[] = [];
  for (const item of candidates) {
    const keys = batchKeys(item);
    const matches = groups.filter(group => keys.some(key => group.keys.has(key)));
    const sources = new Set([item.source, ...matches.flatMap(group => group.item.sources)]);
    const variants = [item, ...matches.map(group => group.item)];
    variants.sort((a, b) => scoreItem(b, now) - scoreItem(a, now) || a.url.localeCompare(b.url));
    const best = variants[0] ?? item;
    for (const group of matches) groups.splice(groups.indexOf(group), 1);
    groups.push({
      item: { ...best, score: scoreItem(best, now), sources: [...sources].sort() },
      keys: new Set([...keys, ...matches.flatMap(group => [...group.keys])]),
    });
  }
  const newItems = groups.filter(group => ![...group.keys].some(key => seen.has(key))).map(group => group.item)
    .sort((a, b) => b.score - a.score || (b.date ?? "").localeCompare(a.date ?? "") || a.title.localeCompare(b.title));
  const items = newItems.slice(0, MAX_ITEMS);
  for (const item of candidates) for (const key of itemKeys(item)) seen.add(key);
  return {
    generated: now.toISOString(), since: state.last_check_timestamp, sources: results, items, considered: candidates.length,
    omittedByCap: Math.max(0, newItems.length - MAX_ITEMS),
    nextState: { version: 1, last_check_timestamp: now.toISOString(), seen: [...seen].sort() },
  };
}

function markdown(text: string): string {
  return text.replace(/[\r\n\t]+/g, " ").replace(/([\\`*_{}\[\]()<>|#!])/g, "\\$1");
}

export function renderDigest(digest: Digest): string {
  const labels = { news: "🔴 Security News", research: "🔬 Security Research", ideas: "💡 Security Ideas" };
  const lines = ["# Security Updates", `**Generated:** ${digest.generated}`,
    `**Period:** Last 7 days; undated listings included. ${digest.since ? `Previous check: ${digest.since}.` : "First run."}`, "", "## Source status", ""];
  for (const result of digest.sources) {
    lines.push(`- ${markdown(result.source.name)}: ${result.kind === "available" ? `available (${result.items.length} candidates)` : `unavailable (${markdown(result.reason)})`}`);
  }
  if (!digest.sources.some(result => result.kind === "available")) lines.push("", "Collection failed: all sources unavailable.");
  else if (!digest.items.length) lines.push("", digest.sources.some(result => result.kind === "unavailable")
    ? "**No new items since last check (available sources only).**" : "**No new items since last check.**");
  for (const category of categories) {
    lines.push("", `## ${labels[category]}`, "");
    const items = digest.items.filter(item => item.category === category);
    items.forEach((item, index) => {
      const names = item.sources.map(id => digest.sources.find(result => result.source.id === id)?.source.name ?? id);
      lines.push(`${index + 1}. **[${markdown(item.title)}](<${item.url}>)** — ${markdown(item.summary)} (${markdown(names.join(", "))}; ${item.date ?? "undated"}; priority ${item.score.toFixed(1)})`);
    });
    if (!items.length) lines.push("No new items in this category.");
  }
  lines.push("", "## Summary", "", "| Category | Count |", "| --- | ---: |");
  for (const category of categories) lines.push(`| ${category} | ${digest.items.filter(item => item.category === category).length} |`);
  lines.push("", `**Total:** ${digest.items.length}/${MAX_ITEMS} items. ${digest.considered} candidates considered.`, "");
  if (digest.omittedByCap) lines.push(`${digest.omittedByCap} additional new items omitted by the cap and recorded as considered; they will not appear on later unchanged runs.`, "");
  return lines.join("\n");
}
