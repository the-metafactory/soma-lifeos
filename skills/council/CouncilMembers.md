# council Members

Compose each council member with the optional agents skill's ComposeAgent tool when installed; otherwise write a role-and-trait prompt directly. They are NEVER built-in agent types.

## CRITICAL: No Built-In Agent Types

**NEVER use built-in agent types (Architect, Designer, Engineer, PerplexityResearcher, Silas, etc.) for council members.** Built-in types are generic — they have no knowledge of the debate topic and produce shallow, generic perspectives.

council members need topic-specific role-and-trait prompts so they have:
- Unique personalities and voices matched to the debate
- Domain expertise relevant to the specific topic
- Distinct analytical approaches that create genuine friction

## How to Create council Members

### Step 1: Analyze the Topic

Before composing agents, determine what perspectives would create the most productive friction for THIS specific debate. Don't use generic roles — design roles around the topic.

**Example — "Should we use WebSockets or SSE?"**
- Agent 1: Real-time systems architect (traits: `technical,analytical,systematic`)
- Agent 2: Frontend DX advocate (traits: `ux,enthusiastic,pragmatic`)
- Agent 3: Ops/reliability skeptic (traits: `technical,skeptical,cautious`)
- Agent 4: Industry researcher (traits: `research,comparative,thorough`)

**Example — "Is AI overhyped?"**
- Agent 1: AI infrastructure builder (traits: `technical,enthusiastic,systematic`)
- Agent 2: Security practitioner skeptic (traits: `security,skeptical,meticulous`)
- Agent 3: Pragmatic engineer (traits: `technical,pragmatic,analytical`)
- Agent 4: Evidence-based researcher (traits: `research,analytical,comparative`)

### Step 2: Compose Each Agent

When the optional agents skill is installed, run the command below. Otherwise write the prompt directly using the selected role, traits, and debate question, then continue to Step 3.

```bash
bun run ~/.soma/skills/agents/Tools/ComposeAgent.ts \
  --traits "technical,analytical,systematic" \
  --task "Debate: Should we use WebSockets or SSE?" \
  --output json
```

Each call returns: name, voice, voice_id, color, traits, and a full prompt with unique personality.

### Step 3: Launch with general-purpose

**ALWAYS use `subagent_type: "general-purpose"` — NEVER use static types.**

```typescript
Agent({
  description: "council member 1 - systems architect",
  prompt: <composedAgentPrompt + round instructions + topic context>,
  subagent_type: "general-purpose",
  model: "sonnet"
})
```

## Default Perspective Slots

When the user doesn't specify council members, compose 4 agents covering these perspective types (but with topic-specific traits):

| Slot | Purpose | Example Trait Combos |
|------|---------|---------------------|
| **Builder** | Has built things in this domain | `technical,enthusiastic,systematic` |
| **Skeptic** | Challenges assumptions, finds flaws | `[domain],skeptical,meticulous` |
| **Pragmatist** | Implementation reality, trade-offs | `technical,pragmatic,analytical` |
| **Analyst** | Data, precedent, external evidence | `research,analytical,comparative` |

The specific traits should be tailored to the topic, not generic.

## Anti-Patterns

| Scenario | WRONG | RIGHT |
|----------|-------|-------|
| Any council debate | `Agent(subagent_type="Architect")` | Topic-specific prompt → `Agent(subagent_type="general-purpose")` |
| Security topic | `Agent(subagent_type="Silas")` | Role prompt with `security,adversarial,bold` traits |
| Design question | `Agent(subagent_type="Designer")` | Role prompt with `ux,enthusiastic,exploratory` traits |
| Research needed | `Agent(subagent_type="PerplexityResearcher")` | Role prompt with `research,thorough,comparative` traits |
