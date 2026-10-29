# Structure

Pointed at from the References section of SKILL.md: flat folder structure, the dynamic loading pattern, minimal template and example structure.

## Flat Folder Structure (MANDATORY)

**CRITICAL: Keep folder structure FLAT - maximum 2 levels deep.**

### The Rule

**Maximum depth:** `skills/SkillName/Category/`

### ✅ ALLOWED (2 levels max)

```
skills/SkillName/SKILL.md                    # Skill root
skills/SkillName/Workflows/Create.md         # Workflow - one level deep - GOOD
skills/SkillName/Tools/Manage.ts             # Tool - one level deep - GOOD
skills/SkillName/QuickStartGuide.md          # Context file - in root - GOOD
skills/SkillName/Examples.md                 # Context file - in root - GOOD
```

### ❌ FORBIDDEN (Too deep OR wrong location)

```
skills/SkillName/Resources/Guide.md              # Context files go in root, NOT Resources/
skills/SkillName/Docs/Examples.md                # Context files go in root, NOT Docs/
skills/SkillName/Workflows/Category/File.md      # THREE levels - NO
skills/SkillName/Templates/Primitives/File.md    # THREE levels - NO
skills/SkillName/Tools/Utils/Helper.ts           # THREE levels - NO
```

### Allowed Subdirectories

**These subdirectories are allowed:**
- **Workflows/** - Execution workflows ONLY
- **Tools/** - Executable scripts/tools ONLY
- **References/** - Extended reference material for large skills (API docs, detailed guides)

**Context files (documentation, guides, references) go in the skill ROOT or in References/.**

**When to use References/:** When SKILL.md exceeds ~500 lines and has substantial reference content (API signatures, detailed examples, troubleshooting guides). Keep SKILL.md as a routing guide; move encyclopedic content to References/.

### Why

1. **Discoverability** - Easy to find files
2. **Simplicity** - Less navigation overhead
3. **Speed** - Faster file operations
4. **Consistency** - Every skill follows same pattern

**If you need to organize many workflows, use clear filenames instead of subdirectories:**

**See:** `~/.soma/skills/writing-for-agents/SKILL.md` (Information hierarchy section)

---

## Dynamic Loading Pattern (Large Skills)

**For skills with SKILL.md > 100 lines:** Use dynamic loading to reduce context on skill invocation.

### How Loading Works

**Session startup:** Only frontmatter loads for routing
**Skill invocation:** Full SKILL.md loads
**Context files:** Load only when workflows reference them

### The Pattern

**SKILL.md** = Minimal (30-50 lines) - loads on skill invocation
- YAML frontmatter with triggers
- Brief description
- Workflow routing table
- Quick reference
- Pointers to context files

**Additional .md files** = Context files - SOPs for specific aspects (loaded on-demand)
- These are Standard Operating Procedures, not just documentation
- They provide specific handling instructions
- Can reference Workflows/, Tools/, etc.

### 🚨 CRITICAL: NO Context/ Subdirectory 🚨

**NEVER create Context/ or Docs/ subdirectories.**

Additional .md files ARE the context files. They live **directly in skill root**.

**WRONG:**
```
skills/Art/
├── SKILL.md
└── Context/              ❌ NEVER CREATE THIS
    └── Aesthetic.md
```

**CORRECT:**
```
skills/Art/
├── SKILL.md
├── Aesthetic.md          ✅ Context file in skill root
├── Examples.md           ✅ Context file in skill root
└── Tools.md              ✅ Context file in skill root
```

**The skill directory IS the context.**

### Example Structure

```
skills/Art/
├── SKILL.md              # 40 lines - minimal routing
├── Aesthetic.md          # Context file - SOP for aesthetic
├── Examples.md           # Context file - SOP for examples
├── Tools.md              # Context file - SOP for tools
├── Workflows/            # Workflows
│   └── Essay.md
└── Tools/                # CLI tools
    └── Generate.ts
```

### Minimal SKILL.md Template

```markdown
---
name: SkillName
description: Create, test, and optimize PAI skills — scaffolding, effectiveness testing, description optimization. USE WHEN create skill, new skill, validate skill, test skill, improve skill, optimize description.
---

# SkillName

Brief description.

## Workflow Routing

| Trigger | Workflow |
|---------|----------|
| "trigger" | `Workflows/WorkflowName.md` |

## Quick Reference

**Key points** (3-5 bullet points)

**Full Documentation:**
- Detail 1: `SkillSearch('skillname detail1')` → loads Detail1.md
- Detail 2: `SkillSearch('skillname detail2')` → loads Detail2.md
```

### When To Use

✅ **Use dynamic loading for:**
- SKILL.md > 100 lines
- Multiple documentation sections
- Extensive API reference
- Detailed examples

❌ **Don't use for:**
- Simple skills (< 50 lines)
- Pure utility wrappers (use PAI/TOOLS.md instead)

### Benefits

- **Token Savings:** 70%+ reduction on skill invocation (when full docs not needed)
- **Organization:** SKILL.md = routing, context files = SOPs for specific aspects
- **Efficiency:** Workflows load only what they actually need
- **Maintainability:** Easier to update individual sections

**See:** `~/.soma/skills/writing-for-agents/SKILL.md` (Information hierarchy section)
