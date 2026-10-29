import type { Transport } from "../broadcast";

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
  if (!response.ok) throw new Error(`Mastodon post failed (HTTP ${response.status})`);
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null || !("id" in data)
    || typeof data.id !== "string" || !/^\d+$/.test(data.id)) {
    throw new Error("Mastodon accepted the post but returned no valid id; check before retrying");
  }
  return `${options.instance}/api/v1/statuses/${data.id}`;
}
