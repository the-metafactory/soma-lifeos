---
name: aperture-oscillation
description: "3-pass scope oscillation — narrow/tactical, wide/strategic, then synthesis — to surface design tensions invisible at any single zoom level. Produces design tensions, scope recommendations, coherence assessments. USE WHEN aperture oscillation, oscillate scope, tactical vs strategic, scope framing, design tension, architecture decision, feature fits system, coherence check, wrong scope, design review."
effort: medium
---
# aperture-oscillation

**3-pass scope oscillation that varies the zoom level of how a question is framed — narrow tactical, wide strategic, then synthesis — to surface design tensions invisible at any single scope.**

Grounded in the observation that LLMs (and humans) produce fundamentally different outputs depending on the scope of the framing context. A component designed in isolation has its own logic. The same component designed within a stated system vision inherits different constraints. The delta between these two framings is where the real insight lives.

## Core Concept

Instead of rotating analytical lenses (iterative-depth) or generating divergent ideas (be-creative), aperture-oscillation holds the question constant but shifts the **scope envelope** around it across 3 structured passes:

1. **Narrow Aperture (Tactical-first):** The specific thing is primary. Big-picture context is background. This captures what the component naturally wants to be — its own internal logic and shape.

2. **Wide Aperture (Strategic-first):** The vision/system goal is primary. The specific thing is derived from it. This captures what the system needs the component to be — coherence, alignment, constraints you'd miss thinking locally.

3. **Oscillation (Synthesis):** Feed both outputs. Ask where the tactical and strategic views diverge. The tensions, gaps, and surprises between the two framings are the output — the things neither pass alone would surface.

## How It Differs from iterative-depth

| Dimension | iterative-depth | aperture-oscillation |
|-----------|---------------|---------------------|
| **What varies** | Analytical lens (failure, stakeholder, temporal...) | Scope/zoom level (narrow, wide, synthesized) |
| **Pass count** | 2-8 | 3 (fixed) |
| **Input** | Single problem statement | Two inputs: tactical target + strategic context |
| **Output** | Richer requirements from multiple angles | Design tensions between local and system-level views |
| **Best for** | Requirement discovery, blind spot elimination | Architecture decisions, feature design, system coherence |
| **When to combine** | Use iterative-depth first (understand the problem), then aperture-oscillation (understand where the solution fits) |

## Use / Win

**When to use:** Any time you're building something specific within a larger system and need to ensure the local design serves the global vision — without losing the component's own logic.

Concrete triggers:
- **Architecture decisions** — "Should this be a service, a library, or inline?" depends entirely on whether you're zoomed into the component or zoomed out to the system.
- **Feature design** — The feature a user asks for vs. the feature the product needs are often subtly different. Oscillation surfaces the gap.
- **System coherence checks** — When adding to existing infrastructure, the new piece must serve both its own purpose and the system's. Single-scope framing misses one or the other.
- **Design reviews** — Before committing to an approach, oscillate scope to check that the tactical plan and the strategic vision agree.
- **Scope negotiation** — When the user says "build X" and X could be simple or complex depending on context, oscillation reveals which scope is appropriate.

**What you win:**
- **Design tensions surfaced before they become mid-build surprises.** The most expensive rework comes from a component that works perfectly on its own but doesn't serve the system.
- **Scope clarity.** Seeing the same question at narrow and wide aperture often reveals that the obvious scope is wrong.
- **Coherence confidence.** When tactical and strategic views align, you can build with conviction. When they diverge, you know exactly where to make tradeoffs.

## Workflow Routing

| Trigger | Workflow |
|---------|----------|
| "aperture oscillation", "oscillate scope", "zoom in/out", "tactical vs strategic" | `Workflows/Oscillate.md` |
| Algorithm OBSERVE/THINK selects aperture-oscillation capability | `Workflows/Oscillate.md` |

## Quick Reference

- **3 passes** — always 3 (narrow, wide, synthesis)
- **2 inputs** — tactical target (what you're building) + strategic context (why, the bigger picture)
- **Output** — design tensions, scope recommendations, coherence assessment
- **Integration point** — OBSERVE (before ISC) or THINK (before approach commitment)

## Gotchas

- **Requires two distinct inputs.** If the tactical target and strategic context are the same thing, aperture-oscillation adds no value — use iterative-depth instead.
- **3 passes is the right number.** Unlike iterative-depth (2-8), the narrow/wide/synthesis structure is complete at 3. Adding passes would just be lens rotation, which is iterative-depth's job.
- **The synthesis pass is where the value lives.** Passes 1 and 2 are setup. If the synthesis finds no divergence, that's a valid (and valuable) finding — it means the tactical and strategic views are already aligned.
- **This is a BPE-fragile skill.** Monitor whether smarter models naturally oscillate scope without being prompted. Quarterly test recommended.

## Examples

**Example 1: Feature design within a system**
```
Tactical target: "Build a caching layer for session data"
Strategic context: "PAI is a Life OS that needs responsive, session-spanning AI assistance"

Pass 1 (Narrow): Redis with TTL, standard session cache patterns
Pass 2 (Wide): Cache must survive session boundaries, integrate with memory system, serve the Life OS vision
Pass 3 (Synthesis): Tension — standard session cache expires data that the Life OS needs to persist. Resolution: hybrid cache with session-scoped fast layer + memory-backed persistent layer.
```

**Example 2: Architecture decision**
```
Tactical target: "Add webhook support to the Feed system"
Strategic context: "Feed is one pipeline in Arbol, which processes content for Surface"

Pass 1 (Narrow): Standard webhook receiver, queue, retry logic
Pass 2 (Wide): Webhooks must flow through Arbol's action/function pattern, integrate with existing queue infrastructure
Pass 3 (Synthesis): Tension — standalone webhook service vs. Arbol action. Resolution: implement as Arbol action, not standalone service, because the strategic context demands pipeline coherence over component independence.
```

## Execution Log

After each workflow, build a record with the actual UTC timestamp, workflow name, brief input summary, status (`ok` or `error`), and elapsed seconds:

```json
{"ts":"ISO8601","skill":"aperture-oscillation","workflow":"WORKFLOW_USED","input":"brief summary","status":"ok","duration_s":0}
```

Serialize the record with `JSON.stringify(record) + "\n"`. Prefer the host's append-capable file-write tool to append it to `memory/SKILLS/aperture-oscillation/execution.jsonl` under the Soma home, creating the parent directory if needed. If only replacement writes are available, write this single record to a new `execution-<UTC timestamp>-<unique suffix>.jsonl` in the same directory without replacing any existing file. Use a filename-safe UTC timestamp and a fresh random suffix. Keep all user-derived values in the JSON data, outside shell commands. Logging is complete when the written line parses as one JSON object and prior files and entries are preserved.
