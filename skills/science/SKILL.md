---
name: science
description: "Scientific method as problem-solving algorithm. Seven workflows: DefineGoal, GenerateHypotheses (min 3), DesignExperiment, MeasureResults, AnalyzeResults, Iterate, FullCycle. Plus QuickDiagnosis and StructuredInvestigation shortcuts. USE WHEN experiment, iterate, improve, optimize, hypothesis, science, quick diagnosis, structured investigation, what might work, how do we test, analyze results."
effort: high
---
# Science - The Universal Algorithm

**The scientific method applied to everything. The meta-skill that governs all other skills.**

## Optional Integrations

Check availability before using these integrations in any workflow:

- `development` is optional. If unavailable, use the host's code tools and Git worktrees for isolated experiments.
- `research` is optional. If unavailable, gather and cite sources with the host's web tools.
- `evals` is optional. If unavailable, compare variants against precommitted criteria and record the measurements.

Report any fallback used in the result.

## The Universal Cycle

```
GOAL -----> What does success look like?
   |
OBSERVE --> What is the current state?
   |
HYPOTHESIZE -> What might work? (Generate MULTIPLE)
   |
EXPERIMENT -> Design and run the test
   |
MEASURE --> What happened? (Data collection)
   |
ANALYZE --> How does it compare to the goal?
   |
ITERATE --> Adjust hypothesis and repeat
   |
   +------> Back to HYPOTHESIZE
```

**The goal is CRITICAL.** Without clear success criteria, you cannot judge results.

---

## Workflow Routing

**Output when executing:** `Running the **WorkflowName** workflow in the **science** skill to ACTION...`

### Core Workflows

| Trigger | Workflow |
|---------|----------|
| "define the goal", "what are we trying to achieve" | `Workflows/DefineGoal.md` |
| "what might work", "ideas", "hypotheses" | `Workflows/GenerateHypotheses.md` |
| "how do we test", "experiment design" | `Workflows/DesignExperiment.md` |
| "what happened", "measure", "results" | `Workflows/MeasureResults.md` |
| "analyze", "compare to goal" | `Workflows/AnalyzeResults.md` |
| "iterate", "try again", "next cycle" | `Workflows/Iterate.md` |
| Full structured cycle | `Workflows/FullCycle.md` |

### Diagnostic Workflows

| Trigger | Workflow |
|---------|----------|
| Quick debugging (15-min rule) | `Workflows/QuickDiagnosis.md` |
| Complex investigation | `Workflows/StructuredInvestigation.md` |

---

## Resource Index

| Resource | Description |
|----------|-------------|
| `METHODOLOGY.md` | Deep dive into each phase |
| `Protocol.md` | How skills implement Science |
| `Templates.md` | Goal, Hypothesis, Experiment, Results templates |
| `Examples.md` | Worked examples across scales |

---

## Domain Applications

| Domain | Manifestation | Related Skill |
|--------|---------------|---------------|
| **Coding** | TDD (Red-Green-Refactor) | development |
| **Products** | MVP -> Measure -> Iterate | development |
| **Research** | Question -> Study -> Analyze | research (optional) |
| **Prompts** | Prompt -> Eval -> Iterate | evals (optional) |
| **Decisions** | Options -> council -> Choose | council |

---

## Scale of Application

| Level | Cycle Time | Example |
|-------|-----------|---------|
| **Micro** | Minutes | TDD: test, code, refactor |
| **Meso** | Hours-Days | Feature: spec, implement, validate |
| **Macro** | Weeks-Months | Product: MVP, launch, measure PMF |

---

## Integration Points

| Phase | Skills to Invoke |
|-------|-----------------|
| **Goal** | council for validation |
| **Observe** | Research for context |
| **Hypothesize** | council for ideas, red-team for stress-test |
| **Experiment** | Development (Worktrees) for parallel tests |
| **Measure** | evals for structured measurement |
| **Analyze** | council for multi-perspective analysis |

---

## Key Principles (Quick Reference)

1. **Goal-First** - Define success before starting
2. **Hypothesis Plurality** - NEVER just one idea (minimum 3)
3. **Minimum Viable Experiments** - Smallest test that teaches
4. **Falsifiability** - Experiments must be able to fail
5. **Measure What Matters** - Only goal-relevant data
6. **Honest Analysis** - Compare to goal, not expectations
7. **Rapid Iteration** - Cycle speed > perfect experiments

---

## Anti-Patterns

| Bad | Good |
|-----|------|
| "Make it better" | "Reduce load time from 3s to 1s" |
| "I think X will work" | "Here are 3 approaches: X, Y, Z" |
| "Prove I'm right" | "Design test that could disprove" |
| "Pretend failure didn't happen" | "What did we learn?" |
| "Keep experimenting forever" | "Ship and learn from production" |

---

## Quick Start

1. **Goal** - What does success look like?
2. **Observe** - What do we know?
3. **Hypothesize** - At least 3 ideas
4. **Experiment** - Minimum viable tests
5. **Measure** - Collect goal-relevant data
6. **Analyze** - Compare to success criteria
7. **Iterate** - Adjust and repeat

**The answer emerges from the cycle, not from guessing.**

## Gotchas

- **Hypothesis-test-analyze is the core loop.** Don't skip the hypothesis step — going straight to testing is just trial-and-error, not science.
- **Minimum 3 hypotheses before testing.** Single-hypothesis testing is confirmation bias.
- **Measurements must be specific and reproducible.** "It seems better" is not a measurement.
- **Full cycle is for systematic investigation.** For quick debugging, use quick diagnosis mode.

## Examples

**Example 1: Quick diagnosis**
```
User: "figure out why Surface time filters show stale items"
→ Quick diagnosis mode
→ Hypothesis: timestamp format mismatch in D1
→ Test: query D1 for actual stored format
→ Analyze: compare stored vs expected format
→ Result: ISO string vs Unix timestamp mismatch
```

**Example 2: Full systematic investigation**
```
User: "experiment with different prompt structures for better output"
→ Full cycle mode
→ 3+ hypotheses generated
→ Controlled experiments with measurements
→ Analysis identifies winning approach
→ Iterates until convergence
```

## Execution Log

After each workflow, build a record with the actual UTC timestamp, workflow name, brief input summary, status (`ok` or `error`), and elapsed seconds:

```json
{"ts":"ISO8601","skill":"science","workflow":"WORKFLOW_USED","input":"brief summary","status":"ok","duration_s":0}
```

Serialize the record with `JSON.stringify(record) + "\n"`. Prefer the host's append-capable file-write tool to append it to `memory/SKILLS/science/execution.jsonl` under the Soma home, creating the parent directory if needed. If only replacement writes are available, write this single record to a new `execution-<UTC timestamp>-<unique suffix>.jsonl` in the same directory without replacing any existing file. Use a filename-safe UTC timestamp and a fresh random suffix. Keep all user-derived values in the JSON data, outside shell commands. Logging is complete when the written line parses as one JSON object and prior files and entries are preserved.
