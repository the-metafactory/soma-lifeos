import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { YAML } from "bun";
import { parseArgs, runBroadcast } from "../skills/broadcast/src/broadcast";
import type { Transport } from "../skills/broadcast/src/transport";
import { LinkedInAdapter } from "../skills/broadcast/src/adapters/linkedin";
import { assertLittleText, escapeLittleText, formatForLinkedIn, mentionSpansInCodePoints, truncateCodePoints } from "../skills/broadcast/src/format/linkedin-formatter";

const member = resolve(import.meta.dir, "../skills/broadcast");
const configured = {
  LINKEDIN_ACCESS_TOKEN: "fixture",
  MASTODON_INSTANCE: "https://social.example",
  MASTODON_TOKEN: "fixture",
};

function harness(options: {
  post?: boolean;
  interactive?: boolean;
  answers?: string[];
  env?: Record<string, string | undefined>;
  text?: string;
  transport?: Transport;
} = {}) {
  const lines: string[] = [];
  const prompts: string[] = [];
  const calls: { url: string; init: RequestInit }[] = [];
  const transport: Transport = async (url, init) => {
    calls.push({ url, init });
    if (options.transport) return options.transport(url, init);
    if (url.endsWith("/userinfo")) return Response.json({ sub: "member-fixture" });
    if (url.endsWith("/rest/posts")) return new Response(null, { status: 201, headers: { "x-restli-id": "urn:li:share:123" } });
    return Response.json({ id: "456" });
  };
  const result = runBroadcast({
    args: ["--text", options.text ?? "A short post.", ...(options.post ? ["--post"] : [])],
    env: options.env ?? configured,
    interactive: options.interactive ?? true,
    write: text => { lines.push(text); },
    confirm: async prompt => {
      prompts.push(prompt);
      return options.answers?.[prompts.length - 1] ?? "";
    },
    transport,
  });
  return { result, lines, prompts, calls };
}

test("default preview prints both channels without verifying credentials or sending", async () => {
  for (const env of [configured, {}, { LINKEDIN_ACCESS_TOKEN: "fixture" }, {
    MASTODON_INSTANCE: "https://social.example", MASTODON_TOKEN: "fixture",
  }]) {
    const run = harness({ env });
    expect(await run.result).toBe(0);
    expect(run.lines.join("\n")).toContain("LinkedIn preview");
    expect(run.lines.join("\n")).toContain("Mastodon preview");
    expect(run.lines.join("\n")).toContain("Nothing sent");
    if (!("LINKEDIN_ACCESS_TOKEN" in env)) expect(run.lines[0]).toContain("unavailable");
    if (!("MASTODON_TOKEN" in env)) expect(run.lines[1]).toContain("unavailable");
    expect(run.calls).toEqual([]);
    expect(run.prompts).toEqual([]);
  }
});

test("non-interactive --post refuses even when both credentials and yes answers exist", async () => {
  const run = harness({ post: true, interactive: false, answers: ["yes", "yes"] });
  expect(await run.result).toBe(1);
  expect(run.lines.join("\n")).toContain("Refused --post");
  expect(run.calls).toEqual([]);
  expect(run.prompts).toEqual([]);
});

test("each post requires explicit yes; blank, y, no and false-like input send nothing", async () => {
  for (const answer of ["", "y", "no", "true", "yes to all"]) {
    const run = harness({ post: true, answers: [answer, answer] });
    expect(await run.result).toBe(0);
    expect(run.calls).toEqual([]);
    expect(run.prompts).toHaveLength(2);
    expect(run.lines.join("\n")).toContain("LinkedIn: skipped");
    expect(run.lines.join("\n")).toContain("Mastodon: skipped");
  }
});

test("one yes authorizes only its channel, in either order", async () => {
  const linkedin = harness({ post: true, answers: [" YES ", "no"] });
  expect(await linkedin.result).toBe(0);
  expect(linkedin.calls.map(call => call.url)).toEqual([
    "https://api.linkedin.com/v2/userinfo", "https://api.linkedin.com/rest/posts",
  ]);
  const mastodon = harness({ post: true, answers: ["no", "yes"] });
  expect(await mastodon.result).toBe(0);
  expect(mastodon.calls.map(call => call.url)).toEqual(["https://social.example/api/v1/statuses"]);
});

test("both confirmed sends use the previewed bodies and upstream LinkedIn REST shape", async () => {
  const text = "**Hello** (reader) https://example.org #News";
  const run = harness({ post: true, answers: ["yes", "yes"], text });
  expect(await run.result).toBe(0);
  expect(run.calls).toHaveLength(3);
  const linkedin = run.calls.find(call => call.url.endsWith("/rest/posts"));
  expect(linkedin?.init.method).toBe("POST");
  const headers = new Headers(linkedin?.init.headers);
  expect(headers.get("authorization")).toBe("Bearer fixture");
  expect(headers.get("linkedin-version")).toBe("202601");
  expect(headers.get("x-restli-protocol-version")).toBe("2.0.0");
  const commentary = escapeLittleText(formatForLinkedIn(text));
  expect(JSON.parse(String(linkedin?.init.body))).toEqual({
    author: "urn:li:person:member-fixture",
    commentary,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  });
  expect(run.lines[0]).toContain(commentary);
  expect(run.prompts[0]).toContain(commentary);
  const mastodon = run.calls.find(call => call.url.endsWith("/api/v1/statuses"));
  expect(mastodon?.init.method).toBe("POST");
  expect(new Headers(mastodon?.init.headers).get("authorization")).toBe("Bearer fixture");
  expect(new Headers(mastodon?.init.headers).get("idempotency-key")).toBeTruthy();
  expect(String(mastodon?.init.body)).toBe(new URLSearchParams({ status: text, visibility: "public" }).toString());
  expect(run.lines[1]).toContain(text);
  expect(run.prompts[1]).toContain(text);
});

test("missing LinkedIn credentials still allow the confirmed Mastodon post", async () => {
  const run = harness({ post: true, answers: ["yes"], env: {
    MASTODON_INSTANCE: "https://social.example/", MASTODON_TOKEN: "fixture",
  } });
  expect(await run.result).toBe(0);
  expect(run.prompts).toHaveLength(1);
  expect(run.prompts[0]).toContain("Mastodon");
  expect(run.calls.map(call => call.url)).toEqual(["https://social.example/api/v1/statuses"]);
});

test("an invalid Mastodon origin remains unavailable without blocking LinkedIn", async () => {
  for (const instance of ["http://social.example", "invalid", "https://social.example/api", "https://user:pass@social.example", "https://social.example/?key=value", "https://social.example/#fragment"]) {
    const run = harness({ post: true, answers: ["yes"], env: { ...configured, MASTODON_INSTANCE: instance } });
    expect(await run.result).toBe(0);
    expect(run.lines[1]).toContain("unavailable");
    expect(run.prompts).toHaveLength(1);
    expect(run.calls.every(call => call.url.startsWith("https://api.linkedin.com/"))).toBe(true);
  }
});

test("HTTP, malformed identity, and transport failures do not block the other channel or leak errors", async () => {
  for (const response of [new Response("fixture-secret", { status: 401 }), Response.json({ sub: 42 }), Response.json(null)]) {
    const run = harness({ post: true, answers: ["yes", "yes"], transport: async url =>
      url.endsWith("/userinfo") ? response : Response.json({ id: "456" }),
    });
    expect(await run.result).toBe(1);
    expect(run.lines.join("\n")).toContain("Mastodon: posted");
    expect(run.lines.join("\n")).not.toContain("fixture-secret");
    expect(run.calls.filter(call => call.url.endsWith("/rest/posts"))).toHaveLength(0);
  }
  const run = harness({ post: true, answers: ["yes", "yes"], transport: async url => {
    if (url.includes("linkedin")) throw new Error("fixture-secret");
    return Response.json({ id: "456" });
  } });
  expect(await run.result).toBe(1);
  expect(run.lines.join("\n")).toContain("Mastodon: posted");
  expect(run.lines.join("\n")).not.toContain("fixture-secret");
});

test("post failures and malformed successes are reported without retrying", async () => {
  for (const failure of [new Response("fixture-secret", { status: 429 }), Response.json({}), Response.json({ id: 456 })]) {
    const run = harness({ post: true, answers: ["no", "yes"], transport: async () => failure });
    expect(await run.result).toBe(1);
    expect(run.calls).toHaveLength(1);
    expect(run.lines.join("\n")).toContain("Check the channel before retrying");
    expect(run.lines.join("\n")).not.toContain("fixture-secret");
  }
  for (const failure of [new Response(null, { status: 403 }), new Response(null, { status: 201 })]) {
    const run = harness({ post: true, answers: ["yes", "no"], transport: async url =>
      url.endsWith("/userinfo") ? Response.json({ sub: "member-fixture" }) : failure,
    });
    expect(await run.result).toBe(1);
    expect(run.calls).toHaveLength(2);
  }
});

test("Mastodon reports its public status URL and rejects lookalike origins", async () => {
  const fallback = "https://social.example/api/v1/statuses/456";
  for (const [url, expected] of [
    ["https://social.example/@reader/456", "https://social.example/@reader/456"],
    [undefined, fallback],
    [42, fallback],
    ["https://elsewhere.example/@reader/456", fallback],
    ["https://social.example.evil.example/456", fallback],
    ["https://social.example@evil.example/456", fallback],
    ["https://social.example:8443/@reader/456", fallback],
    ["https://social.example/\u001b[2J", fallback],
  ]) {
    const run = harness({ post: true, answers: ["no", "yes"], transport: async () =>
      Response.json({ id: "456", url }),
    });
    expect(await run.result).toBe(0);
    expect(run.lines.at(-1)).toBe(`Mastodon: posted ${expected}`);
    expect(run.calls).toHaveLength(1);
  }
});

test("safe adapter failure details survive without echoing response bodies", async () => {
  for (const [channel, endpoint, response, detail] of [
    ["LinkedIn", "/userinfo", new Response("fixture-secret", { status: 401 }), "LinkedIn user info failed (HTTP 401)"],
    ["LinkedIn", "/userinfo", Response.json({ sub: 42 }), "LinkedIn user info is missing a valid member id"],
    ["LinkedIn", "/rest/posts", new Response("fixture-secret", { status: 429 }), "LinkedIn post failed (HTTP 429)"],
    ["LinkedIn", "/rest/posts", new Response(null, { status: 201 }), "LinkedIn accepted the post but returned no post id"],
    ["Mastodon", "/api/v1/statuses", new Response("fixture-secret", { status: 401 }), "Mastodon post failed (HTTP 401)"],
    ["Mastodon", "/api/v1/statuses", new Response("fixture-secret", { status: 429 }), "Mastodon post failed (HTTP 429)"],
    ["Mastodon", "/api/v1/statuses", Response.json({}), "Mastodon accepted the post but returned no valid id"],
  ] satisfies [string, string, Response, string][]) {
    const run = harness({ post: true, answers: ["yes", "yes"], transport: async url => {
      if (url.endsWith(endpoint)) return response;
      if (url.endsWith("/userinfo")) return Response.json({ sub: "member-fixture" });
      if (url.endsWith("/rest/posts")) return new Response(null, { status: 201, headers: { "x-restli-id": "urn:li:share:123" } });
      return Response.json({ id: "456" });
    } });
    expect(await run.result).toBe(1);
    const output = run.lines.join("\n");
    expect(output).toContain(`${channel}: failed (${detail})`);
    expect(output).toContain("Check the channel before retrying");
    expect(output).toContain(`${channel === "LinkedIn" ? "Mastodon" : "LinkedIn"}: posted`);
    expect(output).not.toContain("fixture-secret");
  }
});

test("arguments reject empty content, removed platform switches, automatic approval and terminal escapes", () => {
  for (const args of [[], ["--post"], ["--text", ""], ["--text"], ["--text", "--post"], ["--text", "ok", "--yes"], ["--text", "ok", "--platform", "twitter"], ["--text", "ok", "--post", "--post"], ["--text", "ok\u001b[2J"]]) {
    expect(() => parseArgs(args)).toThrow();
  }
  expect(parseArgs(["--help"])).toEqual({ kind: "help" });
  expect(parseArgs(["--post", "--text", "two\nlines"])).toEqual({ kind: "broadcast", post: true, text: "two\nlines" });
});

test("upstream formatter preserves URLs, mentions and emoji while escaping and truncating safely", () => {
  const adapter = new LinkedInAdapter("fixture", async () => { throw new Error("unexpected network"); });
  expect(adapter.commentaryText("**Hook** (body) #News https://example.org/x_(y)"))
    .toBe("𝗛𝗼𝗼𝗸 \\(body\\) #News https://example.org/x_(y)");
  const text = "😀".repeat(3001);
  const result = adapter.commentaryText(text);
  expect(Array.from(result)).toHaveLength(3000);
  expect(result.endsWith("...")).toBe(true);
  for (const input of ["a".repeat(2996) + "@[Reader](urn:li:person:abc)", "a".repeat(2996) + "(rest)", "a".repeat(2996) + "#News"]) {
    expect(() => assertLittleText(adapter.commentaryText(input))).not.toThrow();
  }
  expect(truncateCodePoints("long", 2)).toBe("..");
  expect(() => assertLittleText("unescaped (body)")).toThrow();
});

test("shared URL and mention detection preserves protected spans through formatting and escaping", () => {
  const mention = "@[Reader](urn:li:person:abc_123)";
  const organization = "@[Team](urn:li:organization:xyz-789)";
  const url = "https://example.org/a_*b_(c)";
  const text = `**Hello** ${mention} ${organization} ${url}`;
  const formatted = formatForLinkedIn(text);
  expect(formatted).toBe(`𝗛𝗲𝗹𝗹𝗼 ${mention} ${organization} ${url}`);
  expect(escapeLittleText(formatted)).toBe(formatted);
  expect(() => assertLittleText(formatted)).not.toThrow();
  const spans = mentionSpansInCodePoints(`😀 ${mention} ${organization}`);
  expect(spans).toEqual([
    { start: 2, end: 2 + mention.length },
    { start: 3 + mention.length, end: 3 + mention.length + organization.length },
  ]);
  expect(mentionSpansInCodePoints(`😀 ${mention} ${organization}`)).toEqual(spans);
  expect(truncateCodePoints(`😀 ${mention} tail`, 12)).toBe("😀...");
  expect(formatForLinkedIn("**Hi `x*y` friend**")).toBe("𝗛𝗶 `x*y` 𝗳𝗿𝗶𝗲𝗻𝗱");
  expect(escapeLittleText("#News (body)")).toBe("#News \\(body\\)");
});

test("CLI runs from the member directory and refuses piped approval", () => {
  const env = { PATH: process.env.PATH ?? "", ...configured };
  const preview = Bun.spawnSync([process.execPath, "Tools/Broadcast.ts", "--text", "CLI preview."], { cwd: member, env });
  expect(preview.exitCode).toBe(0);
  expect(preview.stdout.toString()).toContain("LinkedIn preview");
  expect(preview.stdout.toString()).toContain("Mastodon preview");
  expect(preview.stdout.toString()).toContain("Preview only. Nothing sent.");
  const post = Bun.spawnSync([process.execPath, "Tools/Broadcast.ts", "--text", "CLI preview.", "--post"], {
    cwd: member, env, stdin: Buffer.from("yes\nyes\n"),
  });
  expect(post.exitCode).toBe(1);
  expect(post.stdout.toString()).toContain("Refused --post");
  expect(post.stdout.toString()).not.toContain(": posted");
  const help = Bun.spawnSync([process.execPath, "Tools/Broadcast.ts", "--help"], { cwd: member, env });
  expect(help.exitCode).toBe(0);
  expect(help.stdout.toString()).toContain("Usage:");
  const invalid = Bun.spawnSync([process.execPath, "Tools/Broadcast.ts", "--yes"], { cwd: member, env });
  expect(invalid.exitCode).toBe(1);
});

test("member provenance and skill pointers match the port contract", () => {
  const manifest = YAML.parse(readFileSync(resolve(member, "arc-manifest.yaml"), "utf8"));
  expect(manifest.upstream).toEqual({
    repo: "danielmiessler/PAI", path: "LifeOS/install/skills/Broadcast", commit: "fb9aef4640a73feae4c2e6483b26f58491ce2665",
  });
  const skill = readFileSync(resolve(member, "SKILL.md"), "utf8");
  expect(skill).toContain("name: broadcast");
  expect(readFileSync(resolve(member, "Setup.md"), "utf8")).toContain("Removed upstream features:");
});
