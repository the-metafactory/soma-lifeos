import { expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const members = [
  "aperture-oscillation", "be-creative", "council", "first-principles", "ideate",
  "iterative-depth", "red-team", "root-cause-analysis", "science", "systems-thinking",
  "world-threat-model", "apify", "bright-data", "scraping", "browser", "interceptor", "webdesign",
];
const root = resolve(import.meta.dir, "..", "skills");

function markdownFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? markdownFiles(path) : path.endsWith(".md") ? [path] : [];
  });
}

for (const member of members) {
  test(`${member}: documents have no voice-server instructions or obsolete skill names`, () => {
    for (const path of markdownFiles(join(root, member))) {
      const content = readFileSync(path, "utf8");
      expect(content.match(/^#{2,3} .*Voice (?:Notification|Summary|Completion)/m), path).toBeNull();
      expect(content.match(/localhost:8888\/notify/), path).toBeNull();
      expect(content.match(/\b(?:BeCreative|RedTeam|IterativeDepth|ApertureOscillation|FirstPrinciples|RootCauseAnalysis|SystemsThinking|WorldThreatModel)\b/), path).toBeNull();
      expect(content.match(/skills\/(?:Browser|Interceptor|Webdesign|Apify|BrightData)\//), path).toBeNull();
      for (const invocation of content.matchAll(/Skill\("([a-z][a-z-]*)"/g)) {
        expect(statSync(join(root, invocation[1], "SKILL.md")).isFile(), path).toBe(true);
      }
    }
  });

  for (const path of markdownFiles(join(root, member)).filter(path =>
    path.endsWith("/SKILL.md") && readFileSync(path, "utf8").includes("## Execution Log\n"),
  )) {
    test(`${path.slice(root.length + 1)}: execution logs use file tools and JSON encoding`, () => {
      const content = readFileSync(path, "utf8");
      const log = /## Execution Log\n([\s\S]*?)(?=\n## |$)/.exec(content)?.[1];
      expect(log).toBeDefined();
      if (!log) throw new Error(`Missing execution log: ${path}`);
      expect(log).not.toMatch(/```(?:bash|sh)|\becho\b|\$\(/);
      expect(log).toContain("JSON.stringify");
      expect(log).toContain("file-write tool");
      const destination = `memory/SKILLS/${member}/execution.jsonl`;
      expect(log).toContain(destination);
      const manifest = readFileSync(join(root, member, "arc-manifest.yaml"), "utf8");
      expect(manifest.split(destination).length - 1).toBe(2);
      const example = /```json\n([\s\S]*?)\n```/.exec(log)?.[1];
      expect(example).toBeDefined();
      if (example) expect(JSON.parse(example).skill).toBe(member);
    });
  }
}

test("scraping routes to the pack's kebab-case web members", () => {
  const skill = readFileSync(join(root, "scraping", "SKILL.md"), "utf8");
  const routes = [...skill.matchAll(/`(\.\.\/[^`]+\/SKILL\.md)`/g)].map(match => match[1]);
  expect(routes).toEqual(["../bright-data/SKILL.md", "../apify/SKILL.md"]);
  for (const route of routes) expect(statSync(join(root, "scraping", route)).isFile()).toBe(true);
});

test("external thinking integrations have explicit optional fallbacks", () => {
  const integrations = new Map([
    ["be-creative", ["research", "evals", "art"]],
    ["council", ["research", "agents"]],
    ["ideate", ["research", "agents"]],
    ["science", ["research", "evals"]],
    ["systems-thinking", ["art"]],
    ["world-threat-model", ["research"]],
  ]);
  for (const [member, names] of integrations) {
    const skill = readFileSync(join(root, member, "SKILL.md"), "utf8");
    for (const name of names) expect(skill, member).toContain(`\`${name}\` is optional. If unavailable,`);
  }
  const experiment = readFileSync(join(root, "science", "Workflows", "DesignExperiment.md"), "utf8");
  expect(experiment).not.toMatch(/optional evals skill.*MANDATORY/);
});

test("world-threat-model advertises exactly its existing routed workflows", () => {
  const skill = readFileSync(join(root, "world-threat-model", "SKILL.md"), "utf8");
  const description = /^description: (.*)$/m.exec(skill)?.[1] ?? "";
  const routes = [...skill.matchAll(/`Workflows\/([A-Za-z]+)\.md`/g)].map(match => match[1]);
  expect(routes).toEqual(["TestIdea", "UpdateModels", "ViewModels"]);
  expect(description).not.toContain("TestScenario");
  for (const workflow of routes) {
    expect(description).toContain(workflow);
    expect(statSync(join(root, "world-threat-model", "Workflows", `${workflow}.md`)).isFile()).toBe(true);
  }
});

test("Dream links to the DAYDREAM phase in FullCycle", () => {
  const dream = readFileSync(join(root, "ideate", "Workflows", "Dream.md"), "utf8");
  expect(dream).not.toContain("Daydream.md");
  const target = /\]\(FullCycle\.md#([^)]*)\)/.exec(dream)?.[1];
  expect(target).toBeDefined();
  const fullCycle = readFileSync(join(root, "ideate", "Workflows", "FullCycle.md"), "utf8");
  const anchors = [...fullCycle.matchAll(/^#+ (.*)$/gm)].map(match =>
    match[1].toLowerCase().replace(/[^\w\- ]/g, "").replace(/ /g, "-"),
  );
  expect(anchors).toContain(target);
});
