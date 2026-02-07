---
phase: 59-gap-analysis
plan: 02
subsystem: ai-providers
tags: [claude, gap-analysis, react-component, tool-choice, multimodal]
dependency-graph:
  requires:
    - "59-01 (gap analysis prompts, schemas, types)"
  provides:
    - "Claude analyzeGaps and generateSlideFromGap methods"
    - "GapAnalysisPanel UI component for gap list display"
  affects:
    - "59-03 (App.tsx integration wires panel + provider calls)"
tech-stack:
  added: []
  patterns:
    - "Claude tool_choice for structured gap analysis output"
    - "Fixed-position side panel pattern with severity sorting"
key-files:
  created:
    - components/GapAnalysisPanel.tsx
  modified:
    - services/providers/claudeProvider.ts
decisions:
  - decision: "Teal/emerald gradient for gap Add Slide buttons"
    rationale: "Visually distinct from cohesion purple and standard indigo actions"
  - decision: "Panel uses fixed positioning with w-80 width"
    rationale: "Consistent with side panel patterns; does not displace main content"
metrics:
  duration: "~3 minutes"
  completed: "2026-02-07"
---

# Phase 59 Plan 02: Claude Provider Gap Analysis + Panel Component Summary

Claude provider dual-method gap analysis (multimodal analyzeGaps with tool_choice analyze_gaps, generateSlideFromGap with tool_choice generate_gap_slide) and GapAnalysisPanel React component with severity-sorted gap list, coverage bar, expandable previews, and loading states.

## Performance

- 2 tasks, 2 commits
- Zero TypeScript errors throughout
- Both Gemini (from Plan 01) and Claude now implement all AIProviderInterface methods

## Accomplishments

### Task 1: Claude analyzeGaps and generateSlideFromGap
- Added `analyzeGaps` method to ClaudeProvider: builds multimodal content array (text + up to 5 base64 page images), POSTs to Claude API with `tool_choice: { type: 'tool', name: 'analyze_gaps' }`, extracts structured result from tool_use response
- Added `generateSlideFromGap` method: builds prompt with gap details + deck context + lesson topic, uses `GAP_SLIDE_TOOL` for structured single-slide output, returns Slide with `source: { type: 'ai-generated' }`
- Imported `GAP_ANALYSIS_SYSTEM_PROMPT`, `buildGapAnalysisUserPrompt`, `buildGapAnalysisContext`, `GAP_ANALYSIS_TOOL`, `buildGapSlideGenerationPrompt`, `GAP_SLIDE_TOOL` from gapAnalysisPrompts
- Imported `GapAnalysisResult` and `IdentifiedGap` types from aiProvider
- Both methods follow the established Claude fetch + tool_use extraction + AIProviderError pattern from makeDeckCohesive

### Task 2: GapAnalysisPanel Component
- Created `GapAnalysisPanel.tsx` as a fixed-position right-side panel (`fixed top-0 right-0 h-full w-80 z-50`)
- Severity badges with colored pills: red (critical), amber (recommended), gray (nice-to-have)
- Summary banner in teal showing AI coverage assessment text
- Coverage progress bar with color gradient (green >= 80%, amber >= 50%, red < 50%)
- Gap count summary with colored dots per severity category
- Each gap card shows: severity badge, topic title, description, lesson plan excerpt quote, expandable suggested content preview (first 3 bullets), position hint, and Add Slide button
- Add Slide button uses teal/emerald gradient (distinct from cohesion purple), shows spinner + "Generating..." when `generatingGapId` matches, disabled when any gap is generating
- Expandable suggested content uses local `expandedGaps: Set<string>` state
- Footer with Re-analyze button and "Results may be outdated" hint
- Empty state: success message with checkmark icon and coverage percentage when no gaps found

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Claude analyzeGaps and generateSlideFromGap | a084dba | services/providers/claudeProvider.ts |
| 2 | GapAnalysisPanel component | 129482f | components/GapAnalysisPanel.tsx |

## Files

**Created:**
- `components/GapAnalysisPanel.tsx` - Side panel component for gap list display (303 lines)

**Modified:**
- `services/providers/claudeProvider.ts` - Added analyzeGaps + generateSlideFromGap methods (+158 lines)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Teal/emerald gradient for gap slide buttons | Distinct from cohesion purple and standard indigo; establishes gap analysis visual identity |
| Fixed-position w-80 panel overlaying content | Consistent with common side panel UX; does not require layout restructuring |
| Coverage bar color varies by percentage | Green/amber/red provides instant visual feedback on coverage quality |
| Show max 3 suggested content bullets in preview | Keeps cards compact while showing enough to evaluate relevance |

## Deviations from Plan

None - plan executed exactly as written.

## Issues & Risks

None.

## Next Phase Readiness

Plan 03 can proceed immediately. It has:
- Both providers (Gemini + Claude) implementing `analyzeGaps` and `generateSlideFromGap`
- `GapAnalysisPanel` component ready for integration into App.tsx
- All types (`GapAnalysisResult`, `IdentifiedGap`, `GapSeverity`) exported from aiProvider.ts

Plan 03 needs to:
1. Wire PDF upload + text extraction for lesson plans in App.tsx
2. Connect `analyzeGaps` call to a "Find Gaps" button
3. Render `GapAnalysisPanel` with state management
4. Implement `onAddSlide` handler calling `generateSlideFromGap` and inserting at suggested position

## Self-Check: PASSED
