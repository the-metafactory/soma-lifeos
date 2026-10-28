import { afterEach, expect, test } from "bun:test";
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
});

test("an empty library passes", () => {
  expect(checkPack(library("[]"))).toBe(0);
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
