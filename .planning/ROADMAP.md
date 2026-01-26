# Roadmap: Cue v3.4 Ask AI

**Milestone:** v3.4 Ask AI
**Goal:** Teachers can ask AI anything during a presentation without leaving the app
**Phases:** 36-37 (continues from v3.3)

## Phase Overview

| Phase | Name | Goal | Requirements | Complexity |
|-------|------|------|--------------|------------|
| 36 | Core Ask AI | Working AI assistant with input, streaming, context, quick actions | CHAT-01 to CHAT-05, CTXT-01 to CTXT-03, UX-01 to UX-03 | MEDIUM |
| 37 | History & Keyboard | Session history and keyboard shortcuts | HIST-01 to HIST-03, KEY-01 to KEY-03 | LOW |

---

## Phase 36: Core Ask AI

**Goal:** Teacher can ask AI questions during presentation and get contextual, streaming responses

**Plans:** 4 plans

Plans:
- [x] 36-01-PLAN.md — Provider interface and context types
- [x] 36-02-PLAN.md — Gemini streaming implementation
- [x] 36-03-PLAN.md — Claude SSE streaming implementation
- [x] 36-04-PLAN.md — Ask AI panel UI and integration

### Requirements Covered

- CHAT-01: Text input field in teleprompter panel
- CHAT-02: Streaming response display
- CHAT-03: Loading indicator
- CHAT-04: Copy to clipboard
- CHAT-05: Error handling with retry
- CTXT-01: Lesson context injection
- CTXT-02: Age-appropriate responses
- CTXT-03: Quick action buttons
- UX-01: Inline panel (not modal)
- UX-02: Teacher-only visibility
- UX-03: Privacy indicator

### Success Criteria

1. Teacher types question in teleprompter panel, presses Enter or clicks Send
2. "Thinking..." indicator appears within 200ms
3. Response streams character-by-character (smooth animation)
4. Response displays current slide context (mentions slide topic)
5. Quick action buttons ("Get 3 facts", "Explain simply", "Answer question") populate input
6. Copy button copies response text, shows "Copied" feedback
7. Errors show friendly message with "Try again" button
8. Panel does not steal focus from presentation navigation
9. Student view shows no trace of assistant
10. "Not visible to students" indicator visible in panel

### Technical Notes

- Extend `AIProviderInterface` with `streamChat(context, message)` method
- Implement in both Claude and Gemini providers
- Add `buildChatContext()` helper to construct context from slides
- Use streaming API for response (mandatory for UX)
- Render inline in existing teleprompter panel layout
- No BroadcastChannel sync (teacher-only)

### Estimated Scope

~230 lines across 5 files:
- `services/aiProvider.ts` — types, interface, helper (~30 lines)
- `services/geminiService.ts` — implementation (~40 lines)
- `services/providers/geminiProvider.ts` — wrapper (~10 lines)
- `services/providers/claudeProvider.ts` — implementation (~50 lines)
- `components/PresentationView.tsx` — state, handler, UI (~100 lines)

---

## Phase 37: History & Keyboard

**Goal:** Session history for reference and keyboard shortcuts for quick access

**Plans:** 1 plan

Plans:
- [ ] 37-01-PLAN.md — History state, keyboard shortcuts, and history UI

### Requirements Covered

- HIST-01: Session history persistence
- HIST-02: Scrollable history view
- HIST-03: Clear history button
- KEY-01: Cmd/Ctrl+K shortcut
- KEY-02: Escape returns focus
- KEY-03: Arrow keys navigate slides

### Success Criteria

1. Q&A entries accumulate in session history during presentation
2. Clicking "History" shows scrollable list of previous Q&A
3. Clear button removes all history entries
4. Cmd/Ctrl+K focuses chat input from anywhere
5. Escape key blurs chat input and returns focus to presentation
6. Arrow keys never captured by chat input (always navigate slides)
7. History survives slide navigation within session
8. History clears when presentation closed/reloaded

### Technical Notes

- Add `assistantHistory` state array to PresentationView
- History dropdown/toggle UI below input
- Use `useEffect` for global keyboard shortcut listener
- Careful focus management: explicit focus zones

### Estimated Scope

~80 lines:
- History state and dropdown UI (~50 lines)
- Keyboard shortcut handler (~30 lines)

---

## Milestone Success Criteria

When v3.4 is complete, teacher can:

1. Press Cmd+K during presentation to open AI assistant
2. Type "What are 3 facts about tiger diet?" and get streaming response
3. Click quick action button to populate common questions
4. Copy response to clipboard for use elsewhere
5. See previous Q&A in session history
6. Continue navigating slides while AI responds
7. Trust that students never see the assistant

---

*Roadmap created: 2026-01-26*
*Last updated: 2026-01-26 — Phase 37 planned*
