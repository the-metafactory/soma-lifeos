# Unify port

Source: `danielmiessler/PAI`, `LifeOS/install/skills/Unify`, commit
`fb9aef4640a73feae4c2e6483b26f58491ce2665`. The member manifest pins that
source; the root [NOTICE.md](../../../NOTICE.md) carries the MIT notice.

The port preserves the Harmonize report, relationship taxonomy, evidence on
both sides, useful tensions, ranked recommendations and read-only boundary.
`Tools/CheckReport.ts` adapts the upstream checker; `Tools/CollectInputs.ts`
adds deterministic Soma source discovery. No model, network or external skill
dependency is required by either tool.

## Omitted upstream integrations

Include this list in the port's PR body:

- Installation-specific system-context discovery and the skill-hygiene gate.
  Local source collection, member tests and pack validation replace them.
- The customization config and system-prompt default scope. Soma skills,
  policy and purpose supply the default sources without first-time setup.
- Mandatory calls to FirstPrinciples, Superior, SystemsThinking and other
  optional thinking skills. Their analysis lenses are self-contained steps.
- Upgrades proposal creation, identity-specific examples and Downloads output.
  Findings remain recommendations; saved output belongs in per-skill memory.

No personal configuration, identity data, credentials or private reports are
copied from upstream or committed by this port.
