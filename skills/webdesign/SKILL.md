---
name: webdesign
description: "Design and refine web interfaces through Claude Design. USE WHEN webdesign, create a prototype, extract a design system, redesign a site, export code, integrate a design into an app, or deploy a design. For static graphics or video, use the optional art or media skill."
license: Complete terms in LICENSE.txt
effort: medium
---

## Optional Integrations

Check availability before using these integrations in any workflow:

- `media` is optional for video and motion graphics outside web UI work.
- `frontend-design` is an optional code-generation plugin. If unavailable, implement the handoff with the host's code tools.
- `art` is optional. If unavailable, return Mermaid diagram source or image prompts.

Report any fallback used in the result.

## What This Skill Is

webdesign is the PAI orchestration layer around **Claude Design** — Anthropic's web-based visual design product launched in April 2026 at `claude.ai/design`. Claude Design is not a CLI tool or plugin; it is a surface on claude.ai powered by Claude Opus 4.7 vision. This skill bridges the gap by:

1. **Driving Claude Design programmatically** through the interceptor skill (real-Chrome automation of the authenticated claude.ai session).
2. **Processing handoff bundles** that Claude Design produces, feeding them into local codebases.
3. **Generating production code** with the optional `frontend-design` plugin when available, or the host's code tools.
4. **Integrating designs INTO existing applications** — framework-aware diff/patch flow, not greenfield-only.
5. **Verifying and deploying** the result via interceptor + the project's chosen host.

Claude Design is the engine. webdesign is the cockpit.

## Integration-Aware Operation (CRITICAL)

This skill is frequently called as a **sub-step of larger site work** — writing a blog post, building an admin dashboard, shipping a marketing page. When invoked from a parent context, the skill:

- Accepts existing-project context as input: framework, token file, component directory, deployment target.
- Produces output as **diffs / patches against the existing app**, not isolated HTML files.
- Respects existing design tokens and component patterns — does NOT overwrite them unless the user requests a full redesign.
- Routes integration work through `Workflows/IntegrateIntoApp.md`.

When invoked standalone for a greenfield design, the skill produces a self-contained prototype and optionally scaffolds a new app.
## Workflow Routing

**When executing a workflow, output this notification:**

```
Running **WorkflowName** in **webdesign**...
```

| Workflow | Trigger | File |
|----------|---------|------|
| **CreatePrototype** | "design a prototype", "create prototype", "mockup", "build a design" | `Workflows/CreatePrototype.md` |
| **ExtractDesignSystem** | "extract design system", "pull tokens from", "extract brand" | `Workflows/ExtractDesignSystem.md` |
| **RefinePrototype** | "iterate on", "refine", "adjust spacing", "change color" | `Workflows/RefinePrototype.md` |
| **WebsiteToRedesign** | "redesign this site", "rebuild this URL", "modernize" | `Workflows/WebsiteToRedesign.md` |
| **ExportToCode** | "export to code", "ship to code", "send to Claude Code", "process handoff" | `Workflows/ExportToCode.md` |
| **IntegrateIntoApp** | "integrate this into", "patch into the app", "land in existing codebase" | `Workflows/IntegrateIntoApp.md` |
| **DeployDesign** | "deploy the design", "ship to production" | `Workflows/DeployDesign.md` |

## Prerequisites (PREFLIGHT)

Before running any workflow, confirm:

1. **interceptor skill available** — `which interceptor` returns a path. If not, instruct user to invoke `Skill("interceptor")` setup first.
2. **Authenticated claude.ai session** — interceptor must have a logged-in claude.ai profile. First-run is headed; subsequent runs are headless.
3. **Claude Design access** — User's Claude subscription must include Claude Design (Pro, Max, Team, or Enterprise with admin opt-in).
4. **For `IntegrateIntoApp`**: parent-project path + framework identifier (next, astro, vitepress, vite-react, vue, vanilla) passed in context.

Missing prerequisites → halt with a clear remediation step. Never silently fall back.

## Gotchas

Accumulate lessons here. Information density is highest in gotchas.

- **Claude Design is web-only.** There is no API, no MCP server, no plugin. interceptor is the only programmatic path.
- **Real Chrome required.** Use the interceptor skill — it is the only sanctioned browser automation in PAI. Claude Design's UI depends on claude.ai's full session state; CDP-based automation trips bot detection and drops session cookies.
- **Handoff bundles are directories, not single files.** A bundle contains `PROMPT.md`, optional `tokens.json`, `components/`, `assets/`, and framework-specific scaffolding. Treat the whole directory as the unit.
- **Check `frontend-design` availability.** When installed in Claude Code, the plugin picks up frontend work automatically. Otherwise implement the handoff with the host's code tools.
- **Claude Design's design-system extraction runs during onboarding.** For a new codebase you want Claude Design to understand, run `ExtractDesignSystem` FIRST before `CreatePrototype` — otherwise Claude Design uses generic defaults and overrides your tokens.
- **Integration ≠ overwrite.** `IntegrateIntoApp` produces diffs on top of existing code. If the user wants a full redesign that replaces existing UI, explicitly flag this and get confirmation.
- **Canva exports are editable.** If the user wants a non-developer (marketer, founder) to refine the design, route through `Workflows/ExportToCode.md` with `--format canva`.
- **No real-time collab.** Claude Design does not support multiplayer editing like Figma. Share via URL export for async review.
- **Enterprise gate.** Enterprise accounts need an admin to enable Claude Design in Organization settings before the palette icon appears in claude.ai.
- **Session quotas.** Claude Design burns Opus 4.7 tokens fast. Pro tier is insufficient for sustained pro-design work; Max recommended.
- **Output fidelity ≠ production-ready.** Claude Design produces polished visuals, but hand-off code often needs a verification + a11y pass. Run `Tools/VerifyDesign.ts` post-integration.
- **Vision doesn't guess.** If the prompt doesn't specify responsive breakpoints, contrast requirements, or dark-mode behavior, Claude Design picks defaults that may not match the target app. Be explicit in the brief.

## Examples

**Example 1: Create a prototype from a brief**
```
User: "Design a pricing page for an AI security startup — editorial aesthetic, dark only"
→ Invokes CreatePrototype workflow
→ Preflight: interceptor + authenticated claude.ai session
→ Composes brief with explicit aesthetic, constraints, differentiation
→ Drives claude.ai/design via Tools/DriveClaudeDesign.ts
→ Screenshots output, verifies a11y via Tools/VerifyDesign.ts
→ Returns bundle path + preview URL
```

**Example 2: Land a Claude Design prototype inside an existing Astro app**
```
User: "Integrate this prototype into ~/Projects/landing — it's an Astro site"
→ Invokes IntegrateIntoApp workflow
→ Audits target project (framework, tokens, components)
→ Runs ExtractDesignSystem first to prime Claude Design with app's real tokens
→ Translates prototype to Astro conventions via frontend-design plugin
→ Produces unified diff against the working tree
→ Pauses for human review before applying
→ Applies patch on a branch, runs tests, screenshots in-context
```

**Example 3: Redesign an existing live site**
```
User: "Redesign example.com — modernize, keep the copy, make it brutalist"
→ Invokes WebsiteToRedesign workflow
→ Captures current state (screenshot + HTML + tokens)
→ Writes critique (what works, what's dated, what to preserve)
→ Composes rebuild brief with explicit aesthetic and preserve list
→ Drives Claude Design with critique + original screenshot as input
→ Iterates via RefinePrototype until satisfied
→ Hands off to IntegrateIntoApp or ExportToCode
```

## File Organization

```
skills/webdesign/
├── SKILL.md                          # This file — routing + gotchas
├── README.md                         # Public-facing intro
├── Workflows/
│   ├── CreatePrototype.md
│   ├── ExtractDesignSystem.md
│   ├── RefinePrototype.md
│   ├── WebsiteToRedesign.md
│   ├── ExportToCode.md
│   ├── IntegrateIntoApp.md
│   └── DeployDesign.md
├── Tools/
│   ├── DriveClaudeDesign.ts          # interceptor wrapper for claude.ai/design
│   ├── ProcessHandoffBundle.ts       # Parse bundle → structured brief
│   └── VerifyDesign.ts               # Screenshot + a11y probe
└── References/
    ├── ClaudeDesignCapabilities.md   # What Claude Design does / doesn't do
    ├── InputFormats.md               # Prompt patterns, codebase prep
    ├── ExportFormats.md              # html / pdf / pptx / canva / url / bundle
    └── HandoffBundleSpec.md          # Bundle structure for Claude Code handoff
```

## Execution Log

After each workflow, build a record with the actual UTC timestamp, workflow name, brief input summary, status (`ok` or `error`), and elapsed seconds:

```json
{"ts":"ISO8601","skill":"webdesign","workflow":"WORKFLOW_USED","input":"brief summary","status":"ok","duration_s":0}
```

Serialize the record with `JSON.stringify(record) + "\n"`. Prefer the host's append-capable file-write tool to append it to `memory/SKILLS/webdesign/execution.jsonl` under the Soma home, creating the parent directory if needed. If only replacement writes are available, write this single record to a new `execution-<UTC timestamp>-<unique suffix>.jsonl` in the same directory without replacing any existing file. Use a filename-safe UTC timestamp and a fresh random suffix. Keep all user-derived values in the JSON data, outside shell commands. Logging is complete when the written line parses as one JSON object and prior files and entries are preserved.
