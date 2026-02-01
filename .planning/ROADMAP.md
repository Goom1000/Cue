# Roadmap: Cue v3.8 Preserve Teacher Content

**Milestone:** v3.8
**Goal:** Ensure AI-generated slides preserve specific questions, activities, and instructions from lesson plans verbatim rather than generalizing them.
**Phases:** 48-50 (3 phases)
**Depth:** Comprehensive
**Created:** 2026-02-01

## Overview

This milestone teaches the AI to distinguish between content that should be transformed (explanatory text) and content that must be preserved verbatim (teacher-specified questions, activities, and instructions). The solution is prompt engineering with heuristic detection, not architectural changes. Teachers upload lesson plans containing "What is 3/4 of 12?" and that exact question appears on slides and in the teleprompter, not a generalized "practice fractions."

## Phases

### Phase 48: Detection and Rules Foundation

**Goal:** Build the detection patterns and prompt rules that identify preservable content before AI processing.

**Dependencies:** None (foundation phase)

**Plans:** 3 plans

Plans:
- [ ] 48-01-PLAN.md — Detection module with types and regex patterns for questions/activities
- [ ] 48-02-PLAN.md — Prompt rules module with XML tags and few-shot examples
- [ ] 48-03-PLAN.md — Unit tests verifying all DET requirements

**Requirements:**
- DET-01: Detect questions by punctuation (sentences ending with `?`)
- DET-02: Detect questions by context ("Ask:", "Ask students:", question-related headings)
- DET-03: Detect activities by instructional language (action verbs like "list", "discuss", "complete")
- DET-04: Detection works on lesson plan PDF input
- DET-05: Detection works on PowerPoint input (Refine/Blend modes)

**Success Criteria:**
1. Detector identifies sentences ending in `?` as questions regardless of surrounding context
2. Detector identifies "Ask:" prefixed content and question-heading patterns as questions
3. Detector identifies instructional action verbs ("list 3 examples", "discuss in pairs") as activities
4. Detection produces consistent results for identical PDF content across multiple runs
5. Detection extracts preservable content from PowerPoint text fields in Refine/Blend modes

**Delivers:**
- `services/contentPreservation/detector.ts` with regex patterns
- `services/prompts/contentPreservationRules.ts` with XML tag format and few-shot examples
- Test fixtures with detection scenarios

---

### Phase 49: Provider Integration and Preservation

**Goal:** Integrate preservation rules into both AI providers so preserved content appears verbatim in slides and teleprompter.

**Dependencies:** Phase 48 (detection patterns and rules must exist)

**Plans:** (created by /gsd:plan-phase)

**Requirements:**
- PRES-01: Preserved questions appear verbatim on slides
- PRES-02: Preserved questions appear in teleprompter with delivery context
- PRES-03: Preserved activities appear verbatim on slides
- PRES-04: Preserved activities appear in teleprompter with delivery context
- PRES-05: Preservation works in Fresh mode (lesson plan only)
- PRES-06: Preservation works in Refine mode (existing presentation)
- PRES-07: Preservation works in Blend mode (lesson + presentation)

**Success Criteria:**
1. Teacher uploads lesson with "What would happen if we removed all the bees?" and slide shows exact question text
2. Teleprompter for preserved question includes the exact question plus delivery guidance ("Ask the class:")
3. Teacher uploads lesson with "In pairs, list 3 examples of renewable energy" and slide shows exact instruction
4. Teleprompter for preserved activity includes the exact instruction plus facilitation context
5. Fresh mode (lesson PDF only) preserves questions and activities from lesson plan
6. Refine mode (existing PPT only) preserves questions and activities from PowerPoint content
7. Blend mode (lesson + PPT) preserves questions and activities from both sources

**Delivers:**
- Modified `services/geminiService.ts` with preservation rules in all three modes
- Modified `services/providers/claudeProvider.ts` with equivalent rules
- Extended `GenerationInput` type with `preservedContent` field
- Teleprompter prompts updated to receive preserved content as context

---

### Phase 50: Quality Assurance

**Goal:** Ensure preservation doesn't degrade the quality of non-preserved content or break existing functionality.

**Dependencies:** Phase 49 (preservation must be working to assess quality impact)

**Plans:** (created by /gsd:plan-phase)

**Requirements:**
- QUAL-01: Non-preserved content maintains student-friendly language
- QUAL-02: Slide flow remains coherent around preserved elements
- QUAL-03: Teleprompter quality does not degrade
- QUAL-04: Existing slide layouts continue to work correctly

**Success Criteria:**
1. Non-preserved explanatory content on same slide as preserved question uses grade-appropriate vocabulary
2. Slides with preserved content transition naturally from previous and to next slides in flow
3. Teleprompter scripts around preserved content maintain conversational teaching style, not robotic reading
4. All existing slide layouts (bullet-list, flowchart, comparison, etc.) render correctly with preserved content

**Delivers:**
- Quality validation testing across representative lesson plans
- Any prompt refinements needed to maintain non-preserved content quality
- Documentation of preservation edge cases and handling

---

## Progress

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 48 | Detection and Rules Foundation | DET-01, DET-02, DET-03, DET-04, DET-05 | Planned |
| 49 | Provider Integration and Preservation | PRES-01, PRES-02, PRES-03, PRES-04, PRES-05, PRES-06, PRES-07 | Pending |
| 50 | Quality Assurance | QUAL-01, QUAL-02, QUAL-03, QUAL-04 | Pending |

**Coverage:** 16/16 requirements mapped (100%)

---
*Roadmap created: 2026-02-01*
*Last updated: 2026-02-01*
