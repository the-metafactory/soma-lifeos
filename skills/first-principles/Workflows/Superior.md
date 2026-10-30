Adapted from LifeOS `Superior` by Daniel Miessler, `danielmiessler/PAI` at commit `fb9aef4640a73feae4c2e6483b26f58491ce2665` (`LifeOS/install/skills/Superior/`); MIT license in [NOTICE.md](../../../NOTICE.md).

# Superior

Ask how a far more capable mind would build the thing, then list the gaps
between its approach and the current design. Use this lens for architecture,
strategy and connected design decisions. Use `Challenge.md` for constraint
classification alone or `Reconstruct.md` for several blank-slate alternatives.

This is a prompt-only reasoning pass using the supplied context. It requires no
tool, agent dispatch or external API. Treat the superior mind as a hypothetical
lens, not evidence that we know every relevant method or the current frontier.
Mark missing facts as unknown and proposed improvements as hypotheses to test.

## 1. Fix the scope and goal

State the real outcome behind the request and the smallest scope containing the
decision it feeds. Respect an explicitly fixed scope. For an ambiguous request,
ask one focused scope question when an answer is available; in a headless run,
state the best inference and flag it as an assumption. A small, fixed scope may
yield no material gap; report that rather than inventing a larger task.

Write: `Scope: <scope>, from <request>, because <reason>.`

Map the components, entry points, data flow, boundaries, scale and dependencies
within that scope from the supplied evidence. Mark each unknown rather than
inventing a baseline. Record the constraints the principal actually set alongside
physical limits and verified facts. Soft constraints can be questioned; explicit
budgets, permissions, security gates and preferences remain binding.

Finish with a scope map covering the whole chosen scope, a goal and a constraint
list before designing the alternative.

## 2. Replace the solver

Ask: **How would a far more capable, fully informed mind build this to achieve
the real goal?** Imagine a solver that knows the best relevant methods, connects
ideas across fields, carries no inherited habits and invents no limits. It seeks
the move that makes other work unnecessary, while honoring the recorded real
constraints.

Write its approach from first move to finished result before rereading the
current plan. If the plan is already in context, acknowledge that anchoring risk;
an inline pass cannot claim independent or blind review. Explain concrete
mechanisms, what they remove or simplify, and how they achieve the goal. Stronger
adjectives applied to the same design do not constitute an alternative.

Separate supported choices from ideas needing validation. Convert imagined
omniscience or unavailable resources into the nearest executable version or a
named real limit. Finish with an approach specific enough to compare decision
by decision with the current design.

## 3. Account for every material gap

Now read the current design and compare it with the superior approach across
the scope map. For each material difference, name our limiting assumption:
missing knowledge, inherited convention, invented constraint, framing, effort
budget or tooling habit.

Give each gap a verdict: **adopt now**, **adopt in part**, or **blocked by a named
real limit**. Every row ends with an executable recommended change or that limit.
A knowledge gap gets a concrete question to investigate and the evidence that
would settle it; it does not become a claim that research already happened.
If no current design was supplied, mark that comparison unknown and name the
baseline needed instead of fabricating our plan.

## 4. Recommend the changed plan

Order the recommended changes by their effect on the goal. For each adopted
gap, give a next action and a check that could show whether it helps. Preserve
blocked gaps and their limits. If the current design survives, explain why.
Identify the single gap with the greatest expected benefit and its uncertainty.

Return recommendations only. A change in what is being built is a direction
question for the principal before implementation. Complete all sections below,
using an explicit unknown or no-material-gap finding where appropriate.

```markdown
## Superior: <topic>

**Real goal:** <outcome>
**Scope:** <scope>, from <request>, because <reason>

### Scope map
<Components, flow, boundaries, scale, dependencies, evidence and unknowns.>
<Real constraints, including every applicable principal-set constraint.>

### The superior approach
<Concrete steps from first move to finished result; hypotheses and anchoring risk.>

### Gap table
| Superior mind does | Current design | Our limit | Verdict | Recommended change or real limit |
| --- | --- | --- | --- | --- |
| <decision> | <evidence or unknown> | <cause> | <adopt now / adopt in part / blocked> | <action or named limit> |

### Changed plan
<Ordered recommendations with validation checks, or why the current design held.>

**Biggest lift:** <one gap, expected benefit and uncertainty>
```

Use the parent skill's existing execution log after completion.
