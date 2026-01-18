# Phase 3: Disabled AI State - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Graceful degradation when no API key configured. AI features appear disabled with clear guidance to enable them, while all non-AI functionality remains fully usable. Users can create, edit, and present slides without any API key.

</domain>

<decisions>
## Implementation Decisions

### Disabled appearance
- Buttons grayed out with small lock icon overlay in corner
- Lock overlays existing icon (preserves button identity)
- Brief tooltip on hover: "Add API key in Settings to enable"
- Default pointer cursor (still clickable, triggers modal)

### Enable prompt behavior
- Friendly invitation tone: "Add an API key to unlock AI features!"
- Feature-specific messaging: "To generate slides, add an API key..."
- Single "Open Settings" button (no dismiss option)
- Modal auto-closes when Settings opens

### Feature detection scope
- All AI-powered features disabled (not just generation buttons)
- Invalid/expired API keys treated same as no key (same disabled state)
- API key validity checked on app startup (immediate feedback)
- No persistent header indicator — disabled buttons are sufficient

### Settings guidance
- Brief explanation of what an API key is for newcomers
- Mention that Settings has step-by-step instructions
- Reassure about free tiers: "Many providers offer free tiers to get started"
- Opening Settings auto-focuses the API key input field

### Claude's Discretion
- Exact tooltip wording and positioning
- Lock icon design/size
- Modal styling and animation
- Startup validation timing/loading state

</decisions>

<specifics>
## Specific Ideas

- The disabled state should feel inviting, not restrictive — encourage users to enable AI rather than making them feel locked out
- Keep the modal concise but reassuring — newcomers shouldn't feel overwhelmed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-disabled-ai-state*
*Context gathered: 2026-01-19*
