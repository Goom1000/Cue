# Quality Review: Edge-Case Fixture (Year 5 Reading - Story Elements)

**Date:** 2026-02-01
**Provider:** Claude
**Mode:** Fresh
**Grade Level:** Year 5
**Preserved Elements Detected:** 4 (3 medium+ confidence)

## Detection Summary

The following content was detected:

| # | Type | Confidence | Detected Content |
|---|------|------------|------------------|
| 1 | Question | **low** | "Isn't it amazing how stories can take us to new places?" |
| 2 | Question | high | "When you think about your favourite story, what is the main character like, what problems do they face, and how do those problems help us understand who they really are as a person?" |
| 3 | Question | high | "Why is the order of events important in a story?" |
| 4 | Activity | high | "Complete this story analysis by first writing the name of the main character and listing three words that describe them, then drawing a picture of where the story takes place with the time period labeled, and finally putting the five main events in order from first to last on your story map." |

### Edge Case Details

| Edge Case | Expected Behavior | Item |
|-----------|-------------------|------|
| Rhetorical question | Should NOT be preserved (low confidence filtered out) | Item 1 |
| Long multi-part question (197 chars) | Should be preserved verbatim | Item 2 |
| Standard question | Should be preserved verbatim | Item 3 |
| Long multi-part activity (283 chars) | Should be preserved verbatim | Item 4 |

## 1. Preservation Verification

*To be verified during human review*

| Detected Content | Found in Output? | Location | Verbatim? |
|------------------|------------------|----------|-----------|
| "Isn't it amazing..." (rhetorical) | Should NOT appear as preserved | N/A | N/A (filtered) |
| Long question: "When you think about your favourite story..." | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |
| "Why is the order of events important in a story?" | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |
| Long activity: "Complete this story analysis..." | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |

## 2. Non-Preserved Content Quality (QUAL-01)

*Verify these during human review*

- [ ] Vocabulary matches elementary grade level (simple words)
- [ ] Student-friendly tone (direct but approachable)
- [ ] Complete sentences, not fragments
- [ ] No teacher meta-language ("students will learn...")

**Notes:**

## 3. Slide Flow (QUAL-02)

*Verify these during human review*

- [ ] Natural transitions between slides
- [ ] Long preserved content feels integrated, not overwhelming
- [ ] Multi-part questions/activities don't disrupt flow
- [ ] Rhetorical question handled naturally (not preserved as a "question to ask")

**Notes:**

## 4. Teleprompter Quality (QUAL-03)

*Verify these during human review*

- [ ] Conversational coaching style
- [ ] Long preserved questions introduced naturally
- [ ] Multi-part activity has appropriate facilitation tips
- [ ] Timing cues for complex questions/activities
- [ ] Not robotic reading of slide content

**Notes:**

## 5. Layout Compatibility (QUAL-04)

*Verify these during human review*

- [ ] Content renders correctly (spot check only per CONTEXT.md)
- [ ] Long content doesn't cause overflow
- [ ] Multi-part content formatted readably

**Notes:**

## Overall Assessment

- [ ] PASS - Quality matches pre-preservation baseline
- [ ] NEEDS REFINEMENT - Specific issues below

## Issues Found (if any)

| Issue | Severity | Suggested Fix |
|-------|----------|---------------|
| | | |

## Prompt Refinement Notes

[If refinement needed, describe what to change in contentPreservationRules.ts or provider prompts]

---

## Edge Case Special Considerations

This fixture specifically tests:

1. **Rhetorical Question Filtering**
   - "Isn't it amazing..." should be detected as low confidence
   - With medium confidence filter, it should NOT be preserved
   - Verify it doesn't appear as a "question to ask students"

2. **Long Multi-Part Question Handling**
   - The 197-character question tests how AI handles verbose teacher questions
   - Should appear verbatim without truncation
   - Teleprompter should provide context for multi-part delivery

3. **Long Multi-Part Activity Handling**
   - The 283-character activity tests multi-step instruction preservation
   - All parts should be preserved: character naming, picture drawing, event ordering
   - Teleprompter should help teacher facilitate each part

## Verification Instructions

To complete this review:

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000
3. Create a new lesson with the edge-case fixture content (from `edge-case-multi-mode.md`)
4. Set grade level to Year 5
5. Generate slides using Fresh mode
6. Verify:
   - Rhetorical question NOT preserved as a classroom question
   - Long question preserved verbatim
   - Long activity preserved verbatim
7. Check quality criteria above
8. Mark Overall Assessment
