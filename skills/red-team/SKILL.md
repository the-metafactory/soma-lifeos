---
name: red-team
description: "Adversarial analysis via 32 parallel expert agents. Stress-tests ideas, strategies, and plans — not systems. Two workflows: ParallelAnalysis (decompose → attack → synthesize → steelman) and AdversarialValidation. Goal: strengthen, not destroy. USE WHEN red team, attack idea, counterarguments, critique, stress test, devil's advocate, find weaknesses, break this, poke holes, what could go wrong, adversarial validation."
effort: high
---
# RedTeam Skill

Military-grade adversarial analysis using parallel agent deployment. Breaks arguments into atomic components, attacks from 32 expert perspectives (engineers, architects, pentesters, interns), synthesizes findings, and produces devastating counter-arguments with steelman representations.

## Workflow Routing

Route to the appropriate workflow based on the request.

**When executing a workflow, output this notification directly:**

```
Running the **WorkflowName** workflow in the **RedTeam** skill to ACTION...
```

| Trigger | Workflow |
|---------|----------|
| Red team analysis (stress-test existing content) | `Workflows/ParallelAnalysis.md` |
| Adversarial validation (produce new content via competition) | `Workflows/AdversarialValidation.md` |

---

## Quick Reference

| Workflow | Purpose | Output |
|----------|---------|--------|
| **ParallelAnalysis** | Stress-test existing content | Steelman + Counter-argument (8-points each) |
| **AdversarialValidation** | Produce new content via competition | Synthesized solution from competing proposals |

**The Five-Phase Protocol (ParallelAnalysis):**
1. **Decomposition** - Break into 24 atomic claims
2. **Parallel Analysis** - 32 agents examine strengths AND weaknesses
3. **Synthesis** - Identify convergent insights
4. **Steelman** - Strongest version of the argument
5. **Counter-Argument** - Strongest rebuttal

---

## Context Files

- `Philosophy.md` - Core philosophy, success criteria, agent types
- `Integration.md` - Skill integration, FirstPrinciples usage, output format

---

## Examples

**Attack an architecture proposal:**
```
User: "red team this microservices migration plan"
--> Workflows/ParallelAnalysis.md
--> Returns steelman + devastating counter-argument (8 points each)
```

**Devil's advocate on a business decision:**
```
User: "poke holes in my plan to raise prices 20%"
--> Workflows/ParallelAnalysis.md
--> Surfaces the ONE core issue that could collapse the plan
```

**Adversarial validation for content:**
```
User: "battle of bots - which approach is better for this feature?"
--> Workflows/AdversarialValidation.md
--> Synthesizes best solution from competing ideas
```

---

**Last Updated:** 2025-12-20

## Gotchas

- **RedTeam is for attacking IDEAS, not systems.** This skill finds flaws in arguments, strategies, and plans — not network vulnerabilities.
- **For an engineering approach, prototype first.** Red-team what the prototype found (the Algorithm's Prototype card), not the abstract plan: agents attacking an abstract plan invent theoretical risks. Strategy and business plans stay in scope.
- **32 adversarial agents generate volume — not all findings are equal.** Rank by severity, discard noise.
- **The goal is to strengthen, not destroy.** Present weaknesses constructively with remediation paths.

## Execution Log

After completing any workflow, append a single JSONL entry:

```bash
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","skill":"RedTeam","workflow":"WORKFLOW_USED","input":"8_WORD_SUMMARY","status":"ok|error","duration_s":SECONDS}' >> ~/.soma/memory/SKILLS/execution.jsonl
```

Replace `WORKFLOW_USED` with the workflow executed, `8_WORD_SUMMARY` with a brief input description, and `SECONDS` with approximate wall-clock time. Log `status: "error"` if the workflow failed.
