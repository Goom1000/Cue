# Phase 34: Deck-wide Verbosity Toggle - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Allow users to change verbosity level for the entire presentation with controlled regeneration. Single deck-wide selector replaces per-slide selector. Includes confirmation dialog, progress indicator, and graceful error handling. Persistence of deck verbosity is Phase 35.

</domain>

<decisions>
## Implementation Decisions

### Selector location & behavior
- Deck-wide selector replaces the existing per-slide verbosity selector in teleprompter panel
- Selector reflects current deck verbosity level when presentation loads
- Selecting the same level (e.g., Standard → Standard) does nothing — no dialog, no regeneration
- All per-slide verbosity caches are cleared when deck-wide level changes

### Confirmation dialog
- Informative, neutral tone
- Show slide count: "This will regenerate all 12 slides at Detailed verbosity."
- Button labels: "Regenerate" (confirm) / "Cancel" (dismiss)
- Mention target verbosity level in the message

### Regeneration progress
- Per-slide progress: "Regenerating slide 3 of 12..." with visible counter
- User can cancel mid-regeneration
- If cancelled, rollback everything — restore all slides to pre-regeneration state
- Selector is disabled during regeneration (block double-trigger)

### Edge cases
- If slide fails: retry once, then skip and continue
- If slides fail after retry: offer "Retry failed slides" option
- Selector blocked during regeneration — can't trigger another

### Claude's Discretion
- Progress indicator style (full-screen overlay vs inline banner)
- Failure summary UI (how to display which slides failed)
- Exact rollback mechanism implementation

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-deck-wide-verbosity*
*Context gathered: 2026-01-25*
