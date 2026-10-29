Adapted from LifeOS `Pareto` by Daniel Miessler, `danielmiessler/PAI` at commit `fb9aef4640a73feae4c2e6483b26f58491ce2665` (`LifeOS/install/skills/Pareto/`); MIT license in [NOTICE.md](../../../NOTICE.md).

# Pareto

Map a topic's vital few: the people, sources and ideas that explain most of it,
plus the frontier where thinking is departing from today's mainstream. Treat
"80/20" as a selection heuristic, not a measured share of the whole field.

## 1. Frame the topic

Use the topic and any audience, time range or source restrictions in the request.
For an ambiguous topic, state the likely reading from context; ask only when
there is no reasonable default. Record the research date and scope before the
sweep. A specific factual question belongs to a normal research depth mode;
entity due diligence follows the OSINT routing in `../SKILL.md`.

## 2. Sweep with research's existing agents

Use the agent dispatch pattern in `StandardResearch.md`, with these four lenses:

| Existing agent | Research question |
| --- | --- |
| ClaudeResearcher | Which foundational people, sources and ideas shaped this topic, and what was the past consensus? |
| GeminiResearcher | What is today's mainstream view, and which communities or perspectives does it overlook? |
| GrokResearcher | Who is ahead of or challenging the mainstream, what are they arguing, and what evidence distinguishes their work? |
| PerplexityResearcher | Which recent primary publications, projects or results show the topic's current direction? |

Give each agent the scope, its lens and one focused search query. Ask for up to
three strong candidates rather than a long link list. Each candidate must include
its title, person or project, URL, source publication date (or "unknown"), central
idea, reason it matters and confidence tag. Reach is optional and must carry its
source and observation date; "unknown" is preferable to an invented metric.

Use only the search, fetch and verification capabilities already used by research.
If a named agent is unavailable, assign its lens to an available research agent,
or perform that search directly with the host's existing web search. Name the
actual agents and fallbacks in the report; never imply independent cross-checking
when one researcher covered all lenses. A failed source narrows coverage rather
than aborting the run. Record every failed or unread source.

Finish this step with a deduplicated candidate set and a coverage record. If an
era or frontier claim lacks evidence, allow one focused follow-up round using
the same agents and capabilities, then report the remaining gap.

## 3. Select the vital few

Read the sources carrying the argument and apply `../UrlVerificationProtocol.md`
before retaining their links. Exclude off-topic viral results, download or
activation lures, and claims supported only by inaccessible content. Date era
claims from the publication itself; a crawl date is not a publication date.

Rank qualitatively by relevance first, then explanatory value, evidence of
influence, recency appropriate to the era, and a distinct contribution. Retain
about five to eight sources, fewer if the evidence is thin. Explain each pick;
do not manufacture scores or fill a quota. Separate observed facts from inference
and preserve `[HIGH]`, `[MED]`, `[LOW]` and `[CONFLICT]` tags from research's
cross-check process. Several summaries repeating one original are one source of
evidence, not independent confirmation.

For each frontier thread, name a person or project, their specific claim, a verified,
dated primary source and how it departs from the documented mainstream. Put leads
without that evidence in Coverage and limits as next searches. Seek less prominent
work as well as high-reach sources; novelty, popularity and disagreement alone
do not establish a frontier. Aim for at least two verified source links in that
section. If the evidence cannot support this, label the frontier tentative or
unestablished and name what evidence is missing. When no thread qualifies, say
the frontier is unestablished in both its section and The shift.

## 4. Deliver the map

Return the sections below, keeping each entry tied to retained sources. Include
every section even when its result is "insufficient evidence". End with a summary
of at most five lines: the shift, two or three people or projects worth following
when supported, and the main coverage limitation.

```markdown
# Pareto: <topic>

_<research date> · scope: <scope> · <kept>/<considered> deduplicated sources · researchers/fallbacks: <actual>_

**The shift:** <from past thinking, to current thinking, toward a supported frontier>

## Past meta (<source years, or unknown>)
<Foundational ideas, people and sources; dated citations and confidence tags.>

## Current mainstream meta (<source years, or unknown>)
<Dominant ideas and evidence that they are mainstream; dated citations and confidence tags.>

## Where the forward thinkers are heading
<Person/project, claim, departure from mainstream, dated citation, confidence and uncertainty per thread.>

## Who to follow
| Who | Where (verified link) | Why follow / distinctive contribution |
| --- | --- | --- |

## The vital few
| Rank | Source (verified link) | Person/project | Core idea / why selected | Publication date | Era | Confidence |
| --- | --- | --- | --- | --- | --- | --- |

## Coverage and limits
<Search lenses covered; unavailable agents; failed/unread sources; missing dates or reach; unresolved conflicts; gaps and next search.>
```

Before delivery, check that all sections are present, each era claim has a dated
citation or an explicit evidence gap, and frontier claims explain their departure
from the mainstream. Remove unverifiable links and qualify affected claims.

Save reports and working notes according to the Pareto rule in
[File Organization](../SKILL.md#file-organization), then append the run's entry
as described in [Execution Log](../SKILL.md#execution-log).
