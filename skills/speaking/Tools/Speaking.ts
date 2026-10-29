import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseConfig, renderDraft, renderSearch, saveMarkdown, search } from "./Calls.ts";

const help = `Speaking — local CFP search and proposal drafts
Run from the member directory:
  bun Tools/Speaking.ts search [--json] [--save] [--config PATH] [--soma-home PATH]
  bun Tools/Speaking.ts draft --call URL --title TEXT --angle TEXT
    --takeaway TEXT --takeaway TEXT --takeaway TEXT [--save] [--config PATH] [--soma-home PATH]
Config: explicit path, private memory/SKILLS/speaking/config.json, then bundled config.json.
Soma home: --soma-home, SOMA_HOME, then $HOME/.soma.
Exit: 0 checked source/draft, 1 no source available in region, 2 invalid input or local error.
`;

function options(args: string[]) {
  const command = args[0];
  if (command !== "search" && command !== "draft") throw new Error("choose search or draft; use --help for usage");
  let configPath: string | undefined;
  let somaHome = process.env.SOMA_HOME || join(homedir(), ".soma");
  let json = false;
  let save = false;
  let call: string | undefined;
  let title: string | undefined;
  let angle: string | undefined;
  const takeaways: string[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < args.length; i++) {
    const flag = args[i];
    if (!flag) continue;
    if (seen.has(flag) && flag !== "--takeaway") throw new Error(`duplicate option ${flag}`);
    seen.add(flag);
    if (flag === "--json") { json = true; continue; }
    if (flag === "--save") { save = true; continue; }
    if (!["--config", "--soma-home", "--call", "--title", "--angle", "--takeaway"].includes(flag)) throw new Error(`unknown option ${flag}`);
    const value = args[++i];
    if (!value?.trim() || value.startsWith("--")) throw new Error(`${flag} needs a value`);
    switch (flag) {
      case "--config": configPath = resolve(value); break;
      case "--soma-home": somaHome = value; break;
      case "--call": call = value; break;
      case "--title": title = value; break;
      case "--angle": angle = value; break;
      case "--takeaway": takeaways.push(value); break;
    }
  }
  if (command === "search" && (call || title || angle || takeaways.length)) throw new Error("draft options require the draft command");
  if (command === "draft" && (json || !call || !title || !angle || takeaways.length !== 3)) throw new Error("draft needs --call, --title, --angle and three --takeaway values; --json is search-only");
  return { command, configPath, somaHome: resolve(somaHome), json, save, call, title, angle, takeaways };
}

export async function main(args = process.argv.slice(2)): Promise<number> {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) { process.stdout.write(help); return 0; }
  try {
    const opts = options(args);
    const privateConfig = join(opts.somaHome, "memory/SKILLS/speaking/config.json");
    const configPath = opts.configPath ?? (await Bun.file(privateConfig).exists() ? privateConfig : resolve(import.meta.dir, "../config.json"));
    const config = parseConfig(await Bun.file(configPath).json());
    const result = await search(config);
    if (opts.command === "search") {
      const markdown = renderSearch(result);
      if (opts.save) await saveMarkdown(opts.somaHome, "opportunities", markdown);
      process.stdout.write(opts.json ? JSON.stringify(result, null, 2) + "\n" : markdown);
      return result.sources.some(s => s.kind === "checked") ? 0 : 1;
    }
    const call = result.calls.find(c => c.url === opts.call);
    if (!call) throw new Error("chosen call is not currently open and matching; run search and inspect source statuses");
    if (!opts.title || !opts.angle) throw new Error("draft requires a title and angle");
    const markdown = renderDraft({ call, checkedAt: result.checkedAt, title: opts.title, angle: opts.angle, takeaways: opts.takeaways });
    if (opts.save) await saveMarkdown(opts.somaHome, "proposal", markdown);
    process.stdout.write(markdown);
    return 0;
  } catch (error) {
    process.stderr.write(`speaking: ${error instanceof Error ? error.message : String(error)}\n`);
    return 2;
  }
}

if (import.meta.main) process.exitCode = await main();
