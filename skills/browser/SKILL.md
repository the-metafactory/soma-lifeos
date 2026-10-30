---
name: browser
description: "Headless browser automation via agent-browser: Rust CLI daemon with persistent per-site auth profiles for fast, scriptable, parallel browser work. Workflows: ReviewStories, Automate, Update. USE WHEN headless browser work, batch screenshots/scraping, dev server tests, parallel sessions, data extraction, story review, or recipe automation. NOT FOR deploy verification or real-Chrome UI confirmation (use interceptor), simple single-URL fetches (use WebFetch), or CAPTCHA/bot-bypass (use bright-data or interceptor)."
version: 10.0.0
effort: medium
---
# Browser v10.0.0 — Browser Automation

**Tool:** `agent-browser` — headless Rust CLI daemon with persistent auth profiles.

**If agent-browser isn't working or a site has bot detection, use the interceptor skill instead.** interceptor is a Chrome extension with zero CDP fingerprint — passes all major bot detection checks.

### Does the site need auth?

Use `--profile ~/.agent-browser/profiles/<site>`. If profile exists, auth is automatic. If not, run `--headed` once for login, then headless forever.

---

## agent-browser

Native Rust daemon. Persistent profiles for auth. Headless by default.

### Quick One-Shot Commands

```bash
agent-browser open https://example.com && agent-browser screenshot /tmp/shot.png
agent-browser open https://example.com && agent-browser screenshot --full /tmp/full.png
agent-browser open https://example.com && agent-browser pdf /tmp/page.pdf
```

### Session-Based Interaction

```bash
# 1. OPEN
agent-browser open https://example.com

# 2. WORK
agent-browser snapshot                    # a11y tree with @eN refs (for AI)
agent-browser click @e12                  # click by ref
agent-browser fill @e15 "hello"           # fill input by ref
agent-browser screenshot /tmp/shot.png    # screenshot
agent-browser eval "document.title"       # run JS

# 3. CLOSE — when done
agent-browser close
```

### Authenticated Browsing (Per-Site Profiles)

**First-time setup (headed, one-time):**
```bash
# Close any running daemon first
agent-browser close --all

# Launch headed with persistent profile — log in manually
agent-browser --headed --profile ~/.agent-browser/profiles/<site> open https://example.com

# After login completes, all future runs reuse the profile headlessly
```

**Subsequent runs (headless, automatic):**
```bash
agent-browser --profile ~/.agent-browser/profiles/<site> open https://example.com
# Auth is automatic — cookies, IndexedDB, cache all persist
```

**To add a new site:** Close daemon, run `--headed --profile ~/.agent-browser/profiles/<name>` once, log in, done.

### Auth Vault (Alternative)

```bash
agent-browser auth save mysite --url https://example.com --username user --password-stdin
agent-browser auth login mysite    # auto-fills login form
agent-browser auth list            # show saved profiles
```

### Batch Execution

```bash
# Send multiple commands in one shot (fewer tool calls = fewer tokens)
echo '[["open","https://example.com"],["snapshot"],["click","@e12"]]' | agent-browser batch
```

### Advanced Features

```bash
# Connect to already-running Chrome
agent-browser --auto-connect snapshot

# Network interception
agent-browser route "**/*.{png,jpg}" abort     # block images
agent-browser route "https://api.com/*" mock '{"data":"test"}'

# Device emulation
agent-browser --device "iPhone 15" open https://example.com

# Session persistence (cookies + localStorage by name)
agent-browser --session-name myapp open https://example.com
```

### agent-browser Rules

- **Daemon model** — first command starts daemon, subsequent commands connect instantly.
- **Refs use @eN syntax** — `@e12` not `e12`.
- **Profiles persist everything** — cookies, IndexedDB, cache, localStorage.
- **Close with `agent-browser close`** or `close --all` to kill daemon.

---

### Delegating Browser Work to Agents

When you need parallel or background browser work (scraping multiple pages, monitoring), spawn **general-purpose agents** with browser instructions. No dedicated browser agent type needed — this skill IS the expertise.

```
Agent(subagent_type="general-purpose", prompt="
  Use agent-browser CLI for all browser work.
  Commands: open <url>, snapshot, click @eN, fill @eN 'text', screenshot /path.
  For authenticated sites: --profile ~/.agent-browser/profiles/<site>
  Refs use @eN syntax from snapshots.
  [your specific task instructions here]
")
```

For parallel isolation, each agent uses `--session <name>`:
```
Agent 1: agent-browser --session scrape1 open https://site-a.com
Agent 2: agent-browser --session scrape2 open https://site-b.com
```

**Fallback:** If agent-browser fails or the site has bot detection, use the **interceptor** skill instead.

**Legacy built-in agents — DEPRECATED, do not invoke.** BrowserAgent and UIReviewer are Claude Code built-ins whose internals cannot be modified; they run browser automation that PAI no longer uses. Route all browser work through the **interceptor** skill (verification, authenticated flows) or **agent-browser** (headless scraping).

---

## Workflow Routing

| Trigger Words | Workflow | What It Does |
|--------------|----------|-------------|
| "review stories", "run stories", "ui review", "validate stories" | `Workflows/ReviewStories.md` | Fan out YAML stories to parallel UIReviewers |
| "automate", "recipe", "template", or a recipe name | `Workflows/Automate.md` | Load and execute a parameterized recipe template |
| "update", "check version" | `Workflows/Update.md` | Verify browser tools are current and working |

---

## Stories — YAML User Story Validation

Define user stories in YAML and validate them in parallel with UIReviewer agents.

**Directory:** `skills/browser/Stories/`

```yaml
name: App Name
url: https://example.com
stories:
  - name: Story name
    steps:
      - action: click
        target: "LLM-readable description"
    assertions:
      - type: snapshot_contains
        text: "expected text"
```

Run with: `"review stories"` or `"run stories in HackerNews.yaml"`

---

## Recipes — Parameterized Templates

Reusable Markdown templates with `{PROMPT}` injection.

**Directory:** `skills/browser/Recipes/`

| Recipe | Description | Tool |
|--------|-------------|------|
| `SummarizePage.md` | Extract content summary | BrowserAgent |
| `ScreenshotCompare.md` | Before/after comparison | agent-browser |
| `FormFill.md` | Fill form fields | agent-browser |

Run with: `"automate SummarizePage for https://example.com"`

---

## Execution Log

After each workflow, build a record with the actual UTC timestamp, workflow name, brief input summary, status (`ok` or `error`), and elapsed seconds:

```json
{"ts":"ISO8601","skill":"browser","workflow":"WORKFLOW_USED","input":"brief summary","status":"ok","duration_s":0}
```

Serialize the record with `JSON.stringify(record) + "\n"`. Prefer the host's append-capable file-write tool to append it to `memory/SKILLS/browser/execution.jsonl` under the Soma home, creating the parent directory if needed. If only replacement writes are available, write this single record to a new `execution-<UTC timestamp>-<unique suffix>.jsonl` in the same directory without replacing any existing file. Use a filename-safe UTC timestamp and a fresh random suffix. Keep all user-derived values in the JSON data, outside shell commands. Logging is complete when the written line parses as one JSON object and prior files and entries are preserved.
