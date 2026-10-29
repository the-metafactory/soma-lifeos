import { assertLittleText, escapeLittleText, formatForLinkedIn, truncateCodePoints } from "../format/linkedin-formatter";
import type { Transport } from "../broadcast";

const LINKEDIN_VERSION = "202601";

export class LinkedInAdapter {
  readonly maxLength = 3000;

  constructor(private readonly accessToken: string, private readonly transport: Transport) {}

  commentaryText(content: string): string {
    const text = truncateCodePoints(escapeLittleText(formatForLinkedIn(content)), this.maxLength);
    assertLittleText(text);
    return text;
  }

  async post(commentary: string): Promise<string> {
    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };
    const identity = await this.transport("https://api.linkedin.com/v2/userinfo", { headers });
    if (!identity.ok) throw new Error(`LinkedIn user info failed (HTTP ${identity.status})`);
    const data: unknown = await identity.json();
    if (typeof data !== "object" || data === null || !("sub" in data)
      || typeof data.sub !== "string" || !/^[A-Za-z0-9_-]+$/.test(data.sub)) {
      throw new Error("LinkedIn user info is missing a valid member id");
    }

    const postData = {
      author: `urn:li:person:${data.sub}`,
      commentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };
    const response = await this.transport("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        ...headers,
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postData),
    });
    if (!response.ok) throw new Error(`LinkedIn post failed (HTTP ${response.status})`);
    const postId = response.headers.get("x-restli-id");
    if (!postId) throw new Error("LinkedIn accepted the post but returned no post id; check before retrying");
    return `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}`;
  }
}
