import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

type Mapping = Record<string, unknown>;
type Payment = { status: "unknown" } | { status: "yes" | "no"; evidence: string };
type Topic = { name: string; terms: string[] };
type Source = {
  name: string; url: string; region: string; location: string; locationText: string;
  deadlineLabel: string; openText: string; payment: Payment;
};
export type Config = { topics: Topic[]; region: string; sources: Source[] };
export type Call = {
  name: string; url: string; location: string; deadline: string;
  payment: Payment; topics: string[]; urgency: string;
};
type SourceResult =
  | { kind: "checked"; name: string; url: string; outcome: string; calls: Call[] }
  | { kind: "unavailable"; name: string; url: string; reason: string };
export type Search = { checkedAt: string; region: string; topics: string[]; sources: SourceResult[]; calls: Call[] };

function isMapping(value: unknown): value is Mapping {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapping(value: unknown, label: string): Mapping {
  if (!isMapping(value)) throw new Error(`${label} must be an object`);
  return value;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || /[\r\n\x00-\x1f]/.test(value)) {
    throw new Error(`${label} must be a nonempty single-line string`);
  }
  return value.trim();
}

function list(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value) || !value.length) throw new Error(`${label} must be a nonempty array`);
  return value;
}

function httpUrl(value: unknown): string {
  const url = new URL(text(value, "source URL"));
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("source URL must be HTTP(S) without credentials");
  }
  return url.href;
}

function payment(value: unknown): Payment {
  const p = mapping(value, "payment");
  if (p.status === "unknown") return { status: "unknown" };
  if (p.status === "yes" || p.status === "no") return { status: p.status, evidence: text(p.evidence, "payment evidence") };
  throw new Error("payment status must be yes, no or unknown");
}

export function parseConfig(value: unknown): Config {
  const config = mapping(value, "config");
  const topics = list(config.topics, "topics").map(value => {
    const topic = mapping(value, "topic");
    return { name: text(topic.name, "topic name"), terms: list(topic.terms, "topic terms").map(t => text(t, "term")) };
  });
  const sources = list(config.sources, "sources").map(value => {
    const source = mapping(value, "source");
    return {
      name: text(source.name, "source name"), url: httpUrl(source.url), region: text(source.region, "source region"),
      location: text(source.location, "location"), locationText: text(source.locationText, "locationText"),
      deadlineLabel: text(source.deadlineLabel, "deadlineLabel"), openText: text(source.openText, "openText"),
      payment: payment(source.payment),
    };
  });
  if (new Set(sources.map(s => s.url)).size !== sources.length) throw new Error("source URLs must be unique");
  return { topics, region: text(config.region, "region"), sources };
}

export function isoDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`invalid date: ${value}`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`invalid date: ${value}`);
  return value;
}

export function visibleText(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
      const n = code.toLowerCase().startsWith("x") ? Number.parseInt(code.slice(1), 16) : Number(code);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : " ";
    })
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt);/gi, entity => {
      switch (entity.toLowerCase()) {
        case "&amp;": return "&";
        case "&quot;": return '"';
        case "&apos;": return "'";
        case "&lt;": return "<";
        case "&gt;": return ">";
        default: return " ";
      }
    }).replace(/\s+/g, " ").trim();
}

const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function deadline(page: string, label: string): string {
  const parts = page.toLowerCase().split(label.toLowerCase());
  if (parts.length !== 2) throw new Error("deadline label missing or ambiguous");
  const tail = parts[1]?.trimStart() ?? "";
  const iso = /^(\d{4}-\d{2}-\d{2})(?![\dT:])/i.exec(tail);
  if (iso?.[1]) return isoDate(iso[1]);
  const numeric = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\b/.exec(tail);
  const english = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/.exec(tail);
  const day = numeric?.[1] ?? english?.[1];
  const year = numeric?.[3] ?? english?.[3];
  const month = numeric?.[2] ? Number(numeric[2]) : months.indexOf(english?.[2] ?? "") + 1;
  if (!day || !year || !month) throw new Error("deadline date missing or unsupported");
  return isoDate(`${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`);
}

function hasTerm(page: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu").test(page);
}

export function inspectPage(source: Source, config: Config, html: string, today: string): SourceResult {
  isoDate(today);
  const page = visibleText(html);
  const lower = page.toLowerCase();
  const checked = (outcome: string, calls: Call[] = []): SourceResult => ({ kind: "checked", name: source.name, url: source.url, outcome, calls });
  if (/\b(?:cfp|call for (?:papers|proposals|speakers)|submissions)\s+(?:(?:is|are|has been)\s+)?(?:now\s+)?(?:closed|cancelled|canceled)\b/i.test(page)) {
    return checked("closed");
  }
  if (!lower.includes(source.openText.toLowerCase())) throw new Error("current open-call marker missing");
  const close = deadline(page, source.deadlineLabel);
  if (close < today) return checked("expired");
  if (close === today) return checked("deadline is today; verify closing time before recommending");
  if (!lower.includes(source.locationText.toLowerCase())) throw new Error("configured location not confirmed on page");
  const topics = config.topics.filter(topic => topic.terms.some(term => hasTerm(page, term))).map(topic => topic.name);
  if (!topics.length) return checked("no topic match");
  const days = (Date.parse(close) - Date.parse(today)) / 86_400_000;
  const pay = source.payment.status !== "unknown" && lower.includes(source.payment.evidence.toLowerCase())
    ? source.payment : { status: "unknown" } satisfies Payment;
  return checked("matched", [{
    name: source.name, url: source.url, location: source.location, deadline: close, payment: pay, topics,
    urgency: days <= 14 ? "Immediate" : days <= 30 ? "High Priority" : "Worth Watching",
  }]);
}

async function readPage(url: string): Promise<string> {
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20_000), headers: { "User-Agent": "soma-speaking/0.1" } });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`HTTP ${response.status}${response.status >= 300 && response.status < 400 ? "; redirects refused, configure the verified final URL" : ""}`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("empty response body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 2_000_000) throw new Error("page exceeds 2 MB limit");
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function search(config: Config, now = new Date()): Promise<Search> {
  const checkedAt = now.toISOString();
  const today = checkedAt.slice(0, 10);
  const sources: SourceResult[] = [];
  for (const source of config.sources.filter(s => s.region.toLowerCase() === config.region.toLowerCase())) {
    try {
      sources.push(inspectPage(source, config, await readPage(source.url), today));
    } catch (error) {
      sources.push({ kind: "unavailable", name: source.name, url: source.url, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  const calls = sources.flatMap(s => s.kind === "checked" ? s.calls : []).sort((a, b) => a.deadline.localeCompare(b.deadline) || a.name.localeCompare(b.name));
  return { checkedAt, region: config.region, topics: config.topics.map(t => t.name), sources, calls };
}

const md = (value: string): string => value.replace(/[\\`*_{}\[\]<>#!|]/g, "\\$&");
const payLine = (pay: Payment): string => pay.status === "unknown" ? "unknown (no verified fee statement)" : `${pay.status} — ${md(pay.evidence)}`;

export function renderSearch(result: Search): string {
  const lines = ["# Open calls for papers", "", `Checked: ${result.checkedAt}`, `Region: ${md(result.region)}`, `Topics: ${result.topics.map(md).join(", ")}`, "",
    "Only future UTC deadline dates are listed. Verify the organizer's timezone and closing time before submitting.", ""];
  if (!result.calls.length) lines.push("No matching open calls among successfully checked sources.", "");
  for (const call of result.calls) lines.push(`## ${md(call.name)}`, "", `- Deadline: ${call.deadline} (${call.urgency})`, `- Location: ${md(call.location)}`,
    `- Pays: ${payLine(call.payment)}`, `- URL: ${call.url}`, `- Topic match: ${call.topics.map(md).join(", ")}`, `- Next action: review the CFP and choose an angle at ${call.url}`, "");
  lines.push("## Sources checked", "");
  if (!result.sources.length) lines.push("No sources configured for this region.");
  for (const source of result.sources) lines.push(`- ${md(source.name)}: ${source.kind === "checked" ? source.outcome : `unavailable (${md(source.reason)})`} — ${source.url}`);
  if (result.sources.some(s => s.kind === "unavailable")) lines.push("", "Coverage is incomplete: one or more sources were unavailable.");
  return lines.join("\n") + "\n";
}

export function renderDraft(input: { call: Call; checkedAt: string; title: string; angle: string; takeaways: string[] }): string {
  const { call } = input;
  const title = text(input.title, "title");
  const angle = text(input.angle, "angle");
  if (input.takeaways.length !== 3) throw new Error("provide exactly three takeaways");
  const takeaways = input.takeaways.map(t => text(t, "takeaway"));
  return ["# Proposal draft — awaiting principal review", "", `Call: ${md(call.name)}`, `URL: ${call.url}`, `Checked: ${input.checkedAt}`,
    `Deadline: ${call.deadline}`, `Location: ${md(call.location)}`, `Pays: ${payLine(call.payment)}`, `Topic fit: ${call.topics.map(md).join(", ")}`, "",
    `## ${md(title)}`, "", "### Abstract", "", md(angle), "", "### Audience takeaways", "", ...takeaways.map(t => `- ${md(t)}`), "",
    "### Submission review", "", "Check the organizer's required format, length and eligibility. Add only speaker facts supplied by the principal. Submit or send only after the principal confirms this complete draft.", ""].join("\n");
}

export async function saveMarkdown(home: string, kind: "opportunities" | "proposal", content: string): Promise<string> {
  const directory = join(home, "memory/SKILLS/speaking");
  await mkdir(directory, { recursive: true });
  const destination = join(directory, `${kind}.md`);
  const temporary = join(directory, `.${kind}-${crypto.randomUUID()}.tmp`);
  await writeFile(temporary, content, { mode: 0o600 });
  await rename(temporary, destination);
  return destination;
}
