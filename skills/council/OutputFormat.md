# Output Format

Standard format for council debate transcripts.

## CRITICAL: Custom Agents Only

Use the names and trait descriptions assigned during composition, whether prompts were written directly or generated with the optional agents skill's ComposeAgent tool. Give every member a unique name rather than a generic built-in type label such as "Architect" or "Designer".

## Full Debate Transcript

```markdown
## council Debate: [Topic]

**council Members:** [Composed agent names with trait summaries]

### Round 1: Initial Positions

**[Agent 1 Name] ([trait summary]):**
[Position from their specialized perspective]

**[Agent 2 Name] ([trait summary]):**
[Position from their specialized perspective]

**[Agent 3 Name] ([trait summary]):**
[Position from their specialized perspective]

**[Agent 4 Name] ([trait summary]):**
[Position from their specialized perspective]

### Round 2: Responses & Challenges

**[Agent 1 Name]:**
[Responds to specific points from Round 1]

**[Agent 2 Name]:**
[Responds to specific points from Round 1]

[...]

### Round 3: Synthesis

**[Agent 1 Name]:**
[Final position, areas of agreement/disagreement]

[...]

### council Synthesis

**Areas of Convergence:**
- [Points where multiple agents agreed]

**Remaining Disagreements:**
- [Points still contested]

**Recommended Path:**
[Synthesized recommendation]
```

## Quick council Format

```markdown
## Quick council: [Topic]

### Perspectives

**[Agent 1 Name] ([traits]):**
[Brief take - 30-50 words]

**[Agent 2 Name] ([traits]):**
[Brief take]

[...]

### Quick Summary

**Consensus:** [Do they agree? On what?]
**Concerns:** [Red flags raised?]
**Recommendation:** [Proceed / Reconsider / Need full debate]
```

## Output Requirements

- **Length:** 100-150 words per agent per round (debate), 30-50 words (quick)
- **Tone:** Professional but direct; genuine challenges
- **Must Include:** Specific references to other agents' points in Round 2+
- **Must Avoid:** Generic opinions, restating initial position without engagement
- **Agent Names:** Use the unique names assigned during composition
