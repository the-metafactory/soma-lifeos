# Quick Workflow

Fast single-round perspective check. Use for sanity checks and quick feedback.

Running the **Quick** workflow in the **council** skill to get fast perspectives...

## Prerequisites

- Topic or question to evaluate
- Optional: Custom council members

## CRITICAL: Agent Composition

**Compose each council member with the optional agents skill's ComposeAgent tool when installed; otherwise write a role-and-trait prompt directly. NEVER use built-in agent types (Architect, Designer, Engineer, PerplexityResearcher, Silas, etc.).**

See `CouncilMembers.md` for full instructions.

## Execution

### Step 1: Compose & Announce Quick council

Compose 4 agents with topic-specific traits via ComposeAgent, then announce:

```markdown
## Quick council: [Topic]

**council Members:** [List composed agent names]
**Mode:** Single round (fast perspectives)
```

### Step 2: Parallel Perspective Gathering

Launch all council members in parallel using `subagent_type: "general-purpose"`.

**Each agent prompt includes the composed agent's full prompt PLUS:**
```
QUICK COUNCIL CHECK

Topic: [The topic]

[Relevant context for the topic]

Give your immediate take from your specialized perspective:
- Key concern, insight, or recommendation
- 30-50 words max
- Be direct and specific

This is a quick sanity check, not a full debate.
```

### Step 3: Output Perspectives

```markdown
### Perspectives

**[Agent 1 Name] ([traits]):**
[Brief take]

**[Agent 2 Name] ([traits]):**
[Brief take]

**[Agent 3 Name] ([traits]):**
[Brief take]

**[Agent 4 Name] ([traits]):**
[Brief take]

### Quick Summary

**Consensus:** [Do they generally agree? On what?]
**Concerns:** [Any red flags raised?]
**Recommendation:** [Proceed / Reconsider / Need full debate]
```

## When to Escalate

If the quick check reveals significant disagreement or complex trade-offs, recommend:

```
This topic has enough complexity for a full council debate.
Run: "council: [topic]" for 3-round structured discussion.
```

## Timing

- Total: 15-30 seconds (composition + single parallel round)

## Done

Quick perspectives gathered. Use for fast validation; escalate to DEBATE for complex decisions.
