import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve, sep } from "node:path";

export type InputSet = {
  mode: "default" | "explicit";
  roots: string[];
  sources: { path: string; text: string }[];
  gaps: { path: string; reason: string }[];
};

const describe = (error: unknown): string => error instanceof Error ? error.message : String(error);
const absolute = (path: string): string => resolve(path === "~" ? homedir() : path.startsWith("~/") ? join(homedir(), path.slice(2)) : path);
const within = (root: string, path: string): boolean => {
  const part = relative(root, path);
  return part === "" || (part !== ".." && !part.startsWith(`..${sep}`));
};

export function collectInputs(options: { paths: string[]; somaHome: string }): InputSet {
  const mode = options.paths.length ? "explicit" : "default";
  const home = absolute(options.somaHome);
  const roots = mode === "explicit"
    ? options.paths.map(absolute)
    : [join(home, "skills"), join(home, "policy"), join(home, "profile", "purpose.md")];
  const result: InputSet = { mode, roots, sources: [], gaps: [] };
  const seen = new Set<string>();

  function visit(path: string, boundary: string, ancestors: Set<string>, skillLinks = false): void {
    try {
      const target = realpathSync(path);
      if (!within(boundary, target)) {
        result.gaps.push({ path, reason: "Link leaves selected directory; name it explicitly to include it" });
        return;
      }
      const info = lstatSync(target);
      if (info.isDirectory()) {
        if (ancestors.has(target)) {
          result.gaps.push({ path, reason: "Directory link cycle" });
          return;
        }
        const next = new Set([...ancestors, target]);
        for (const entry of readdirSync(target).sort()) {
          const child = join(path, entry);
          if (entry.startsWith(".") || entry === "node_modules") {
            result.gaps.push({ path: child, reason: "Hidden file or dependency directory excluded" });
            continue;
          }
          try {
            let childBoundary = boundary;
            if (skillLinks && lstatSync(child).isSymbolicLink()) {
              const installed = realpathSync(child);
              let isSkill = false;
              try {
                isSkill = lstatSync(installed).isDirectory() && lstatSync(join(installed, "SKILL.md")).isFile();
              } catch {
                // A missing or unreadable entry file does not identify an installed skill.
              }
              if (!isSkill) {
                result.gaps.push({ path: child, reason: "Installed skill link target must be a directory containing a regular SKILL.md" });
                continue;
              }
              childBoundary = installed;
            }
            visit(child, childBoundary, next);
          } catch (error) {
            result.gaps.push({ path: child, reason: describe(error) });
          }
        }
      } else if (info.isFile()) {
        if (seen.has(target)) return;
        const bytes = readFileSync(target);
        if (bytes.includes(0)) {
          result.gaps.push({ path, reason: "Binary file excluded" });
          return;
        }
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        seen.add(target);
        result.sources.push({ path, text });
      } else {
        result.gaps.push({ path, reason: "Not a regular file or directory" });
      }
    } catch (error) {
      result.gaps.push({ path, reason: describe(error) });
    }
  }

  for (const root of roots) {
    try {
      visit(root, realpathSync(root), new Set(), mode === "default" && root === join(home, "skills"));
    } catch (error) {
      result.gaps.push({ path: root, reason: describe(error) });
    }
  }
  if (!result.sources.length) result.gaps.push({ path: roots.join(", "), reason: "No readable text sources" });
  return result;
}

export function renderInputs(input: InputSet): string {
  return [
    `# Unify sources (${input.mode})`, "", "Analysis pending: read these sources to produce a Harmonize report.", "",
    "Selected roots:", ...input.roots.map(path => `- ${path}`), "",
    "Coverage gaps:", ...(input.gaps.length ? input.gaps.map(gap => `- ${gap.path}: ${gap.reason}`) : ["None."]), "",
    ...input.sources.flatMap(source => [
      `## ${source.path}`, "", ...source.text.split(/\r?\n/).map((line, i) => `${i + 1}: ${line}`), "",
    ]),
  ].join("\n");
}

const USAGE = "Usage: bun Tools/CollectInputs.ts [--soma-home PATH] [--json] [--] [PATH ...]\nNo paths: read <soma-home>/skills/, policy/, profile/purpose.md. Explicit paths replace defaults.\nSoma home: --soma-home, then SOMA_HOME, then the user's .soma directory.\nDirectories recurse through text files; hidden files and node_modules are excluded.\nInstalled skill links require a directory containing a regular SKILL.md; other links leaving a selected directory become coverage gaps.\nOutputs sources for agent analysis, not a harmony verdict. Writes nothing.\nExit: 0 complete collection, 1 coverage gaps or no sources, 2 usage error.";

if (import.meta.main) {
  try {
    const paths: string[] = [];
    let somaHome = process.env.SOMA_HOME || join(homedir(), ".soma");
    let json = false;
    let positional = false;
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]!;
      if (positional) paths.push(arg);
      else if (arg === "--") positional = true;
      else if (arg === "--help" || arg === "-h") {
        process.stdout.write(`${USAGE}\n`);
        process.exit(0);
      } else if (arg === "--json") json = true;
      else if (arg === "--soma-home") {
        const value = args[++i];
        if (!value?.trim() || value.startsWith("-")) throw new Error("--soma-home requires a path");
        somaHome = value;
      } else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
      else paths.push(arg);
    }
    const input = collectInputs({ paths, somaHome });
    process.stdout.write(json ? `${JSON.stringify(input)}\n` : renderInputs(input));
    process.exitCode = input.gaps.length || !input.sources.length ? 1 : 0;
  } catch (error) {
    process.stderr.write(`${describe(error)}\n${USAGE}\n`);
    process.exitCode = 2;
  }
}
