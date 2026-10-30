---
name: world-threat-model
description: "Stress-test an idea or strategy against future time horizons (TestIdea), refresh world models (UpdateModels), or inspect their current state (ViewModels). USE WHEN world threat model, temporal threat modeling, long-term risk analysis, update world models, or view world models."
effort: high
---

# World Threat Model Harness

A system of 11 persistent world models spanning 6 months to 50 years. Each model is a deep (~10 page)
analysis of geopolitics, technology, economics, society, environment, security, and wildcards for that
time horizon. Ideas, strategies, and investments are tested against ALL horizons simultaneously using
adversarial analysis (red-team, first-principles, council).

## Optional Integrations

Check availability before using these integrations in any workflow:

- `research` is optional. If unavailable, gather and cite sources with the host's web tools.

Report any fallback used in the result.

## Workflow Routing

| Trigger | Workflow | Description |
|---------|----------|-------------|
| "test idea", "test strategy", "test investment", "how will this hold up", "stress test", "test against future" | `Workflows/TestIdea.md` | Test any input against all 11 world models |
| "update world model", "update models", "refresh models", "new analysis" | `Workflows/UpdateModels.md` | Refresh world model content with new research/analysis |
| "view world model", "show models", "current models", "model status" | `Workflows/ViewModels.md` | Read and summarize current world model state |

## Tier System

All workflows support three execution tiers:

| Tier | Target Time | Strategy | When to Use |
|------|-------------|----------|-------------|
| **Fast** | ~2 min | Single agent synthesizes across all models | Quick gut-check, casual exploration |
| **Standard** | ~10 min | 11 parallel agents + red-team + first-principles | Most use cases, good depth/speed balance |
| **Deep** | Up to 1 hr | 11 parallel agents + per-horizon research + red-team + council + first-principles | High-stakes decisions, major investments |

**Default tier:** Standard. User specifies with "fast", "deep", or tier defaults to Standard.

## World Model Storage

Resolve all `memory/SKILLS/world-threat-model/` paths relative to the Soma home.

Models are stored at: `memory/SKILLS/world-threat-model/WorldModels/`

### Horizon Models (base views)

| File | Horizon |
|------|---------|
| `INDEX.md` | Summary of all models with last-updated dates |
| `6-month.md` | 6-month outlook |
| `1-year.md` | 1-year outlook |
| `2-year.md` | 2-year outlook |
| `3-year.md` | 3-year outlook |
| `5-year.md` | 5-year outlook |
| `7-year.md` | 7-year outlook |
| `10-year.md` | 10-year outlook |
| `15-year.md` | 15-year outlook |
| `20-year.md` | 20-year outlook |
| `30-year.md` | 30-year outlook |
| `50-year.md` | 50-year outlook |

### Scenario Models (alternative futures)

Stored at: `memory/SKILLS/world-threat-model/WorldModels/Scenarios/`

| File | Scenario |
|------|----------|
| `great-correction-2027.md` | Severe US crash (2027 ± 12mo) — AI capex burst + housing + credit cascade |

## Context Files

| File | Purpose |
|------|---------|
| `ModelTemplate.md` | Template structure for world model documents |
| `OutputFormat.md` | Template for TestIdea results output |

## Skill Integrations

This skill orchestrates multiple PAI capabilities:

- **red-team** — Adversarial stress testing of ideas against each horizon
- **first-principles** — Decompose idea assumptions into hard/soft/assumption constraints
- **council** — Multi-perspective debate on idea viability across horizons
- **research** (optional) — Deep research for model creation and updates

## Gotchas

- **11 time horizons (6mo-50yr).** Don't over-index on short-term predictions — the value is in long-term structural analysis.
- **Threat models are hypothetical.** Present as scenarios with probability ranges, not predictions.
- **Update models when major world events occur.** Static threat models decay in accuracy.

## Examples

**Example 1: Test an investment thesis**
```
User: "threat model my bet on AI-first content creation"
→ Analyzes across 11 time horizons (6mo to 50yr)
→ Identifies structural risks at each horizon
→ Returns probability-weighted scenario matrix
```

**Example 2: Stress test a strategy**
```
User: "what could go wrong with our newsletter business model?"
→ Maps threat vectors: market, technology, regulatory, competitive
→ Returns prioritized risk register with mitigations
```

## Execution Log

After each workflow, build a record with the actual UTC timestamp, workflow name, brief input summary, status (`ok` or `error`), and elapsed seconds:

```json
{"ts":"ISO8601","skill":"world-threat-model","workflow":"WORKFLOW_USED","input":"brief summary","status":"ok","duration_s":0}
```

Serialize the record with `JSON.stringify(record) + "\n"`. Prefer the host's append-capable file-write tool to append it to `memory/SKILLS/world-threat-model/execution.jsonl` under the Soma home, creating the parent directory if needed. If only replacement writes are available, write this single record to a new `execution-<UTC timestamp>-<unique suffix>.jsonl` in the same directory without replacing any existing file. Use a filename-safe UTC timestamp and a fresh random suffix. Keep all user-derived values in the JSON data, outside shell commands. Logging is complete when the written line parses as one JSON object and prior files and entries are preserved.
