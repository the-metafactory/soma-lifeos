import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { checkReport } from "../skills/unify/Tools/CheckReport.ts";
import { collectInputs, renderInputs } from "../skills/unify/Tools/CollectInputs.ts";

const member = resolve(import.meta.dir, "../skills/unify");
const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function temporary(): string {
  const path = mkdtempSync(join(tmpdir(), "unify-test-"));
  dirs.push(path);
  return path;
}

function put(root: string, path: string, text: string): string {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return file;
}

function cli(tool: string, args: string[], env: Record<string, string> = {}) {
  return Bun.spawnSync([process.execPath, `Tools/${tool}.ts`, ...args], {
    cwd: member, env: { ...process.env, ...env }, stdout: "pipe", stderr: "pipe",
  });
}

const report = `# Unify report

## The verdict

F1: Publication approval and unattended publishing conflict.

## Summit

Publish useful updates with owner control (rules/a.md:1).

## Inputs

| Path | Principles | Aim |
| --- | --- | --- |
| rules/a.md | Owner approval | Owner control |
| rules/b.md | Unattended publishing | Timely updates |

## Harmony map

| A | B | Relationship | Mechanism | Evidence (both sides) |
| --- | --- | --- | --- | --- |
| rules/a.md:1 | rules/b.md:2 | conflict | F1: An unattended publish cannot also wait for approval. | rules/a.md:1: “Ask before publishing.”; rules/b.md:2: “Publish without asking.” |

## Stragglers

None found.

## Unifying principle

Prepare unattended; publish on approval.

## Recommendations

| # | Change | Resolves | Lands in | Proof it worked | Needs yes? |
| --- | --- | --- | --- | --- | --- |
| 1 | Replace unattended publish with preview. | F1 | rules/b.md | Run unattended and verify only a preview exists. | Yes |

## Lens trail

First principles confirmed F1 is incompatible at publication time.
System design placed approval at publication.
Systems thinking found a competing control in F1.
`;

test("default collection reads only skills, policy and purpose, including skill references", () => {
  const home = temporary();
  const skill = put(home, "skills/example/SKILL.md", "Skill rule.");
  const reference = put(home, "skills/example/references/rule.md", "Detailed rule.");
  const policy = put(home, "policy/behavior.md", "Approval rule.");
  const purpose = put(home, "profile/purpose.md", "Create useful things.");
  put(home, "profile/identity.md", "Outside default scope.");
  put(home, "memory/private.md", "Outside default scope.");
  const input = collectInputs({ paths: [], somaHome: home });
  expect(input.mode).toBe("default");
  expect(input.sources.map(source => source.path)).toEqual([skill, reference, policy, purpose]);
  expect(input.gaps).toEqual([]);
  expect(renderInputs(input)).toContain("1: Approval rule.");
  expect(existsSync(join(home, "memory/SKILLS/unify"))).toBe(false);
});

test("explicit files replace defaults, preserve bytes and do not follow document pointers", () => {
  const home = temporary();
  const left = put(home, "selected/a.md", "See ../outside.md.\nAsk before publishing.\n");
  const right = put(home, "selected/b.md", "Publish without asking.\n");
  put(home, "outside.md", "Excluded.");
  put(home, "profile/purpose.md", "Excluded purpose.");
  const input = collectInputs({ paths: [left, right, left], somaHome: home });
  expect(input.mode).toBe("explicit");
  expect(input.sources).toEqual([
    { path: left, text: readFileSync(left, "utf8") },
    { path: right, text: readFileSync(right, "utf8") },
  ]);
  expect(input.gaps).toEqual([]);
  expect(readFileSync(left, "utf8")).toBe("See ../outside.md.\nAsk before publishing.\n");
});

test("default follows installed skill links but explicit trees do not escape through links", () => {
  const home = temporary();
  const installed = temporary();
  put(installed, "SKILL.md", "Installed skill.");
  const outside = put(home, "outside.md", "Outside.");
  put(home, "policy/behavior.md", "Policy.");
  put(home, "profile/purpose.md", "Purpose.");
  mkdirSync(join(home, "skills"));
  symlinkSync(installed, join(home, "skills/example"));
  symlinkSync(join(home, "missing"), join(home, "skills/broken"));
  symlinkSync(installed, join(installed, "cycle"));
  symlinkSync(outside, join(installed, "escape.md"));
  const input = collectInputs({ paths: [], somaHome: home });
  expect(input.sources.map(source => source.path)).toEqual([
    join(home, "skills/example/SKILL.md"), join(home, "policy/behavior.md"), join(home, "profile/purpose.md"),
  ]);
  expect(input.gaps.some(gap => gap.reason.includes("cycle"))).toBe(true);
  expect(input.gaps.some(gap => gap.path.endsWith("broken"))).toBe(true);
  expect(input.gaps.some(gap => gap.reason.includes("leaves selected directory"))).toBe(true);
  const explicit = collectInputs({ paths: [join(home, "skills")], somaHome: home });
  expect(explicit.sources).toEqual([]);
});

test("unreadable, binary, hidden and dependency sources become visible coverage gaps", () => {
  const home = temporary();
  put(home, "scope/a.md", "Readable.");
  put(home, "scope/.env", "Excluded.");
  put(home, "scope/node_modules/pkg/code.js", "Excluded.");
  const binary = put(home, "scope/image.bin", "\u0000binary");
  writeFileSync(join(home, "scope/invalid.txt"), new Uint8Array([0xff, 0xff]));
  const input = collectInputs({ paths: [join(home, "scope"), join(home, "missing.md")], somaHome: home });
  expect(input.sources).toHaveLength(1);
  expect(input.gaps).toHaveLength(5);
  expect(input.gaps).toContainEqual({ path: binary, reason: "Binary file excluded" });
  expect(renderInputs(input)).toContain("Coverage gaps:");
  expect(collectInputs({ paths: [], somaHome: home }).gaps).toHaveLength(4);
});

test("default collection skips installed links without a regular skill entry file", () => {
  const home = temporary();
  const outside = temporary();
  put(home, "skills/local/SKILL.md", "Local skill.");
  put(home, "policy/behavior.md", "Policy.");
  put(home, "profile/purpose.md", "Purpose.");
  const unrelated = put(outside, "unrelated/secret.txt", "Unrelated text must stay outside collection.");
  mkdirSync(join(outside, "directory-marker/SKILL.md"), { recursive: true });
  mkdirSync(join(outside, "linked-marker"));
  const marker = put(outside, "marker.md", "External marker must not qualify a skill.");
  symlinkSync(marker, join(outside, "linked-marker/SKILL.md"));
  const targets = [dirname(unrelated), unrelated, join(outside, "directory-marker"), join(outside, "linked-marker")];
  for (const [index, target] of targets.entries()) symlinkSync(target, join(home, `skills/rejected-${index}`));
  const input = collectInputs({ paths: [], somaHome: home });
  expect(input.sources).toHaveLength(3);
  expect(input.sources.every(source => !source.path.includes("rejected-"))).toBe(true);
  expect(input.gaps).toHaveLength(targets.length);
  for (const gap of input.gaps) expect(gap.reason).toContain("regular SKILL.md");
});

test("collector CLI works from member directory with environment, home override and explicit paths", () => {
  const home = temporary();
  put(home, "skills/example/SKILL.md", "Skill.");
  const policy = put(home, "policy/behavior.md", "Policy.");
  put(home, "profile/purpose.md", "Purpose.");
  const fromEnv = cli("CollectInputs", ["--json"], { SOMA_HOME: home });
  expect(fromEnv.exitCode).toBe(0);
  expect(JSON.parse(fromEnv.stdout.toString()).sources).toHaveLength(3);
  const override = cli("CollectInputs", ["--soma-home", home, "--json"], { SOMA_HOME: join(home, "missing") });
  expect(override.exitCode).toBe(0);
  const explicit = cli("CollectInputs", [policy], { SOMA_HOME: join(home, "missing") });
  expect(explicit.exitCode).toBe(0);
  expect(explicit.stdout.toString()).toContain("Unify sources (explicit)");
  expect(explicit.stdout.toString()).not.toContain("Purpose.");
  for (const args of [["--soma-home"], ["--soma-home", "--json"], ["--unknown"]]) {
    expect(cli("CollectInputs", args).exitCode).toBe(2);
  }
  const missing = cli("CollectInputs", [join(home, "absent.md")]);
  expect(missing.exitCode).toBe(1);
  expect(missing.stdout.toString()).toContain("No readable text sources");
  expect(cli("CollectInputs", ["--help"]).exitCode).toBe(0);
});

test("report checker accepts a cited conflict and an explicit absence of conflicts", () => {
  expect(checkReport(report)).toEqual({ ok: true, problems: [], recommendations: 1, harmonyRows: 1, stragglerRows: 0 });
  const noFindings = report
    .replace(/\| rules\/a.md:1 \| rules\/b.md:2.*\n/, "No conflicts found within the inspected scope.\n")
    .replace(/\| 1 \| Replace.*\n/, "None warranted.\n");
  expect(checkReport(noFindings).ok).toBe(true);
  expect(checkReport(noFindings.replace("No conflicts found within the inspected scope.", "" )).ok).toBe(false);
  expect(checkReport(noFindings.replace("None warranted.", "" )).ok).toBe(false);
});

test("report checker rejects absent or misordered sections and unsupported relationship labels", () => {
  expect(checkReport(report.replace("## Summit", "## Goal")).problems).toContain('section "summit" is missing');
  const reordered = report.replace("## Summit", "## Temporary").replace("## Inputs", "## Summit").replace("## Temporary", "## Inputs");
  expect(checkReport(reordered).ok).toBe(false);
  expect(checkReport(report.replace("| conflict |", "| conflictual |" )).ok).toBe(false);
  expect(checkReport(report.replace("## Unifying principle\n\nPrepare unattended; publish on approval.", "## Unifying principle")).ok).toBe(false);
});

test("report checker rejects one-sided evidence and source-less conflict rows", () => {
  const oneSided = report.replace('rules/b.md:2: “Publish without asking.”', 'An assertion with no second citation.');
  expect(checkReport(oneSided).problems.some(problem => problem.includes("does not cite B"))).toBe(true);
  expect(checkReport(report.replace("| rules/a.md:1 |", "| rules/a.md |" )).ok).toBe(false);
  expect(checkReport(report.replace(/rules\/a.md:1: “Ask before publishing.”; rules\/b.md:2: “Publish without asking.”/, "none")).ok).toBe(false);
});

test("citation matching requires the exact path and line, not a substring", () => {
  expect(checkReport(report.replace('rules/b.md:2: “Publish', 'rules/b.md:20: “Publish')).ok).toBe(false);
  expect(checkReport(report.replace('rules/b.md:2: “Publish', 'other/rules/b.md:2: “Publish')).ok).toBe(false);
});

test("table rows after a blank line cannot evade evidence checks or the recommendation cap", () => {
  const hiddenConflict = report.replace("## Stragglers", "| rules/a.md:1 | rules/b.md:2 | conflict | Hidden conflict | No citations. |\n\n## Stragglers");
  expect(checkReport(hiddenConflict).ok).toBe(false);
  const hiddenRecommendation = report.replace("## Lens trail", "| 2 | More preview. | F1 | rules/b.md | Inspect preview. | Yes |\n\n## Lens trail");
  expect(checkReport(hiddenRecommendation, 1).ok).toBe(false);
});

test("stragglers need line citations and recommendations need a destination and proof within the cap", () => {
  expect(checkReport(report.replace("None found.", "| Path | Stale rule |\n| --- | --- |\n| old.md:4 | Obsolete rule |" )).ok).toBe(true);
  expect(checkReport(report.replace("None found.", "| Path | Stale rule |\n| --- | --- |\n| old.md | Obsolete rule |" )).ok).toBe(false);
  expect(checkReport(report.replace("None found.", "" )).ok).toBe(false);
  expect(checkReport(report.replace("| rules/b.md | Run unattended", "| none | Run unattended")).ok).toBe(false);
  expect(checkReport(report.replace("Run unattended and verify only a preview exists.", "" )).ok).toBe(false);
  const extra = report.replace("## Lens trail", "| 2 | More preview. | F1 | rules/b.md | Inspect preview. | Yes |\n\n## Lens trail").replace("Yes |\n\n| 2", "Yes |\n| 2");
  expect(checkReport(extra, 1).ok).toBe(false);
  expect(() => checkReport(report, 0)).toThrow("positive integer");
});

test("checker CLI prints pass, failures and JSON, and refuses malformed options or unreadable paths", () => {
  const root = temporary();
  const valid = put(root, "report.md", report);
  const invalid = put(root, "invalid.md", "Not a report.");
  expect(cli("CheckReport", [valid]).stdout.toString()).toContain("PASS");
  const json = cli("CheckReport", [valid, "--json"]);
  expect(json.exitCode).toBe(0);
  expect(JSON.parse(json.stdout.toString()).ok).toBe(true);
  const failure = cli("CheckReport", [invalid]);
  expect(failure.exitCode).toBe(1);
  expect(failure.stdout.toString()).toContain("FAIL");
  for (const args of [[], [join(root, "missing.md")], [valid, "--unknown"], [valid, invalid], [valid, "--max-recs"], [valid, "--max-recs", "0"]]) {
    expect(cli("CheckReport", args).exitCode).toBe(2);
  }
  expect(cli("CheckReport", ["--help"]).exitCode).toBe(0);
});

test("member has no forbidden subsystem references and all local documentation links resolve", () => {
  const input = collectInputs({ paths: [member], somaHome: temporary() });
  expect(input.gaps).toEqual([]);
  for (const source of input.sources) {
    expect(source.text).not.toMatch(/~\/\.claude|LIFEOS_|SystemContext|SkillHygieneGate/);
    if (!source.path.endsWith(".md")) continue;
    for (const match of source.text.matchAll(/\]\(([^)]+)\)/g)) {
      expect(existsSync(resolve(dirname(source.path), match[1]!))).toBe(true);
    }
  }
});
