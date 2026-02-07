# Phase 57: Image Paste - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can paste images directly (screenshots, copied images) and have them display as full-slide visuals. Includes drag-drop onto existing slides, a "Full Image" layout option in the tile selector, and optional AI-generated captions for teleprompter. Deck cohesion and gap analysis are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Paste behavior
- Pasting an image shows a prompt asking "Add as new slide" or "Replace current slide's image"
- This applies to all image pastes (screenshots, copied images from clipboard)
- Prompt style is Claude's discretion (inline toast vs modal — fit existing design language)

### Drag-drop behavior
- Claude's discretion on exact drag-drop UX
- Should feel intuitive — likely: drop on slide = replace, drop between/empty = new slide
- Same "ask" pattern from paste may or may not apply — Claude decides based on context

### Replace scope
- When replacing a slide's image, Claude decides whether to keep existing text content or wipe to Full Image layout
- Decision should be based on what makes sense for the layout system

### Full Image layout
- Available as a layout option for ANY slide, not just pasted images
- Teachers can select "Full Image" in the tile selector even on slides created from scratch
- If selected on a slide with no image yet, Claude decides the empty state (placeholder vs file picker)
- Text overlay behavior is Claude's discretion (likely pure image, consistent with Phase 56 pasted slides)
- Tile selector icon/thumbnail design is Claude's discretion — should be visually distinct from text layouts

### AI caption generation
- Caption content: image description + teaching-oriented talking points (both)
- Example: "This diagram shows the water cycle. Key points: evaporation, condensation, precipitation."
- Caption appears in teleprompter notes
- Caption is editable — teacher can modify, add their own notes, fix inaccuracies
- Trigger (automatic vs on-demand) is Claude's discretion
- Whether to reuse Phase 56 analyzePastedSlide pipeline or use a lighter-weight caption call is Claude's discretion

### Image formats
- Support all web-safe formats: PNG, JPEG, WebP, GIF, SVG
- Anything a browser can render as an image

### Claude's Discretion
- Prompt UI style for paste action (toast vs modal vs other)
- Drag-drop interaction pattern
- Replace behavior (keep text vs wipe)
- Full Image empty state when no image exists
- Text overlay on Full Image slides (likely none, matching Phase 56)
- Tile selector icon design
- AI caption trigger (auto vs on-demand)
- AI pipeline choice (reuse Phase 56 vs lighter-weight)
- Multi-image paste handling
- Image size limits and compression strategy
- Paste routing (smart content-type detection vs separate actions)

</decisions>

<specifics>
## Specific Ideas

- Caption should combine description + teaching tips: "This diagram shows X. Key points to cover: Y, Z" — helps teacher know what to say about the image
- Full Image layout should work for any slide, not just pasted ones — teachers building from scratch should be able to create image-only slides
- Phase 56 established the pattern: pasted slides show original image full-screen with no text overlay, AI content drives teleprompter only. Full Image layout should follow this same philosophy.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 57-image-paste*
*Context gathered: 2026-02-07*
