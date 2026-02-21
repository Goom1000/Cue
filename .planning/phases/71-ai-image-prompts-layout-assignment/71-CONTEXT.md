# Phase 71: AI Image Prompts + Layout Assignment - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

After scripted import (Phase 70), enrich each slide with an AI-generated `imagePrompt` and `layout` assignment via a single minimal batch call (~700 tokens total). If the AI call fails, slides still import successfully with synthesized fallback prompts. This phase does NOT modify slide content, titles, or speaker notes — only metadata fields.

</domain>

<decisions>
## Implementation Decisions

### Layout selection criteria
- AI only assigns layouts to slides that have the default `split` from the scripted mapper
- Mapper-assigned layouts (`work-together`, `class-challenge`) are locked and not overridden by AI
- AI chooses from a curated subset of 3 visual layouts: `split`, `full-image`, `center-text`
  - `flowchart`, `grid`, `tile-overlap` excluded — these need content structured specifically for them, which scripted slides don't have
- AI receives `hasQuestionFlag` as a hint (question slides may suit `center-text`)
- AI receives `lessonPhase` (Starter/Main/Plenary) as context for layout decisions
- Both hints are lightweight signals, not hard constraints — AI can override

### Fallback behavior
- Fallback image prompts use a richer pattern than the existing gap analysis fallback: `"Educational illustration: {title} — {first bullet}"` (leverages the parsed content scripted slides already have)
- Fallback layout stays as `split` (mapper default) — no heuristic logic, just the reliable universal layout
- Notification on fallback: Claude's discretion
- Partial success handling (e.g., 7/10 valid): Claude's discretion on whether to use partial results or discard the whole batch

### Enrichment scope
- Synchronous execution — batch call blocks import until complete (latency is minimal at ~700 tokens)
- Uses the user's configured AI provider (Claude/Gemini) — consistent with all other AI calls in the app

### Claude's Discretion
- Image prompt detail level and style (match existing pipeline vs richer prompts leveraging scripted context)
- Whether prompts should be age/audience-aware based on year group context
- Whether slides can share image prompts across a topic sequence or each gets a unique one
- Whether to generate image prompts for work-together/class-challenge slides (layout is locked, but they still need images)
- Whether to include theme (color) assignment in the batch call alongside imagePrompt + layout
- Whether to allow minor title cleanup or keep the call strictly metadata-only
- Notification strategy when fallback kicks in (silent vs subtle toast)
- Partial success strategy (use valid enrichments + fallback for bad ones, or all-or-nothing)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusted Claude's recommendations on most decisions, particularly favoring:
- Preserving mapper-assigned layouts as authoritative (structural signals > AI guessing)
- Curated layout subset (split, full-image, center-text) to avoid mismatches with scripted content
- Richer fallback prompts that leverage existing parsed content
- Simple synchronous flow given the tiny token budget

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 71-ai-image-prompts-layout-assignment*
*Context gathered: 2026-02-21*
