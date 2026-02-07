# Requirements: Cue v4.0 Clipboard Builder

**Defined:** 2026-02-02
**Core Value:** Students see only the presentation; teachers see the teleprompter script

## v4.0 Requirements

Requirements for Clipboard Builder milestone. Each maps to roadmap phases.

### Clipboard Paste

- [x] **CLIP-01**: User can paste slide content from PowerPoint via Ctrl+V/Cmd+V
- [x] **CLIP-02**: AI analyzes pasted content and generates improved Cue-style slide
- [x] **CLIP-03**: User can paste into specific position in deck (not just append)
- [x] **CLIP-04**: Visual loading indicator shows during paste processing
- [x] **CLIP-05**: "Paste Slide" button available for discoverability
- [x] **CLIP-06**: Before/after comparison shows what AI changed from pasted content

### Image Handling

- [x] **IMG-01**: User can paste images from clipboard (screenshots, copied images)
- [x] **IMG-02**: "Full Image" layout option in tile selector (image only, no text)
- [x] **IMG-03**: Pasted image displays as slide background/full bleed
- [x] **IMG-04**: User can drag-drop images onto existing slides
- [x] **IMG-05**: AI can generate caption for pasted/dropped images

### Deck Cohesion

- [x] **COHE-01**: "Make Cohesive" button available in editor toolbar
- [x] **COHE-02**: AI analyzes entire deck for tone and flow consistency
- [x] **COHE-03**: Preview panel shows proposed changes before applying
- [x] **COHE-04**: User can apply or cancel cohesion changes

### Gap Analysis

- [x] **GAP-01**: User can upload lesson plan PDF after deck is built
- [x] **GAP-02**: AI compares deck content against lesson plan
- [x] **GAP-03**: Gap list shows missing topics/content from lesson plan
- [x] **GAP-04**: Each gap has severity ranking (critical, recommended, nice-to-have)
- [x] **GAP-05**: AI suggests slide content for each identified gap
- [x] **GAP-06**: One-click button generates suggested slide from gap

## Future Requirements (v4.1+)

Deferred to future release. Tracked but not in current roadmap.

### Cohesion Enhancements

- **COHE-05**: Highlight which specific slides will change in preview
- **COHE-06**: Per-slide accept/reject for cohesion suggestions

### Integration

- **INT-01**: Paste multiple slides at once from PowerPoint
- **INT-02**: Preserve animations/transitions from pasted content

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Auto-monitor clipboard in background | Privacy concern, unexpected behavior |
| Paste .pptx files directly | That's file upload, not clipboard paste |
| Real-time collaborative editing | Complexity, no backend |
| Undo/redo history for cohesion | Adds significant state complexity |
| Video paste support | Storage/bandwidth concerns |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLIP-01 | 55 | Complete |
| CLIP-02 | 56 | Complete |
| CLIP-03 | 55 | Complete |
| CLIP-04 | 55 | Complete |
| CLIP-05 | 55 | Complete |
| CLIP-06 | 56 | Complete |
| IMG-01 | 57 | Complete |
| IMG-02 | 57 | Complete |
| IMG-03 | 57 | Complete |
| IMG-04 | 57 | Complete |
| IMG-05 | 57 | Complete |
| COHE-01 | 58 | Complete |
| COHE-02 | 58 | Complete |
| COHE-03 | 58 | Complete |
| COHE-04 | 58 | Complete |
| GAP-01 | 59 | Complete |
| GAP-02 | 59 | Complete |
| GAP-03 | 59 | Complete |
| GAP-04 | 59 | Complete |
| GAP-05 | 59 | Complete |
| GAP-06 | 59 | Complete |

**Coverage:**
- v4.0 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-07 - Phase 59 complete (GAP-01 through GAP-06) — all v4.0 requirements delivered*
