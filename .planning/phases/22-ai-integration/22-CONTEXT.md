# Phase 22: AI Integration - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

AI generates game-specific questions from lesson content with appropriate difficulty progression. Teachers trigger generation on-demand, select difficulty presets, and receive questions formatted for each game type. Editing questions, saving question banks, and manual question creation are separate concerns.

</domain>

<decisions>
## Implementation Decisions

### Generation trigger & input
- Input source: Current slide content + all previous slides in presentation (cumulative context)
- Trigger: On-demand when teacher clicks generate button (not pre-generated)
- Optional prompt field: Teacher can add context hints ("focus on vocabulary", "avoid dates")
- No preview of extracted content — teacher clicks, questions generate directly

### Difficulty control
- UI: Simple presets (Easy/Medium/Hard) — intuitive three-tier system
- Millionaire progression: Fixed easy→hard progression (classic Millionaire style, no teacher override)
- Chase/Beat the Chaser: Teacher-selected difficulty level, all questions match that level consistently
- Difficulty manifests through question complexity (Easy = recall facts, Hard = apply/analyze concepts)

### Game-specific formatting
- No preview before game — questions generate and game starts immediately
- Question count: Match game needs exactly (Millionaire: 3/5/10 per selection, Chase: appropriate count for rapid-fire)
- Answer formats: Game-specific (not always 4-option multiple choice)

### Error handling & regeneration
- Mid-game bad question: Regenerate this question button (brief loading, new question for same slot)
- Generation failure: Auto-retry silently 2-3 times before showing error
- After retries exhausted: Show clear error message, offer retry button

### Claude's Discretion
- Loading indicator style during generation (spinner, progress, skeleton cards)
- Handling thin slide content (fewer questions, warning, or graceful adaptation)
- Specific question formats per game type (true/false for rapid-fire, open-ended for Cash Builder, etc.)
- Number of questions for Chase/Beat the Chaser rapid-fire rounds

</decisions>

<specifics>
## Specific Ideas

- Cumulative slide context means later slides can reference concepts from earlier slides
- Easy/Medium/Hard maps to educational Bloom's taxonomy levels (remember → understand → apply/analyze)
- "Classic Millionaire style" progression is non-negotiable — early questions should feel like warm-ups

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-ai-integration*
*Context gathered: 2026-01-23*
