import type { Transport } from "../transport";
import { AdapterError } from "./adapter-error";

export async function postMastodon(options: {
  instance: string;
  token: string;
  text: string;
  transport: Transport;
}): Promise<string> {
  const response = await options.transport(`${options.instance}/api/v1/statuses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.token}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: new URLSearchParams({ status: options.text, visibility: "public" }),
  });
  if (!response.ok) throw new AdapterError(`Mastodon post failed (HTTP ${response.status})`);
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null || !("id" in data)
    || typeof data.id !== "string" || !/^\d+$/.test(data.id)) {
    throw new AdapterError("Mastodon accepted the post but returned no valid id");
  }
  if ("url" in data && typeof data.url === "string" && data.url.startsWith(`${options.instance}/`)
    && !/[\u0000-\u0020\u007f-\u009f]/u.test(data.url)) {
    try {
      const url = new URL(data.url);
      if (url.origin === options.instance && !url.username && !url.password) return data.url;
    } catch {}
  }
  return `${options.instance}/api/v1/statuses/${data.id}`;
}
