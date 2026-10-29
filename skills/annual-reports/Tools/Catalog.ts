import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { YAML } from "bun";

export type Report = { vendor: string; name: string; url: string; year: number | null };
export type Catalog = {
  metadata: { source: string; lastUpdated: string; totalReports: number; yearSource?: string };
  categories: { analysis: Record<string, Report[]>; survey: Record<string, Report[]> };
};
export const upstream = "https://raw.githubusercontent.com/jacobdjwilson/awesome-annual-security-reports/main/README.md";
export const seedPath = resolve(import.meta.dir, "../Data/sources.json");
export const describe = (error: unknown) => error instanceof Error ? error.message : String(error);

export function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Expected an object");
  return value;
}

export function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Expected non-empty text");
  return value.trim();
}

export function httpUrl(value: unknown): string {
  const url = text(value);
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error("Expected an HTTP(S) URL without credentials");
  }
  return url;
}

const manifest = object(YAML.parse(readFileSync(resolve(import.meta.dir, "../arc-manifest.yaml"), "utf8")));
const network = object(manifest.capabilities).network;
if (!Array.isArray(network)) throw new Error("Manifest needs network hosts");
const allowedHosts = new Set(network.map(value => text(object(value).host)));

export function networkUrl(value: unknown): string {
  const url = httpUrl(value);
  const parsed = new URL(url);
  if (!allowedHosts.has(parsed.hostname) || parsed.port) throw new Error(`Network destination is not granted by the member manifest: ${parsed.host}`);
  return url;
}

export function catalogYearLabel(year: number | null): string {
  return year === null ? "unknown (verify the original edition)" : `${year} (index label; unverified edition)`;
}

export function reportYear(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1900 || value > 2199) {
    throw new Error("Invalid report year");
  }
  return value;
}

export function parseReport(value: unknown): Report {
  const entry = object(value);
  return { vendor: text(entry.vendor), name: text(entry.name), url: networkUrl(entry.url), year: reportYear(entry.year) };
}

export function parseCatalog(value: unknown): Catalog {
  const catalog = object(value);
  const metadata = object(catalog.metadata);
  const categories = object(catalog.categories);
  function section(value: unknown): Record<string, Report[]> {
    return Object.fromEntries(Object.entries(object(value)).map(([key, entries]) => {
      if (!Array.isArray(entries)) throw new Error(`Invalid category: ${key}`);
      return [key, entries.map(parseReport)];
    }));
  }
  const result: Catalog = {
    metadata: {
      source: httpUrl(metadata.source), lastUpdated: text(metadata.lastUpdated),
      totalReports: 0,
      ...(metadata.yearSource === undefined ? {} : { yearSource: httpUrl(metadata.yearSource) }),
    },
    categories: { analysis: section(categories.analysis), survey: section(categories.survey) },
  };
  result.metadata.totalReports = entries(result).length;
  if (metadata.totalReports !== result.metadata.totalReports || result.metadata.totalReports === 0) {
    throw new Error("Catalog report count is empty or inconsistent");
  }
  return result;
}

export function entries(catalog: Catalog) {
  return Object.entries(catalog.categories).flatMap(([section, categories]) =>
    Object.entries(categories).flatMap(([category, reports]) => reports.map(report => ({ section, category, report }))));
}

export function argumentsFor(args: string[]) {
  let somaHome = process.env.SOMA_HOME || join(homedir(), ".soma");
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--soma-home") {
      const path = args[++i];
      if (!path || path.startsWith("--")) throw new Error("--soma-home needs a path");
      somaHome = path;
    } else rest.push(text(args[i]));
  }
  return { directory: resolve(somaHome, "memory/SKILLS/annual-reports"), args: rest };
}

export function loadCatalog(directory: string): Catalog {
  const saved = join(directory, "sources.json");
  return parseCatalog(JSON.parse(readFileSync(existsSync(saved) ? saved : seedPath, "utf8")));
}

export function saveFile(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;
  writeFileSync(temporary, content, { mode: 0o600 });
  renameSync(temporary, path);
}

export async function fetchText(url: string): Promise<{ content: string; url: string; contentType: string }> {
  let destination = networkUrl(url);
  const signal = AbortSignal.timeout(30_000);
  let response: Response;
  for (let redirects = 0; ; redirects++) {
    response = await fetch(destination, {
      signal, redirect: "manual", headers: { "User-Agent": "Soma-AnnualReports/1.0" },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    await response.body?.cancel();
    const location = response.headers.get("location");
    if (!location || redirects >= 5) throw new Error("Missing redirect location or too many redirects");
    destination = networkUrl(new URL(location, destination).href);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || /application\/pdf/i.test(contentType)) {
    await response.body?.cancel();
    throw new Error(!response.ok ? `HTTP ${response.status}: ${url}` : "PDF unavailable to this text tool; read the original with a PDF reader");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty response body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 10_000_000) throw new Error("Response exceeds 10 MB text limit");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return { content: Buffer.concat(chunks).toString("utf8"), url: destination, contentType };
}
