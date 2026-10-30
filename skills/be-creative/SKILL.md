---
name: be-creative
description: "Divergent ideation and corpus expansion using Verbalized Sampling. Single-shot generates 5 diverse candidates, surfaces strongest. Multi-turn expands seed corpus into diverse dataset. Seven workflows: StandardCreativity, MaximumCreativity, IdeaGeneration, TreeOfThoughts, DomainSpecific, TechnicalCreativity, SyntheticDataExpansion. USE WHEN be creative, brainstorm, divergent ideas, maximum creativity, tree of thoughts, creative angle, unconventional approach, expand corpus, synthetic data, generate diverse examples."
effort: medium
---
# be-creative Skill

Enhance AI creativity using deep thinking + Verbalized Sampling. Combines research-backed techniques (Zhang et al., 2024) for 1.6-2.1x diversity increase and extended thinking for quality.

---

## Optional Integrations

Check availability before using these integrations in any workflow:

- `evals` is optional. If unavailable, compare variants against precommitted criteria and record the measurements.
- `research` is optional. If unavailable, gather and cite sources with the host's web tools.
- `art` is optional. If unavailable, return Mermaid diagram source or image prompts.

Report any fallback used in the result.

## Workflow Routing

Route to the appropriate workflow based on the request.

**When executing a workflow, output this notification:**
```
Running the **WorkflowName** workflow in the **be-creative** skill to ACTION...
```

| Workflow | Triggers | Description |
|----------|----------|-------------|
| `Workflows/StandardCreativity.md` | "be creative", "think creatively", default creative tasks | Standard deep thinking + VS for quality creative work |
| `Workflows/MaximumCreativity.md` | "maximum creativity", "most creative", "radically different" | Push boundaries, avoid all cliches, unconventional |
| `Workflows/IdeaGeneration.md` | "brainstorm", "ideas for", "solve this problem" | Problem-solving and innovation focus |
| `Workflows/TreeOfThoughts.md` | "complex problem", "multi-factor", "explore paths" | Branching exploration for complex challenges |
| `Workflows/DomainSpecific.md` | "artistic", "business innovation", domain-specific | Domain-tailored creativity templates |
| `Workflows/TechnicalCreativityGemini3.md` | "technical creativity", "algorithm", "architecture" | Engineering creativity via Gemini 3 Pro |
| `Workflows/SyntheticDataExpansion.md` | "expand corpus", "synthetic data", "generate diverse examples", "expand seed set", "create test set from these" | Multi-turn VS to grow a small seed corpus into a diverse N-example dataset |

---

## Quick Reference

**Core technique:** Generate 5 diverse options (p<0.10 each) internally, output single best response.

**Default approach:** For most creative requests, apply StandardCreativity workflow.

**For artistic/narrative creativity:** Apply workflow directly (no delegation needed).

**For technical creativity:** Use TechnicalCreativityGemini3 workflow.

---

## Resource Index

| Resource | Description |
|----------|-------------|
| `ResearchFoundation.md` | Research backing, why it works, activation triggers |
| `Principles.md` | Core philosophy and best practices |
| `Templates.md` | Quick reference templates for all modes |
| `Examples.md` | Practical examples with expected outputs |
| `Assets/creative-writing-template.md` | Creative writing specific template |
| `Assets/idea-generation-template.md` | Brainstorming template |

---

## Integration with Other Skills

**Works well with:**
- **XPost** (optional) / **LinkedInPost** (optional) - Generate creative social media content
- **Blogging** (optional) - Creative blog post ideas and narrative approaches
- **development** (optional) - Creative technical solutions
- **art** (optional) - Diverse image prompt ideas and creative directions
- **Business** (optional) - Creative offer frameworks and business models
- **research** (optional) - Creative research angles and synthesis approaches

---

## Examples

**Example 1: Creative blog angle**
```
User: "think outside the box for this AI ethics post"
-> Applies StandardCreativity workflow
-> Generates 5 diverse angles internally (p<0.10 each)
-> Returns most innovative framing approach
```

**Example 2: Product naming brainstorm**
```
User: "be creative - need names for this security tool"
-> Applies MaximumCreativity workflow
-> Explores unusual metaphors, domains, wordplay
-> Presents best option with reasoning
```

**Example 3: Technical creativity**
```
User: "deep thinking this architecture problem"
-> Invokes TechnicalCreativityGemini3 workflow
-> Uses Gemini 3 Pro for mathematical/algorithmic creativity
-> Returns novel technical solution
```

---

**Research-backed creative enhancement: 1.6-2.1x diversity, 25.7% quality improvement.**

## Gotchas

- **This is for QUICK divergent brainstorming.** For deep multi-cycle evolutionary ideation, use ideate instead.
- **Verbalized Sampling requires extended thinking to work.** Don't disable extended thinking when using this skill.
- **1.6-2.1x diversity claims come from specific benchmark conditions.** Real-world diversity improvement varies with prompt type.

## Execution Log

After each workflow, build a record with the actual UTC timestamp, workflow name, brief input summary, status (`ok` or `error`), and elapsed seconds:

```json
{"ts":"ISO8601","skill":"be-creative","workflow":"WORKFLOW_USED","input":"brief summary","status":"ok","duration_s":0}
```

Serialize the record with `JSON.stringify(record) + "\n"`. Use the host's file-write tool to append it to `memory/SKILLS/be-creative/execution.jsonl` under the Soma home, creating the parent directory if needed. If the tool only replaces files, read the existing log and preserve its contents before adding the serialized line. Keep all user-derived values in the JSON data, outside shell commands. Logging is complete when the new line parses as one JSON object and prior entries are preserved.
