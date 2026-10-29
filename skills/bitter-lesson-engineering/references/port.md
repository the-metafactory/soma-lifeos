# Port notes

Source: `danielmiessler/PAI`, `LifeOS/install/skills/BitterLessonEngineering`, commit `fb9aef4640a73feae4c2e6483b26f58491ce2665`. The root `NOTICE.md` carries the upstream MIT notice.

The source member contains `SKILL.md`, `Intents/Audit.md` and `Intents/QuickCheck.md`, with no executable tools. This port combines the single-file workflow and judgment rubric in one entry file. It needs only the invoking agent's file-reading capability; it has no model-service dependency, network operation, secrets or persistent state.

## Omitted upstream features

- Automatic discovery and auditing of the host's startup sources, native settings, installed skill listing and recursively imported instructions: the user selects every target explicitly.
- Host-specific doctrine links, dated internal evaluation anecdotes, retired configuration guidance and integration with an external drift scanner: the portable rubric stands on its own.
- Separate Audit and QuickCheck routers and nonbinary verdict categories: every inventoried rule receives CUT or KEEP, with optional secondary suggestions.
- Full-system token-consumption and savings estimates: this port reports auditable source coverage and verdict counts without claiming measured token savings.

No personal configuration or identifying material from the upstream environment is bundled.
