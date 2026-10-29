import { LinkedInAdapter } from "./adapters/linkedin";
import { postMastodon } from "./adapters/mastodon";
import { AdapterError } from "./adapters/adapter-error";
import { network, type Transport } from "./transport";

type Environment = Readonly<Record<string, string | undefined>>;
type Channel = {
  name: "LinkedIn" | "Mastodon";
  text: string;
} & (
  | { kind: "available"; destination: string; send: () => Promise<string> }
  | { kind: "unavailable"; reason: string }
);

export const help = "Usage: bun Tools/Broadcast.ts --text <content> [--post]\nPreview LinkedIn and Mastodon by default. --post requires a terminal and yes per post.";

export function parseArgs(args: string[]): { kind: "help" } | { kind: "broadcast"; text: string; post: boolean } {
  if (args.length === 1 && args[0] === "--help") return { kind: "help" };
  let text: string | undefined;
  let post = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--text" && text === undefined) {
      text = args[++index];
      if (text === undefined || text.startsWith("--")) throw new Error("--text requires content");
    } else if (arg === "--post" && !post) {
      post = true;
    } else {
      throw new Error("Unknown or repeated argument. Use --help.");
    }
  }
  if (!text?.trim()) throw new Error("--text requires non-empty content");
  if (/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(text)) {
    throw new Error("Content contains terminal control characters");
  }
  return { kind: "broadcast", text, post };
}

function instanceOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password
      || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function channels(text: string, env: Environment, transport: Transport): Channel[] {
  const linkedinToken = env.LINKEDIN_ACCESS_TOKEN?.trim();
  const linkedin = new LinkedInAdapter(linkedinToken ?? "", transport);
  const linkedinText = linkedin.commentaryText(text);
  const mastodonToken = env.MASTODON_TOKEN?.trim();
  const mastodonInstance = env.MASTODON_INSTANCE?.trim();
  const instance = mastodonInstance ? instanceOrigin(mastodonInstance) : null;
  return [
    linkedinToken
      ? { name: "LinkedIn", text: linkedinText, kind: "available", destination: "LinkedIn (public)", send: () => linkedin.post(linkedinText) }
      : { name: "LinkedIn", text: linkedinText, kind: "unavailable", reason: "missing LINKEDIN_ACCESS_TOKEN" },
    mastodonToken && instance
      ? { name: "Mastodon", text, kind: "available", destination: `${instance} (public)`, send: () => postMastodon({ instance, token: mastodonToken, text, transport }) }
      : { name: "Mastodon", text, kind: "unavailable", reason: !mastodonToken || !mastodonInstance
        ? "missing MASTODON_INSTANCE or MASTODON_TOKEN"
        : "MASTODON_INSTANCE must be an HTTPS origin" },
  ];
}

export async function runBroadcast(options: {
  args: string[];
  env: Environment;
  interactive: boolean;
  write: (text: string) => void;
  confirm: (prompt: string) => Promise<string>;
  transport?: Transport;
}): Promise<number> {
  const command = parseArgs(options.args);
  if (command.kind === "help") {
    options.write(help);
    return 0;
  }
  const posts = channels(command.text, options.env, options.transport ?? network);
  for (const post of posts) {
    const availability = post.kind === "available" ? `available: ${post.destination}` : `unavailable: ${post.reason}`;
    options.write(`\n${post.name} preview [${availability}]\n---\n${post.text}\n---`);
  }
  if (!command.post) {
    options.write("Preview only. Nothing sent.");
    return 0;
  }
  if (!options.interactive) {
    options.write("Refused --post: confirmation requires interactive standard input and output. Nothing sent.");
    return 1;
  }
  let failed = false;
  for (const post of posts) {
    if (post.kind === "unavailable") continue;
    const answer = await options.confirm(`Publish this ${post.name} post to ${post.destination}?\n---\n${post.text}\n---\nType yes to publish (default no): `);
    if (answer.trim().toLowerCase() !== "yes") {
      options.write(`${post.name}: skipped`);
      continue;
    }
    try {
      const url = await post.send();
      options.write(`${post.name}: posted ${url}`);
    } catch (error) {
      failed = true;
      const detail = error instanceof AdapterError ? ` (${error.message})` : "";
      options.write(`${post.name}: failed${detail}. Check the channel before retrying; the outcome may be unknown.`);
    }
  }
  return failed ? 1 : 0;
}
