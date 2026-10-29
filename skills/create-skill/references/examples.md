# Examples and execution log

Pointed at from the References section of SKILL.md: worked examples per workflow, and the execution log entry to append after any workflow.

## Examples

**Example 1: Create a new skill from scratch**
```
User: "Create a skill for managing my recipes"
→ Invokes CreateSkill workflow
→ Reads SkillSystem.md for structure requirements
→ Creates skill directory with TitleCase naming
→ Creates SKILL.md, Workflows/, Tools/
→ Suggests running TestSkill to verify effectiveness
```

**Example 2: Fix an existing skill that's not routing properly**
```
User: "The research skill isn't triggering - validate it"
→ Invokes ValidateSkill workflow
→ Checks SKILL.md against canonical format
→ Verifies TitleCase naming and USE WHEN triggers
→ Reports compliance issues with fixes
```

**Example 3: Test if a skill actually helps**
```
User: "Test the Blogging skill to see if it's effective"
→ Invokes TestSkill workflow
→ Generates 3 realistic test prompts
→ Spawns with-skill and baseline agents in parallel
→ Compares outputs, presents results
→ Iterates with ImproveSkill based on feedback
```

**Example 4: Skill isn't triggering on relevant prompts**
```
User: "The Security skill doesn't trigger when I ask about pentesting"
→ Invokes OptimizeDescription workflow
→ Generates 20 should/shouldn't-trigger queries
→ Tests description accuracy via subagents
→ Rewrites description, re-tests, reports improvement
```

**Example 5: Improve a skill that produces weak output**
```
User: "The research skill output is too verbose — improve it"
→ Invokes ImproveSkill workflow
→ Reads skill + user feedback
→ Diagnoses root cause (over-specified instructions)
→ Rewrites with reasoning instead of rigid MUSTs
→ Suggests TestSkill to verify improvement
```

## Execution Log

After completing any workflow, append a single JSONL entry:

```bash
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","skill":"CreateSkill","workflow":"WORKFLOW_USED","input":"8_WORD_SUMMARY","status":"ok|error","duration_s":SECONDS}' >> ~/.soma/memory/SKILLS/execution.jsonl
```

Replace `WORKFLOW_USED` with the workflow executed, `8_WORD_SUMMARY` with a brief input description, and `SECONDS` with approximate wall-clock time. Log `status: "error"` if the workflow failed.
