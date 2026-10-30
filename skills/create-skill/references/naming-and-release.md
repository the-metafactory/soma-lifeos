# Naming and release

Pointed at from the References section of SKILL.md: naming convention, the public/private rule, and public release readiness.

## Naming Convention — Public vs Private

**Skill name encodes its public/private status. There are exactly two valid forms.**

| Skill type | Directory format | Example | Allowed content |
|------------|------------------|---------|-----------------|
| **Public** | `TitleCase` | `Blogging`, `Daemon`, `CreateSkill` | Templated, safe, generic, ready for public release |
| **Private** | `_ALLCAPS` (underscore prefix, all uppercase) | `<your-release-skill>`, `_INBOX`, `_BROADCAST`, `_DOTFILES` | Anything personal, sensitive, identity-bound, customer-bound, or environment-specific |

**The leading underscore is the public-release boundary.** Release tooling skips `_*` skills entirely — they never leave `~/.claude`. Public skills (no underscore) are mirrored into the PAI public release and MUST contain only generic, templated content.

**Sub-file naming (both public and private skills):**

| Component | Format | Example |
|-----------|--------|---------|
| Workflow files | `TitleCase.md` | `Create.md`, `UpdateDaemonInfo.md` |
| Reference docs | `TitleCase.md` | `ProsodyGuide.md`, `ApiReference.md` |
| Tool files | `TitleCase.ts` | `ManageServer.ts` |
| Help files | `TitleCase.help.md` | `ManageServer.help.md` |

**Wrong (NEVER use):**
- Skill dirs: `createskill`, `create-skill`, `CREATE_SKILL` (no underscore + caps for public; no kebab/snake for private)
- Files: `create.md`, `update-info.md`, `SYNC_REPO.md`

### Choosing public vs private — the decision rule

Ask: **"Could this skill be dropped, as-is, into a stranger's `~/.claude/skills/` and just work?"**

- **Yes** → public skill (`TitleCase`). Body must be generic; user-specific config layers in via `PAI/USER/SKILLCUSTOMIZATIONS/<SkillName>/`.
- **No, because it references my identity, my contacts, my business, my customer, my paid API, my private infra, my domain, my private repo, my partner, or my financial/health/security data** → private skill (`_ALLCAPS`).

**When in doubt, build it private first (`_ALLCAPS`). Promoting `_FOO` → `Foo` later is easy. Discovering a public skill leaks your life is permanent.**

---

## Public Release Readiness (MANDATORY)

**Public skills (`TitleCase`) ship to the world. Private skills (`_ALLCAPS`) never leave the local repo.** Sensitivity is decided by skill name, not by per-file scrubbing at share-time.

### The Bright Line

**Public skill (`TitleCase`) — content rule:**

ONLY templated, safe, public, ready content. Period.

- ✅ Generic instructions any PAI user could follow
- ✅ Templated patterns with placeholders for user-specific values
- ✅ Public API references and dependencies on public tools
- ❌ Real names (people, products, companies, customers)
- ❌ Real domains, hostnames, IPs, internal URLs
- ❌ API keys, tokens, credentials, session cookies, OAuth secrets — even example-looking ones
- ❌ Private repo paths or references (`github.com/<org>/<private-repo>`)
- ❌ Customer data, customer-specific workflows, customer engagement context
- ❌ First-person war stories tied to a specific incident, project, or person
- ❌ User-specific filesystem paths (`/Users/<name>/...`, `/home/<name>/...`)
- ❌ Identity-bound preferences (DA name, principal name, partner name, pet name, financial figures, health data)

**Private skill (`_ALLCAPS`) — content rule:**

Anything goes. Real names, real domains, real customers, real credentials-by-reference (env var names, never values), real war stories, real internal infra. The underscore IS the safety boundary. These skills are excluded from release tooling.

### The Decision Test

When you find yourself wanting to write any of the following into a skill body, that skill MUST be `_ALLCAPS`:

| If the skill mentions… | Skill must be |
|------------------------|---------------|
| A specific person's name (yours, your partner's, your team's, a customer's) | `_ALLCAPS` |
| A specific product name you own or sell | `_ALLCAPS` |
| A specific customer or client | `_ALLCAPS` |
| A specific paid API account, billing realm, or subscription | `_ALLCAPS` |
| A specific private domain, hostname, internal IP, or VPN | `_ALLCAPS` |
| A specific private repo, dotfile location, or local infra | `_ALLCAPS` |
| A specific business process tied to your company | `_ALLCAPS` |
| A specific financial, health, security, or legal context | `_ALLCAPS` |
| A specific incident or one-off war story | `_ALLCAPS` |
| Anything that would be wrong, embarrassing, or unsafe in someone else's `~/.claude/` | `_ALLCAPS` |

If none of the above apply and the skill is fully generic — it can be `TitleCase` (public).

### Where Personal Layering Goes for Public Skills

A public skill can be made user-specific at runtime via `SKILLCUSTOMIZATIONS/<SkillName>/PREFERENCES.md`. The skill body stays generic; the user's customization file overlays per-instance context. Use this when a skill is fundamentally generic but benefits from per-user tweaks (preferred voice, default formats, personal taste).

**Do not use SKILLCUSTOMIZATIONS to smuggle private content into a public skill.** If the skill *requires* private context to function (real customer name, real API account, real internal infra), it is a private skill — name it `_ALLCAPS` and stop.

### Allowed in Public Skills

- Generic `~/` paths (`~/.claude/skills/`, `~/Projects/<tool>/`) — resolve per-user
- Public repo URLs for tools the skill depends on
- Public API endpoints that are conventions, not secrets (e.g., `localhost:<port>/<route>`)
- Example values clearly marked as placeholders (`<url>`, `<SESSION_ID>`, `test@example.com`)
- Generic env var *names* (never values): `STRIPE_API_KEY`, `OPENAI_API_KEY`

### Pre-Flight Grep (Public Skills Only)

Before shipping or modifying any `TitleCase` skill, run:
```bash
rg -i "<your-name>|<your-org>|<your-product>|<your-domain>|/Users/[a-z]+/" ~/.claude/skills/<SkillName>/
```

Zero matches = ready for public release. Any match = either scrub it, move it to SKILLCUSTOMIZATIONS, or rename the skill to `_ALLCAPS` and stop pretending it's public. **`_ALLCAPS` skills are exempt from this grep — they are private by design.**
