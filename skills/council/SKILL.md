---
name: council
description: "Debate a decision through multiple expert perspectives and visible deliberation rounds. Use to weigh options, compare tradeoffs, or seek consensus. Use red-team for a purely adversarial critique and delegation for parallel task execution."
effort: high
context: fork
---
# council skill

Multi-agent debate system where custom-composed agents discuss topics in rounds, respond to each other's points, and surface insights through intellectual friction.

## Optional Integrations

Check availability before using these integrations in any workflow:

- `agents` is optional. If unavailable, compose role-and-trait prompts directly with the host's agent tools.
- `research` is optional. If unavailable, gather and cite sources with the host's web tools.

Report any fallback used in the result.

## CRITICAL: Custom Agents Only

Compose each member with topic-specific expertise, a distinct viewpoint, and a role-and-trait prompt. When the optional agents skill is installed, generate the prompt with `bun run ~/.soma/skills/agents/Tools/ComposeAgent.ts`; otherwise write it directly.

Built-in types are generic and topic-ignorant. council debates require agents with:
- Domain expertise tailored to the specific debate topic
- Unique voices and personalities via ComposeAgent
- Distinct analytical approaches that create genuine friction

See `CouncilMembers.md` for full agent composition instructions.

**Key Differentiator from red-team:** council is collaborative-adversarial (debate to find best path), while red-team is purely adversarial (attack the idea). council produces visible conversation transcripts; red-team produces steelman + counter-argument.

## Workflow Routing

Route to the appropriate workflow based on the request.

| Trigger | Workflow |
|---------|----------|
| Full structured debate (3 rounds, visible transcript) | `Workflows/Debate.md` |
| Quick consensus check (1 round, fast) | `Workflows/Quick.md` |
| Pure adversarial analysis | red-team skill |

## Quick Reference

| Workflow | Purpose | Rounds | Output |
|----------|---------|--------|--------|
| **DEBATE** | Full structured discussion | 3 | Complete transcript + synthesis |
| **QUICK** | Fast perspective check | 1 | Initial positions only |

## Context Files

| File | Content |
|------|---------|
| `CouncilMembers.md` | How to compose custom agents for councils (ComposeAgent) |
| `RoundStructure.md` | Three-round debate structure and timing |
| `OutputFormat.md` | Transcript format templates |

## Core Philosophy

**Origin:** Best decisions emerge from diverse perspectives challenging each other. Not just collecting opinions - genuine intellectual friction where domain-specific experts respond to each other's actual points.

**Agents:** Give every member a role-and-trait prompt tailored to the topic, optionally generated with the agents skill's ComposeAgent tool.

**Speed:** Parallel execution within rounds, sequential between rounds. A 3-round debate of 4 agents = 12 agent calls but only 3 sequential waits. Complete in 40-90 seconds.

## Examples

```
"council: Should we use WebSockets or SSE?"
-> Compose 4 custom agents with relevant traits (real-time, frontend, ops, research)
-> DEBATE workflow -> 3-round transcript

"Quick council check: Is this API design reasonable?"
-> Compose 4 custom agents with API-relevant traits
-> QUICK workflow -> Fast perspectives

"council: Is AI overhyped?"
-> Compose agents: AI builder, security skeptic, pragmatic engineer, evidence analyst
-> DEBATE workflow -> 3-round transcript
```

## Integration

**Optional composition helper:**
- **optional agents skill** - ComposeAgent tool for creating all council members

**Works well with:**
- **red-team** - Pure adversarial attack after collaborative discussion
- **research** (optional) - Gather context before convening the council

## Best Practices

1. Use QUICK for sanity checks, DEBATE for important decisions
2. Design agent traits around the specific topic, not generic roles
3. Review the transcript - insights are in the responses, not just positions
4. Trust multi-agent convergence when it occurs
5. Use custom role-and-trait prompts; ComposeAgent is the optional composition helper

---

**Last Updated:** 2026-03-18

## Gotchas

- **council uses custom role-and-trait prompts, optionally generated with the agents skill (ComposeAgent).** Never use Designer, Architect, etc. for council debates.
- **Debates need genuine disagreement to be valuable.** If all agents agree, the topic may not warrant council.
- **For an engineering approach, prototype first.** Convene the council on what the prototype found (the Algorithm's Prototype card), not the abstract plan: agents debating an abstract plan invent theoretical risks. Strategy and business plans stay in scope.
- **More agents ≠ better debate.** 4-6 well-composed agents outperform 12 generic ones.

## Execution Log

After each workflow, build a record with the actual UTC timestamp, workflow name, brief input summary, status (`ok` or `error`), and elapsed seconds:

```json
{"ts":"ISO8601","skill":"council","workflow":"WORKFLOW_USED","input":"brief summary","status":"ok","duration_s":0}
```

Serialize the record with `JSON.stringify(record) + "\n"`. Use the host's file-write tool to append it to `memory/SKILLS/council/execution.jsonl` under the Soma home, creating the parent directory if needed. If the tool only replaces files, read the existing log and preserve its contents before adding the serialized line. Keep all user-derived values in the JSON data, outside shell commands. Logging is complete when the new line parses as one JSON object and prior entries are preserved.
