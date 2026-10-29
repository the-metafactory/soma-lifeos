# Strip Pulse and voice-server calls from the pack (node #29)

Remove local notification blocks from art, interview, media, OSINT and scraping. Media delegates static visual requests to the pack's art skill and keeps Remotion for video. Drop media's bundled Art copy and the capabilities used only by the removed integrations. The pack checker rejects either retired endpoint anywhere under skills, with file and line diagnostics.

## Source Art differences for principal review

Compared all 38 files in soma-home's `skills/media/Art/` against every file under the pack's `skills/art/`, using byte equality before these edits. Nine files have byte-identical counterparts; the 29 below do not. The source Examples directory is present in soma-home but was already absent from this pack. Paths below are relative to soma-home. No source content or example image was merged into art.

Endpoint-only differences are listed for completeness; those removed integrations do not need a content decision. For the remaining entries, the principal decides whether any omitted source content merits separate work.

| Source path | What art lacks or how it differs |
| --- | --- |
| `skills/media/Art/Examples/human-linear-form.png` | Art has no counterpart for this human line-form reference image. |
| `skills/media/Art/Examples/human-linear-style2.png` | Art has no counterpart for this second human line-style reference image. |
| `skills/media/Art/Examples/setting-line-style.png` | Art has no counterpart for this setting line-style reference image. |
| `skills/media/Art/Examples/setting-line-style2.png` | Art has no counterpart for this second setting line-style reference image. |
| `skills/media/Art/SKILL.md` | Art lacks the older router wording and customization paths; its current router adds workflow and transparency rules. |
| `skills/media/Art/Tools/Generate.ts` | Art lacks the older generator variant using remove.bg; its current variant uses local rembg and adds models and comparison mode. |
| `skills/media/Art/Tools/GeneratePrompt.ts` | Art lacks the source character wording and older aesthetic-file path; the character text and paths have drifted. |
| `skills/media/Art/Tools/bun.lock` | Art lacks this older dependency resolution (including Google GenAI 1.40.0); its lockfile resolves newer versions. |
| `skills/media/Art/Workflows/AdHocYouTubeThumbnail.md` | Art lacks the source Headshot skill paths and reference names; its headshot instructions use placeholders and a different background-removal path. |
| `skills/media/Art/Workflows/AnnotatedScreenshots.md` | Art has the same workflow body apart from the retired notification endpoint; no unique workflow content is missing. |
| `skills/media/Art/Workflows/Aphorisms.md` | Art has the same workflow body apart from the retired notification endpoint; no unique workflow content is missing. |
| `skills/media/Art/Workflows/Comics.md` | Art has the same workflow body apart from the retired notification endpoint; no unique workflow content is missing. |
| `skills/media/Art/Workflows/Comparisons.md` | Art has the same workflow body apart from the retired notification endpoint; no unique workflow content is missing. |
| `skills/media/Art/Workflows/CreatePAIPackIcon.md` | Art has the same workflow body apart from the retired notification endpoint; no unique workflow content is missing. |
| `skills/media/Art/Workflows/D3Dashboards.md` | Art has the same workflow body apart from the retired notification endpoint; no unique workflow content is missing. |
| `skills/media/Art/Workflows/EmbossedLogoWallpaper.md` | Art lacks the source variable-based logo, style-reference and output paths; its version uses different local paths and generic brand wording. |
| `skills/media/Art/Workflows/Essay.md` | Art lacks the earlier essay prompt and signature procedure; its version adds model-specific prompting, transparency and composition rules. |
| `skills/media/Art/Workflows/Frameworks.md` | Art has the same workflow body apart from the retired notification endpoint; no unique workflow content is missing. |
| `skills/media/Art/Workflows/Maps.md` | Art has the same workflow body apart from the retired notification endpoint; no unique workflow content is missing. |
| `skills/media/Art/Workflows/Mermaid.md` | Art lacks the source Images/BackgroundRemoval reference and older removal-tool path; its version points to a different removal tool. |
| `skills/media/Art/Workflows/RecipeCards.md` | Art has the same workflow body apart from the retired notification endpoint; no unique workflow content is missing. |
| `skills/media/Art/Workflows/RemoveBackground.md` | Art lacks the remove.bg API workflow and its parameters; its version uses local rembg. |
| `skills/media/Art/Workflows/Stats.md` | Art has the same workflow body apart from the retired notification endpoint; no unique workflow content is missing. |
| `skills/media/Art/Workflows/Taxonomies.md` | Art has the same workflow body apart from the retired notification endpoint; no unique workflow content is missing. |
| `skills/media/Art/Workflows/TechnicalDiagrams.md` | Art lacks the exact source generation-tool path and simpler diagram rules; its version adds contrast and title rules. |
| `skills/media/Art/Workflows/Timelines.md` | Art has the same workflow body apart from the retired notification endpoint; no unique workflow content is missing. |
| `skills/media/Art/Workflows/ULWallpaper.md` | Art has no byte-identical counterpart under any path; LogoWallpaper.md is a drifted branded-wallpaper alternative. |
| `skills/media/Art/Workflows/Visualize.md` | Art lacks the source Images/BackgroundRemoval reference and older removal-tool path; its version points to a different removal tool. |
| `skills/media/Art/Workflows/YouTubeThumbnailChecklist.md` | Art lacks the source generic headshot-reference wording; its version points to HeadshotExamples/. |

## Validation

- Both endpoint fixtures failed before the guard (expected exit 1, received 0), then passed with exact file and line diagnostics.
- `bun test test/ && bun scripts/check-pack.ts` is the required final host gate.
- `git grep -nE 'localhost:(31337|8888)' -- skills` must print nothing.
