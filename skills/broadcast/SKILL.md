---
name: broadcast
description: "Preview or publish one piece of content to LinkedIn and Mastodon. Use when asked to cross-post to those channels."
---

# Broadcast

1. Prepare the principal's text. From this member's directory, run:

   ```sh
   bun Tools/Broadcast.ts --text 'A short post.'
   ```

2. Show both channel previews and their availability. Preview makes no network requests, including credential checks.
3. When the principal wants to publish, have them run the same command with `--post` in their terminal. They confirm each available channel by typing `yes` after seeing that post. Each confirmation applies only to that channel and text. A declined post is skipped. A non-interactive `--post` run refuses.
4. Report each channel's result. If a send fails, check that channel before retrying: a lost response can mean the post was published.

Read [Setup.md](Setup.md) for credentials, text behavior, and the port's removed features. Run `bun Tools/Broadcast.ts --help` for command syntax. Credentials come only from environment variables. This skill writes no local state.
