# Roadmap: Cue v4.1 Script Mode (Share with Colleague)

## Overview

Transform Cue's teleprompter-driven presentations into standalone teaching materials that any colleague can deliver without the app. The journey starts with the core value proposition -- AI text transformation that converts progressive-disclosure teleprompter scripts into expanded, self-contained talking-point bullets -- then builds PPTX export (the primary delivery format), wires it all together with a ShareModal UI featuring preview and progress, and finishes with PDF export as a secondary format option.

## Milestones

- ✅ **v4.0 Clipboard Builder** - Phases 55-60 (shipped 2026-02-07)
- 🚧 **v4.1 Script Mode** - Phases 61-64 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (61, 62, 63, 64): Planned milestone work
- Decimal phases (e.g., 62.1): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 61: AI Transformation Service** - AI converts teleprompter scripts into expanded talking-point bullets
- [x] **Phase 62: PPTX Export** - Script-version slides export as PowerPoint with images and expanded text
- [x] **Phase 63: Share Modal UI** - Teacher-facing share dialog with progress, preview, and download
- [ ] **Phase 64: PDF Export** - Script-version slides export as readable PDF with images and talking points

## Phase Details

### Phase 61: AI Transformation Service
**Goal**: Teachers' teleprompter scripts are transformed by AI into expanded, self-contained talking-point bullets suitable for a colleague to read and deliver
**Depends on**: Nothing (first phase)
**Requirements**: TRANSFORM-01, TRANSFORM-02, TRANSFORM-03, TRANSFORM-04, TRANSFORM-05, TRANSFORM-06
**Success Criteria** (what must be TRUE):
  1. Given a slide with teleprompter content, AI produces 4-7 expanded talking-point bullets that preserve teaching examples, analogies, and interaction cues
  2. A batch of slides is processed with deck-level context so bullet content flows coherently across slides without repetition
  3. Special slide types (pasted slides with image-only content, Work Together, Class Challenge) produce appropriate transformed output rather than errors or empty bullets
  4. Both Gemini and Claude providers can perform the transformation, producing comparable quality output
  5. The correct teleprompter text is resolved from the verbosity cache based on the deck's active verbosity setting before transformation
**Plans**: 2 plans

Plans:
- [x] 61-01-PLAN.md -- Transformation prompt module, types, schemas, and helpers
- [x] 61-02-PLAN.md -- GeminiProvider and ClaudeProvider implementations

### Phase 62: PPTX Export
**Goal**: Teachers can download a PowerPoint file containing their slides with expanded talking-point bullets and images, laid out to prevent text overflow
**Depends on**: Phase 61
**Requirements**: PPTX-01, PPTX-02, PPTX-03, PPTX-04, PPTX-05
**Success Criteria** (what must be TRUE):
  1. User can trigger PPTX export and receive a downloaded .pptx file that opens in PowerPoint with all slides present
  2. Each exported slide shows the slide image alongside expanded talking-point bullets in a layout that does not overflow or clip text (16-18pt font, dedicated script-mode layout)
  3. Slide titles are visible in the export for topic orientation
  4. The downloaded filename includes the deck title and a "Script Version" suffix
**Plans**: 1 plan

Plans:
- [x] 62-01-PLAN.md -- Script-mode PPTX export function with dedicated layout

### Phase 63: Share Modal UI
**Goal**: Teachers have a complete share workflow -- click a button, see transformation progress, preview the script version, and download in their chosen format
**Depends on**: Phase 61, Phase 62
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. A "Share with colleague" button is visible and accessible from the editor page
  2. The share dialog shows real-time progress during AI transformation ("Transforming slides X of Y...")
  3. After transformation completes, teacher can scroll through a preview of script-version slides before downloading
  4. Teacher can choose between PPTX and PDF export formats and the file downloads automatically with no cloud or account steps
  5. If transformation or export fails, the teacher sees a clear error message via toast notification
**Plans**: 1 plan

Plans:
- [x] 63-01-PLAN.md -- onProgress callback, ShareModal component, and App.tsx wiring

### Phase 64: PDF Export
**Goal**: Teachers can download a PDF version of the script-mode deck with readable text and images in a print-friendly layout
**Depends on**: Phase 61, Phase 63
**Requirements**: PDF-01, PDF-02, PDF-03
**Success Criteria** (what must be TRUE):
  1. User can select PDF format in the share dialog and receive a downloaded PDF file
  2. Text in the PDF is crisp and readable (vector text rendering, not blurry rasterized screenshots)
  3. Each page presents the slide image alongside expanded talking points in a clean, print-friendly layout
**Plans**: 1 plan

Plans:
- [ ] 64-01-PLAN.md -- exportScriptPdf function and ShareModal PDF wiring

## Progress

**Execution Order:**
Phases execute in numeric order: 61 -> 62 -> 63 -> 64

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 61. AI Transformation Service | 2/2 | Complete | 2026-02-08 |
| 62. PPTX Export | 1/1 | Complete | 2026-02-08 |
| 63. Share Modal UI | 1/1 | Complete | 2026-02-08 |
| 64. PDF Export | 0/1 | Not started | - |
