# The Science Protocol

**Skills don't call Science. They implement it.**

This document defines the Science Protocol - the interface that skills embody when they apply systematic, evidence-based iteration to their domain.

---

## The Core Insight

Science is not a service that other skills invoke. It's a **protocol they implement**.

Like how TCP/IP defines communication patterns without caring what's being communicated, Science defines the iteration pattern without caring what domain it's applied to.

**The Distinction:**

| Model | Description | Coupling |
|-------|-------------|----------|
| **Service (Wrong)** | Development calls Science.analyze() | High - Science must know all skills |
| **Protocol (Right)** | Development implements ScienceProtocol | Low - Skills are independently compliant |

---

## The Protocol Interface

Any Science-compliant workflow exhibits these behaviors:

```typescript
interface ScienceProtocol {
  // Phase 0: What are we trying to achieve?
  goal: {
    successCriteria: string[];      // How will we know we succeeded?
    measurableIndicators: Metric[]; // What numbers define success?
    constraints: string[];          // What are our limits?
    antiGoals?: string[];           // What are we NOT trying to do?
  };

  // Phase 1: What is the current state?
  observe(): Observation;

  // Phase 2: What might work? (MUST be plural)
  hypothesize(): Hypothesis[];  // Minimum 3

  // Phase 3-4: Design and run tests
  experiment(hypothesis: Hypothesis): ExperimentResult;

  // Phase 5-6: What happened? How does it compare?
  measure(result: ExperimentResult): Measurement;
  analyze(measurement: Measurement, goal: Goal): Analysis;

  // Phase 7: What's next?
  iterate(analysis: Analysis): NextAction;
}
```

---

## How Skills Implement Science

Skills don't import Science. They declare compliance through structure and behavior.

### Development (TDD)

```yaml
skill: development
implements: Science
mapping:
  goal: Test assertion defines expected behavior
  observe: Read existing code, understand context
  hypothesize: Generate implementation approaches
  experiment: Write code following TDD Red-Green-Refactor
  measure: Run tests, check coverage
  analyze: All green? Meets spec?
  iterate: Refactor, or move to next feature
```

**The Cycle:**
```
Write Test (GOAL) → Run Test (OBSERVE - it fails) →
Think of Fix (HYPOTHESIZE) → Write Code (EXPERIMENT) →
Run Test (MEASURE) → Pass/Fail? (ANALYZE) →
Refactor or Continue (ITERATE)
```

### evals (Prompt Optimization)

**The optional evals skill implements the Science Protocol for prompts.**

When installed, use evals for prompt experiments. Otherwise follow the comparison design in [DesignExperiment.md](Workflows/DesignExperiment.md#prompt-experiments) with the host's tools: precommit criteria, compare baseline and variants on the same samples, and record measurements and uncertainty.

```yaml
skill: evals
implements: Science
mapping:
  goal: Eval criteria (threshold, metrics) - pre-committed before running
  observe: Baseline prompt performance measurement
  hypothesize: Prompt variations with FALSIFIABLE claims
  experiment: Run eval suite with position swapping, multi-judge panels
  measure: Scores, SEM, confidence intervals
  analyze: Compare to pre-committed threshold, statistical significance
  iterate: Refine prompt, try next hypothesis, or declare success
```

**The Cycle:**
```
Define Use Case (GOAL) → Run Baseline (OBSERVE) →
Generate Variants (HYPOTHESIZE) → Compare Prompts (EXPERIMENT) →
Collect Scores (MEASURE) → Statistical Analysis (ANALYZE) →
Pick Winner or Refine (ITERATE)
```

**evals adds domain-specific rigor:**
- **Position swapping** - mitigates LLM positional bias
- **Multi-judge panels** - reduces model quirks (7x cheaper than single large judge)
- **Reasoning-first scoring** - 13%+ accuracy improvement
- **Paradigm check** - when to question the entire eval framework

### Research (Investigation)

```yaml
skill: research
implements: Science
mapping:
  goal: Research question to answer
  observe: Literature review, existing knowledge
  hypothesize: Possible answers to investigate
  experiment: Deep investigation of each hypothesis
  measure: Evidence gathering, source quality
  analyze: Synthesize findings
  iterate: Deeper questions emerge
```

### council (Debate)

```yaml
skill: council
implements: Science
mapping:
  goal: Decision to make
  observe: Initial positions from each perspective
  hypothesize: Multiple viewpoints as competing hypotheses
  experiment: Structured debate rounds
  measure: Arguments, counterarguments
  analyze: Synthesis, convergence points
  iterate: Refined positions until consensus
```

### Worktree (Parallel Experiments)

```yaml
skill: development/Worktree
implements: Science
mapping:
  goal: Find best implementation approach
  observe: Base branch state
  hypothesize: Named variant approaches
  experiment: Parallel development in worktrees
  measure: Code quality, test results, performance
  analyze: Compare implementations
  iterate: Pick winner, merge, cleanup
```

### red-team (Adversarial Analysis)

```yaml
skill: red-team
implements: Science
mapping:
  goal: Strongest possible argument/product
  observe: Original argument or design
  hypothesize: Attack vectors (32 agents generate them)
  experiment: Multi-agent assault on every angle
  measure: Vulnerability scores
  analyze: Steelman response to each attack
  iterate: Refined, attack-hardened output
```

---

## Protocol Compliance Markers

Skills can declare compliance in their SKILL.md frontmatter:

```yaml
---
name: Development
description: ...
implements: Science
science_cycle_time: micro  # micro, meso, macro
---
```

This is **documentation of the mapping**, not runtime coupling.

---

## Integration Points (When Science Orchestrates)

Science explicitly orchestrates only when:

1. **Cross-domain problems** - The problem spans multiple skills
2. **Explicit experimentation requests** - "Try 3 approaches and compare"
3. **Novel problems** - No existing skill pattern fits

**Orchestration Flow:**

```
User: "Figure out best auth approach"
           │
           ▼
┌─────────────────────────────────────────┐
│           SCIENCE ORCHESTRATES           │
└─────────────────────────────────────────┘
           │
           ├──► Goal: optional research skill helps define success criteria
           │
           ├──► Observe: optional research skill gathers context
           │
           ├──► Hypothesize: council skill generates approaches
           │
           ├──► Experiment: Worktree runs parallel implementations
           │
           ├──► Measure: optional evals skill compares approaches
           │
           ├──► Analyze: Science synthesizes results
           │
           └──► Iterate: Pick winner or refine
```

---

## Handoff Boundaries

### What Science Provides to Skills

| To Skill | Science Provides |
|----------|------------------|
| development | Hypothesis to test, success criteria |
| evals | What to measure, baseline comparison |
| research | Research questions, scope |
| council | Options to debate, judgment criteria |
| Worktree | Variant names, comparison criteria |

### What Skills Provide to Science

| From Skill | Skill Provides |
|------------|----------------|
| development | Test results, coverage metrics |
| evals | Scores, statistical analysis |
| research | Findings, evidence quality |
| council | Synthesis, convergence points |
| Worktree | Diff analysis, recommendations |

---

## Scale-Appropriate Protocol Adherence

| Scale | Cycle Time | Protocol Adherence | State Management |
|-------|------------|-------------------|------------------|
| **Micro** | Seconds-Minutes | Implicit (internalized) | None needed |
| **Meso** | Hours-Days | Explicit when stuck | `.science/` directory |
| **Macro** | Weeks-Months | Formal documentation | Global registry |
| **Meta** | Months-Years | Constitutional | Skill versioning |

**Key Principle:** Don't over-formalize micro-scale work. Let the protocol be implicit until you need its structure.

---

## The Self-Reference Property

Science applies to itself.

The science skill MUST be able to improve its own methodology using the scientific method:

1. **Goal:** Improve problem-solving effectiveness
2. **Observe:** Track experiment outcomes across domains
3. **Hypothesize:** Try methodology variations
4. **Experiment:** Apply variations to real problems
5. **Measure:** Learning rate, success rate, iteration speed
6. **Analyze:** Compare methodology versions
7. **Iterate:** Update Science documentation

This is tracked in `Meta/` directory.

---

## Bidirectional Skill Integration

### Science → evals

When Science encounters prompt optimization:

1. **Recognize the domain** - "This is a prompt experiment"
2. **Check availability** - Invoke evals when installed. If unavailable, use the comparison design in [DesignExperiment.md](Workflows/DesignExperiment.md#prompt-experiments) with the host's tools.
3. **Compare consistently** - Apply precommitted criteria to the baseline and each variant on the same samples. Use evals infrastructure when available.
4. **Record evidence** - Keep scores, uncertainty, and recommendations, and report which evaluation method was used.

### evals → Science

When evals gets stuck or needs broader framing:

1. **Paradigm check trigger** - 3+ iterations without improvement
2. **Invoke science explicitly** - `science/Workflows/StructuredInvestigation.md`
3. **Question the frame** - Is the use case defined correctly? Are we measuring the right thing?
4. **Return with clarity** - New hypothesis, new direction, or confirmation to continue

**The escalation path:** evals runs implicitly as Science. When implicit fails, go explicit.

### When Science Orchestrates Across Skills

For problems spanning prompt AND code AND research:

```
User: "Improve the summarization pipeline"
           │
           ▼
┌─────────────────────────────────────────┐
│           SCIENCE ORCHESTRATES           │
└─────────────────────────────────────────┘
           │
           ├──► Goal: What does "better" mean? (science/Workflows/DefineGoal.md)
           │
           ├──► Observe: Current performance across dimensions
           │
           ├──► Hypothesize: Multiple improvement paths
           │    ├─ Better prompt (→ optional evals, or host comparison tools)
           │    ├─ Better code (→ Development/Worktree)
           │    └─ Better architecture (→ optional research, or host web tools)
           │
           ├──► Experiment: Parallel experiments via appropriate skills
           │
           ├──► Measure: Aggregate results from each skill
           │
           └──► Iterate: Pick winner, next cycle
```

Science orchestrates; specialist skills execute.

---

## Summary

**Science is not a skill you call. It's a pattern you embody.**

- Skills implement the protocol independently
- No runtime coupling required
- Science orchestrates only for cross-domain coordination
- Scale determines formality level
- The protocol improves itself through its own application
- **Use optional evals for prompts, or the host's tools with precommitted comparison criteria**
- **When evals stalls, escalate to explicit Science workflows**
