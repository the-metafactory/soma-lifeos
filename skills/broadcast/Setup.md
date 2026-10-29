# Configure Broadcast

Set these variables in your terminal without putting tokens into a command argument or a file in this pack:

| Variable | Purpose |
| --- | --- |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn OAuth user token with `openid` and `w_member_social` access. The client resolves the member through `/v2/userinfo`. |
| `MASTODON_INSTANCE` | HTTPS instance origin, such as `https://mastodon.social`. Paths, credentials, queries, and fragments are rejected. |
| `MASTODON_TOKEN` | User token with `write:statuses` access on that instance. |

Missing credentials mark only that channel `unavailable`. Preview still prints its text. Credentials are checked locally for presence; expired tokens are discovered only on a confirmed send.

From the member directory, preview a post:

```sh
bun Tools/Broadcast.ts --text 'A short post with https://example.org'
```

Add `--post` to request publication. Standard input and output must both be terminals. Only `yes` (case-insensitive, with surrounding whitespace allowed) confirms a post. Empty input and every other answer skip it. There is no automatic approval flag. Leave the terminal on the principal's side; an agent must never type the confirmation for them.

LinkedIn retains upstream's REST Posts client, version `202601`, with its Markdown-to-Unicode formatter and little-text escaping. The preview shows the exact commentary sent to the API, including escape characters. Commentary is truncated at 3,000 code points, as upstream does. Mastodon receives the original text with public visibility through `POST /api/v1/statuses`. Instance-specific text limits are enforced by the server. Links remain in the text on both channels. No metadata is fetched during preview or posting.

The command returns a nonzero exit status for invalid arguments, a non-interactive post attempt, or a failed send. Unavailable and declined channels are reported separately. Sends run once per confirmation, without automatic retries. An error on one channel allows the other channel's independent confirmation and send.

## Port scope

Source: `danielmiessler/PAI`, `LifeOS/install/skills/Broadcast`, commit `fb9aef4640a73feae4c2e6483b26f58491ce2665`. The root `NOTICE.md` carries the MIT notice.

The LinkedIn text-post client and formatter are retained with typed JSON validation, bounded requests, and transport injection for tests. Soma's terminal confirmation replaces the upstream send gate.

Removed upstream features: X/Twitter, Bluesky, Instagram, their adapters and authentication tools; Omny publishing; article creation; link-preview cards; media upload and staging; edits and comments; credential-file loading and OAuth setup servers; platform-selection and multi-post commands; personal voice and content rules; skill configuration, intent logs, notifications, and subsystem send-gate integrations. These features are absent from this member. Only the two text-post channels ship.
