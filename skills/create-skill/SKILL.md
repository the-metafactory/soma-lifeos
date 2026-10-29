---
name: create-skill
description: "Complete PAI skill development lifecycle across two tracks: structure (scaffold, validate, canonicalize against canonical format) and effectiveness (Anthropic methodology — test with-skill vs baseline, improve instructions, optimize trigger accuracy). USE WHEN create skill, new skill, validate skill, test skill, improve skill, optimize description, skill not triggering, skill overtriggering, canonicalize, scaffold skill, skill quality. NOT FOR TypeScript CLI generation (use CreateCLI)."
effort: medium
---

# CreateSkill

Complete skill development lifecycle: **structure** (create, validate, canonicalize) + **effectiveness** (test, improve, optimize triggers). Structural workflows ensure skills follow PAI conventions. Effectiveness workflows — inspired by Anthropic's skill-creator — ensure skills actually work and trigger reliably.

## Authoritative Source

**Before creating ANY skill, READ:** `~/.soma/skills/writing-for-agents/SKILL.md`

**Canonical example to follow:** any well-formed public skill in `~/.soma/skills/` (e.g. `research/SKILL.md`, `create-skill/SKILL.md` itself).

## Workflow Routing

### Structure Workflows (scaffolding and conventions)

| Workflow | Trigger | File |
|----------|---------|------|
| **CreateSkill** | "create a new skill" | `Workflows/CreateSkill.md` |
| **ValidateSkill** | "validate skill", "check skill" | `Workflows/ValidateSkill.md` |
| **UpdateSkill** | "update skill", "add workflow" | `Workflows/UpdateSkill.md` |
| **CanonicalizeSkill** | "canonicalize", "fix skill structure" | `Workflows/CanonicalizeSkill.md` |

### Effectiveness Workflows (testing and optimization)

| Workflow | Trigger | File |
|----------|---------|------|
| **TestSkill** | "test skill", "does this skill work", "skill not working" | `Workflows/TestSkill.md` |
| **ImproveSkill** | "improve skill", "skill quality", "fix skill instructions" | `Workflows/ImproveSkill.md` |
| **OptimizeDescription** | "optimize description", "skill not triggering", "trigger accuracy" | `Workflows/OptimizeDescription.md` |

## Skill Types (Choose Before Building)

Before creating any skill, identify which of the 9 types it is (from Anthropic's internal skill taxonomy, Thariq Shihipar, Mar 2026). The type shapes structure and testing decisions.

| Type | Focus | Key Structure | Example |
|------|-------|---------------|---------|
| 1. Library/API Reference | Gotchas, edge cases Claude gets wrong | Lightweight, gotchas-heavy, reference snippets | HonoReference, D1Reference |
| 2. Product Validation | Test/verify code works | State assertions, browser automation, output recording | Browser |
| 3. Data Fetching | Connect to data systems | Credential refs, query patterns, dashboard pointers | USMetrics, _METRICS |
| 4. Business Process | Automate repetitive workflows | Execution logs, consistency tracking | _CLICKUP, _BROADCAST |
| 5. Code Scaffolding | Generate framework boilerplate | Template files, project-aware scripts | CreateCLI, CreateSkill |
| 6. Code Quality | Enforce standards, review | Deterministic scripts, hook integration | /simplify, /code-review |
| 7. CI/CD & Deployment | Deploy with safety patterns | Pre-deploy checks, smoke tests, rollback | (gap — needs Deploy skill) |
| 8. Operations Runbooks | Map phenomena to diagnostics | Phenomenon → tool → query → report | _HEALTHCHECK |
| 9. Infrastructure Ops | Maintenance with safety guardrails | Safety gates, audit logging, orphan detection | _PAI, _DOTFILES |

## Skill Writing Guidance

When writing or improving skill instructions, follow these principles from Anthropic's skill-creator methodology and Thariq Shihipar's "Lessons from Building Claude Code" (Mar 2026):

### Core Principles

- **Don't state the obvious.** Claude is competent at programming and knows codebases. Focus on information that **breaks Claude's default patterns** — things it gets wrong without guidance. Test: "Would Claude do this wrong without being told?" If not, remove it.
- **Explain the why, not just the what.** Models with good theory of mind + clear reasoning outperform models with rigid constraints. Instead of "ALWAYS use 3 bullets", explain why bullets matter for the audience.
- **Keep it lean.** The context window is a public good. Remove instructions that don't improve output. If test transcripts show the agent wasting time on unproductive steps, cut them. SKILL.md should be under 500 lines.
- **Generalize, don't overfit.** Fix underlying patterns, not specific test failures. The skill will be used on many prompts beyond your test set.
- **Bundle repeated work.** If test agents all independently wrote similar helper scripts, add that script to Tools/ so every future invocation benefits.
- **Set appropriate degrees of freedom.** Match specificity to task fragility. Database migrations need exact commands; code reviews need general direction.
- **Don't over-constrain.** Skills are reused heavily. Avoid overly specific instructions. Provide needed information but leave flexibility for different contexts.

### Description Best Practices

- **Descriptions are for models, not humans.** The description is injected into the system prompt. Claude reads it to decide whether to invoke the skill.
- **Descriptions should be slightly pushy.** Models tend to undertrigger. Name specific scenarios even if the user might not explicitly mention the skill.
- **Include negative triggers for confusable skills.** Add "NOT FOR" clauses when skills share vocabulary: `"NOT FOR web pentesting (use WebAssessment)"`.
- **Undertriggering signals:** Skill doesn't load when it should, users manually invoking it.
- **Overtriggering signals:** Skill loads for irrelevant queries, users disabling it.

## References

Read on demand; each file states which trigger it serves.

- `references/naming-and-release.md` — read when naming a new skill, deciding public vs private, or before shipping or modifying a public (`TitleCase`) skill.
- `references/structure.md` — read when laying out a skill's folders, or when a SKILL.md grows past ~100 lines and needs context files.
- `references/writing-guidance.md` — read when writing or improving a skill body: gotchas section, BPE check, progressive disclosure levels, testing levels, on-demand hooks.
- `references/examples.md` — read when unsure which workflow a request maps to, and after finishing any workflow to append the execution log entry.
