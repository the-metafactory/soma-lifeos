# Writing guidance

Pointed at from the References section of SKILL.md: gotchas, the BPE check, progressive disclosure, testing, and the on-demand hook pattern.

### Gotchas Section (MANDATORY)

Every skill MUST have a `## Gotchas` section after the workflow routing table. Thariq: "The highest information density in any Skill comes from gotchas sections."

Populate with:
- API quirks Claude doesn't know about
- Common mistakes observed during usage
- Ordering/sequencing requirements that aren't obvious
- Edge cases that cause silent failures

**Gotchas accumulate over time.** After every skill failure, add the lesson.

### BPE (Bitter-Pilled Engineering) Check

Before finalizing any skill, ask: **"Would a smarter model make this skill unnecessary?"**

- **Anti-fragile (keep):** Verification harnesses, data pipelines, tool wrappers, accumulated gotchas, deterministic scripts
- **Fragile (question):** CoT orchestrators, format parsers, retry cascades, elaborate reasoning scaffolding

Focus skills on knowledge Claude can't derive (failure modes, API quirks), tools Claude can't replicate (API calls, automation), and workflows that benefit from consistency.

### Progressive Disclosure (from Anthropic)

Three levels of information loading — use this to manage large skills:
1. **Level 1 (YAML frontmatter):** Always in system prompt. Triggering info only.
2. **Level 2 (SKILL.md body):** Loaded when skill is invoked. Routing + key guidance.
3. **Level 3 (Reference files):** Root-level `.md` files or `References/` subdirectory loaded on demand.

Tell Claude what files exist; it will read them when appropriate. SKILL.md should be under 500 lines — if over, extract detailed content to reference files.

### Testing Best Practices (from Anthropic)

Three testing levels for skills:
1. **Manual testing** — Run queries and observe behavior
2. **Scripted testing** — Automate test cases (use TestSkill workflow)
3. **Programmatic testing** — Build evaluation suites (use Evals skill)

**Evaluation-driven development:** Define what "this skill working" looks like before building the skill. Iterate on a single challenging task until Claude succeeds, then extract the winning approach.

### On-Demand Hook Pattern (from Anthropic)

Skills can include hooks that activate only when invoked, remaining effective for the session:
- `/careful` — Intercept dangerous commands (rm -rf, DROP TABLE, force-push)
- `/freeze` — Block edits outside specific directories
- `/audit` — Log all tool calls for session review

*All guidance above derived from Thariq Shihipar's "Lessons from Building Claude Code" (Mar 2026), Anthropic's official skill guide, and platform documentation.*
