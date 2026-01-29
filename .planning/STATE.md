# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Students see only the presentation; teachers see the teleprompter script
**Current focus:** v3.7 AI Resource Enhancement — Phase 43 in progress

## Current Position

Phase: 43 of 47 (Types and File Upload)
Plan: 2 of 2 complete
Status: Phase complete
Last activity: 2026-01-29 — Completed 43-02-PLAN.md (upload panel UI)

Progress: [███░░░░░░░] 33%
Pending todos: 8

## Performance Metrics

**Velocity:**
- Milestones shipped: 17 (v1.0 through v3.5)
- Total phases completed: 43
- Total plans completed: 128
- Total LOC: ~20,433 TypeScript

**v3.6 Tooltips & Onboarding (deferred):**
- Phase 41 complete (tour infrastructure)
- Phases 42-44 deferred to future milestone
- Infrastructure preserved for later completion

**Recent Milestones:**
- v3.5: 3 phases, 4 plans, 1 day (2026-01-27)
- v3.4: 2 phases, 5 plans, 8 days (2026-01-26)
- v3.3: 3 phases, 3 plans, 1 day (2026-01-26)
- v3.2: 4 phases, 4 plans, 1 day (2026-01-25)
- v3.1: 2 phases, 3 plans, 1 day (2026-01-25)

## v3.7 Roadmap Summary

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 42 | Student-friendly slide language | SLIDE-01, SLIDE-02, SLIDE-03 | COMPLETE |
| 43 | Resource file upload | UPLOAD-01 to UPLOAD-05 | COMPLETE ✓ |
| 44 | AI document analysis | (foundation) | Next |
| 45 | Enhancement with lesson context | ENHANCE-01 to ENHANCE-06 | |
| 46 | Preview, edit, and trust UI | PREVIEW-01 to PREVIEW-04 | |
| 47 | Export and persistence | EXPORT-01 to EXPORT-03 | |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions for v3.7:
- Use multimodal AI (Gemini/Claude vision) for document analysis, not OCR
- Add mammoth.js for Word support (only new dependency)
- Preserve mode as default to prevent hallucination
- Trust UI (visual diff, edit capability) is critical for teacher adoption
- Default gradeLevel hardcoded to 'Year 6 (10-11 years old)' - UI selector deferred
- Prompt rules apply to slide content only, not speakerNotes (teleprompter remains teacher-facing)
- Rules injected after role description, before mode-specific CRITICAL rules
- Variant slides use hardcoded gradeLevel since they don't receive GenerationInput
- Use existing pdf.js CDN (already loaded) instead of npm installing pdfjs-dist
- DOCX page count estimated from character count (~3000 chars/page)
- Document processors organized in services/documentProcessors/ directory
- UploadPanel always visible in sidebar (not conditional)
- Upload errors routed through existing onError callback

### Pending Todos

See `.planning/todos/pending/` — run `/gsd:check-todos` to review

### Blockers/Concerns

None identified yet for v3.7.

## Session Continuity

Last session: 2026-01-29
Stopped at: Completed 43-02-PLAN.md (phase 43 complete)
Resume file: None

**Next step:** `/gsd:discuss-phase 44` to begin AI document analysis phase

---
*State initialized: 2026-01-18*
*Last updated: 2026-01-29 — Completed 43-02-PLAN.md (upload panel UI)*
