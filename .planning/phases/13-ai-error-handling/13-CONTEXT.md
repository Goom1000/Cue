# Phase 13: AI Error Handling - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Graceful failure handling when AI slide revision encounters errors. Users see clear feedback instead of app crashes, with the ability to understand what went wrong and try again. Creating new error types, logging infrastructure, or expanding AI capabilities are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Error message style
- Neutral and professional tone (not casual/friendly)
- Mention "AI" specifically in messages — users know they're using AI revision
- Claude's discretion on technical detail level and whether to include help links

### Error display location
- Toast notification for all errors (non-blocking)
- Auto-dismiss after 5 seconds, user can dismiss early
- Claude's discretion on toast position and whether to include retry button in toast

### Retry behavior
- System automatically retries 1-2 times silently before showing error to user
- Claude's discretion on: when to offer manual retry, retry limits, loading state during retry

### Error differentiation
- Different error types get different messages (network, rate limit, parse error each unique)
- Error messages include actionable hints ("Check your internet", "Wait a moment")
- Rate limit errors show specific wait time if API provides it
- Parse errors (malformed AI response) distinguished from service errors

### Claude's Discretion
- Toast positioning (top-right, bottom-center, etc.)
- Whether to include retry button directly in toast
- Technical detail level in error messages
- Whether/when to include help links
- Manual retry availability based on error type
- Retry attempt limits
- Loading state indicator during retry operations

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches that fit the neutral/professional tone.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-ai-error-handling*
*Context gathered: 2026-01-20*
