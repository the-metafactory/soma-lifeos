import { afterEach, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkPack } from "../scripts/check-pack";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function library(artifacts: string): string {
  const dir = mkdtempSync(join(tmpdir(), "soma-lifeos-"));
  dirs.push(dir);
  writeFileSync(
    join(dir, "arc-manifest.yaml"),
    `schema: arc/v1\nname: soma-lifeos\nversion: 0.1.0\ntype: library\nlicense: MIT\nartifacts: ${artifacts}\n`,
  );
  return dir;
}

test("the repo's own manifest passes", () => {
  expect(checkPack(resolve(import.meta.dir, ".."))).toBe(0);
}, 60_000);

test("an empty library passes", () => {
  expect(checkPack(library("[]"))).toBe(0);
});

test.each([31337, 8888])("rejects localhost:%i in any nested skill file with its line number", (port) => {
  const dir = library("[]");
  const workflow = join(dir, "skills", "unlisted", "Workflows", "notify.txt");
  mkdirSync(join(workflow, ".."), { recursive: true });
  writeFileSync(workflow, `First line\r\n\r\ncurl http://localhost:${port}/notify\r\nAgain: localhost:${port}\r\n`);
  const errors = spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(checkPack(dir)).toBe(1);
    expect(errors.mock.calls).toEqual([
      [`skills/unlisted/Workflows/notify.txt:3: forbidden local notification endpoint localhost:${port}`],
      [`skills/unlisted/Workflows/notify.txt:4: forbidden local notification endpoint localhost:${port}`],
    ]);
  } finally {
    errors.mockRestore();
  }
});

test("allows unrelated local services and ignores files outside skills", () => {
  const dir = library("[]");
  mkdirSync(join(dir, "skills", "demo"), { recursive: true });
  writeFileSync(join(dir, "skills", "demo", "server.ts"), 'fetch("http://localhost:3000");\n');
  writeFileSync(join(dir, "README.md"), "Retired endpoints: localhost:31337 and localhost:8888\n");
  expect(checkPack(dir)).toBe(0);
});

test("a member pinned to another upstream fails", () => {
  const dir = library("\n  - path: skills/demo");
  mkdirSync(join(dir, "skills", "demo"), { recursive: true });
  writeFileSync(
    join(dir, "skills", "demo", "arc-manifest.yaml"),
    "schema: arc/v1\nname: demo\nversion: 0.1.0\ntype: skill\nupstream:\n  repo: cursor/plugins\n  path: x\n  commit: 2fde1bbe9e8f280cd4998e244b53e3c66f3dc8b9\n",
  );
  writeFileSync(join(dir, "skills", "demo", "SKILL.md"), "---\nname: demo\ndescription: Demo.\n---\n");
  expect(checkPack(dir)).toBe(1);
});
