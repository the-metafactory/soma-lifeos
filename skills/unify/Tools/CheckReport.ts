#!/usr/bin/env bun
/**
 * CheckReport.ts - Checks a saved Unify Harmonize report against the parts of
 * its output contract that code can judge.
 *
 * Usage:
 *   bun Tools/CheckReport.ts <report.md> [--max-recs N] [--json]
 *
 * Checks (Intents/Harmonize.md § Write and check the report):
 *   - the eight parts appear in order: verdict, summit, inputs, harmony map,
 *     stragglers, unifying principle, recommendations, lens trail
 *   - every harmony-map row names a known relationship, two path:line sources
 *     and evidence citing both sources
 *   - every stragglers row starts with a path:line
 *   - recommendations number at most --max-recs (default 8)
 *     and each names what it resolves, where it lands and its proof
 *
 * Whether a finding is real stays a human judgment.
 *
 * Exit codes: 0 pass, 1 contract broken, 2 usage or unreadable file.
 */

export const SECTIONS = [
  { key: "verdict", match: /verdict/i },
  { key: "summit", match: /summit/i },
  { key: "inputs", match: /inputs/i },
  { key: "harmony map", match: /harmony map/i },
  { key: "stragglers", match: /stragglers/i },
  { key: "unifying principle", match: /unifying principle/i },
  { key: "recommendations", match: /recommendations/i },
  { key: "lens trail", match: /lens trail/i },
] as const;

export const RELATIONSHIPS = [
  "reinforcing",
  "productive tension",
  "drift",
  "duplication",
  "straggler",
  "conflict",
  "gap",
];

const EMPTY_CELL = /^(|-+|—|–|n\/a|none|tbd)$/i;
const SOURCE = /^.+:[1-9]\d*(?:[-–][1-9]\d*)?$/;
const NO_CONFLICTS = /No conflicts found within the inspected scope\./i;

export interface CheckResult {
  ok: boolean;
  problems: string[];
  recommendations: number;
  harmonyRows: number;
  stragglerRows: number;
}

/** A line that can open a section: a markdown heading, a bold lead, or a numbered bold lead. */
function headingText(line: string): string | null {
  const t = line.trim();
  const h = t.match(/^#{1,6}\s+(.*)$/);
  if (h) return h[1];
  const b = t.match(/^(?:\d+\.\s+)?\*\*(.+?)\*\*/);
  if (b) return b[1];
  return null;
}

function cells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim().replace(/\*\*|`/g, "").trim());
}

/** The report contract allows one contiguous table per section. */
function sectionTable(lines: string[]): { header: string[]; rows: string[][]; problems: string[] } | null {
  const start = lines.findIndex((l) => l.trim().startsWith("|"));
  if (start < 0) return null;
  const block: string[] = [];
  for (let i = start; i < lines.length && lines[i].trim().startsWith("|"); i++) block.push(lines[i]);
  if (block.length < 2) return null;
  const header = cells(block[0]).map((c) => c.toLowerCase());
  const problems: string[] = [];
  if (lines.slice(start + block.length).some(line => line.trim().startsWith("|"))) problems.push("table rows must form one contiguous block");
  const separator = cells(block[1]);
  if (separator.length !== header.length || !separator.every(cell => /^:?-{2,}:?$/.test(cell))) problems.push("table needs a Markdown header separator");
  const rows = block.slice(2).map(cells);
  if (rows.some(row => row.length !== header.length)) problems.push("table rows must match the header width");
  return { header, rows, problems };
}

function cites(evidence: string, source: string): boolean {
  const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[\\s(\\["'“])${escaped}(?=$|[\\s)\\],;:."'”])`).test(evidence);
}

function col(header: string[], word: string): number {
  return header.findIndex((h) => h.includes(word));
}

function checkHarmonyMap(lines: string[]): { problems: string[]; count: number } {
  const problems: string[] = [];
  let count = 0;
  const harmony = sectionTable(lines);
  if (!harmony) problems.push("harmony map has no table");
  else {
    problems.push(...harmony.problems.map(problem => `harmony map: ${problem}`));
    const rel = col(harmony.header, "relationship");
    const ev = col(harmony.header, "evidence");
    const a = harmony.header.indexOf("a");
    const b = harmony.header.indexOf("b");
    const mechanism = col(harmony.header, "mechanism");
    if (a < 0 || b < 0) problems.push("harmony map needs A and B source columns");
    if (mechanism < 0) problems.push("harmony map needs a Mechanism column");
    if (rel < 0) problems.push("harmony map table has no Relationship column");
    if (ev < 0) problems.push("harmony map table has no Evidence column");
    count = harmony.rows.length;
    harmony.rows.forEach((r, i) => {
      const n = i + 1;
      if (rel >= 0) {
        const v = (r[rel] ?? "").toLowerCase();
        if (!RELATIONSHIPS.includes(v))
          problems.push(`harmony map row ${n}: relationship "${r[rel] ?? ""}" is not one of ${RELATIONSHIPS.join(", ")}`);
      }
      if (ev >= 0 && EMPTY_CELL.test(r[ev] ?? "")) problems.push(`harmony map row ${n}: evidence (both sides) is empty`);
      if (mechanism >= 0 && EMPTY_CELL.test(r[mechanism] ?? "")) problems.push(`harmony map row ${n}: mechanism is empty`);
      for (const [label, index] of [["A", a], ["B", b]] as const) {
        if (index < 0) continue;
        const source = r[index] ?? "";
        if (!SOURCE.test(source)) problems.push(`harmony map row ${n}: ${label} needs a path:line`);
        else if (ev >= 0 && !cites(r[ev] ?? "", source)) problems.push(`harmony map row ${n}: evidence does not cite ${label} (${source})`);
      }
    });
    if (!count && !NO_CONFLICTS.test(lines.join("\n"))) problems.push("empty harmony map must explicitly say no conflicts found within the inspected scope");
  }
  return { problems, count };
}

function checkStragglers(lines: string[]): { problems: string[]; count: number } {
  const problems: string[] = [];
  let count = 0;
  const stragglers = sectionTable(lines);
  if (stragglers) {
    problems.push(...stragglers.problems.map(problem => `stragglers: ${problem}`));
    count = stragglers.rows.length;
    stragglers.rows.forEach((r, i) => {
      if (!SOURCE.test(r[0] ?? "")) problems.push(`stragglers row ${i + 1}: first cell "${r[0] ?? ""}" is not a path:line`);
    });
  }
  if (!count && !/\bnone (?:found|identified)\b/i.test(lines.join("\n"))) problems.push("empty stragglers must explicitly say none found");
  return { problems, count };
}

function checkRecommendations(lines: string[], maxRecs: number): { problems: string[]; count: number } {
  const problems: string[] = [];
  let count = 0;
  const recs = sectionTable(lines);
  if (!recs) problems.push("recommendations has no table");
  else {
    problems.push(...recs.problems.map(problem => `recommendations: ${problem}`));
    count = recs.rows.length;
    if (!count && !/\bnone warranted\b/i.test(lines.join("\n"))) problems.push("empty recommendations must explicitly say none warranted");
    if (count > maxRecs) problems.push(`recommendations: ${count} rows, more than ${maxRecs}`);
    for (const word of ["resolves", "lands", "proof"]) {
      const c = col(recs.header, word);
      if (c < 0) {
        problems.push(`recommendations table has no "${word}" column`);
        continue;
      }
      recs.rows.forEach((r, i) => {
        if (EMPTY_CELL.test(r[c] ?? "")) problems.push(`recommendations row ${i + 1}: "${recs.header[c]}" is empty`);
      });
    }
  }
  return { problems, count };
}

export function checkReport(text: string, maxRecs = 8): CheckResult {
  const lines = text.split("\n");
  const problems: string[] = [];
  if (!Number.isInteger(maxRecs) || maxRecs < 1) throw new Error("maxRecs must be a positive integer");

  // Locate the eight sections in order.
  const starts: number[] = [];
  let from = 0;
  for (const s of SECTIONS) {
    let found = -1;
    for (let i = from; i < lines.length; i++) {
      const h = headingText(lines[i]);
      if (h && s.match.test(h)) {
        found = i;
        break;
      }
    }
    if (found < 0) {
      const anywhere = lines.findIndex((l) => {
        const h = headingText(l);
        return h !== null && s.match.test(h);
      });
      problems.push(
        anywhere >= 0
          ? `section "${s.key}" is out of order (line ${anywhere + 1})`
          : `section "${s.key}" is missing`,
      );
      starts.push(-1);
      continue;
    }
    starts.push(found);
    from = found + 1;
  }

  type SectionKey = (typeof SECTIONS)[number]["key"];
  const indexOf = (key: SectionKey): number => SECTIONS.findIndex(section => section.key === key);
  const hasSection = (key: SectionKey): boolean => starts[indexOf(key)] >= 0;
  const body = (key: SectionKey): string[] => {
    const idx = indexOf(key);
    const s = starts[idx];
    if (s < 0) return [];
    const next = starts.slice(idx + 1).find((n) => n > s);
    return lines.slice(s + 1, next ?? lines.length);
  };

  for (const [i, section] of SECTIONS.entries()) {
    if (starts[i] >= 0 && !body(section.key).some(line => line.trim())) problems.push(`section "${section.key}" is empty`);
  }

  const harmony = hasSection("harmony map") ? checkHarmonyMap(body("harmony map")) : { problems: [], count: 0 };
  const stragglers = checkStragglers(body("stragglers"));
  const recs = hasSection("recommendations") ? checkRecommendations(body("recommendations"), maxRecs) : { problems: [], count: 0 };
  problems.push(...harmony.problems, ...stragglers.problems, ...recs.problems);
  const { count: harmonyRows } = harmony;
  const { count: stragglerRows } = stragglers;
  const { count: recommendations } = recs;

  return { ok: problems.length === 0, problems, recommendations, harmonyRows, stragglerRows };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const usage = "Usage: bun Tools/CheckReport.ts <report.md> [--max-recs N] [--json]\nChecks structure and path:line citation shape, not semantic truth.\nExit: 0 pass, 1 contract broken, 2 usage or unreadable file.";
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    process.stdout.write(`${usage}\n`);
    process.exit(args.length === 0 ? 2 : 0);
  }
  try {
    let path: string | undefined;
    let json = false;
    let maxRecs = 8;
    let positional = false;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]!;
      if (!positional && arg === "--") positional = true;
      else if (!positional && arg === "--json") json = true;
      else if (!positional && arg === "--max-recs") {
        maxRecs = Number(args[++i]);
        if (!Number.isInteger(maxRecs) || maxRecs < 1) throw new Error("--max-recs needs a positive integer");
      } else if (!positional && arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
      else if (path !== undefined) throw new Error("Pass exactly one report path");
      else path = arg;
    }
    if (!path) throw new Error("A report path is required");
    const result = checkReport(await Bun.file(path).text(), maxRecs);
    if (json) process.stdout.write(`${JSON.stringify(result)}\n`);
    else if (result.ok) process.stdout.write(`PASS ${path}: 8 parts in order, ${result.harmonyRows} harmony rows, ${result.stragglerRows} stragglers, ${result.recommendations} recommendations\n`);
    else process.stdout.write(`FAIL ${path}\n${result.problems.map(problem => `  - ${problem}\n`).join("")}`);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${usage}\n`);
    process.exitCode = 2;
  }
}
