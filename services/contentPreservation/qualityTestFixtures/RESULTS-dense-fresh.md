# Quality Review: Dense Fixture (Year 4 Science - Water Cycle)

**Date:** 2026-02-01
**Provider:** Claude
**Mode:** Fresh
**Grade Level:** Year 4
**Preserved Elements Detected:** 11

## Detection Summary

The following content was detected and should be preserved:

| # | Type | Confidence | Detected Content |
|---|------|------------|------------------|
| 1 | Question | high | "What happens to water when it gets very hot?" |
| 2 | Question | high | "Where do you think rain comes from?" |
| 3 | Question | high | "How does water get into the air?" |
| 4 | Instruction | high | "This is the most important part of the water cycle!" |
| 5 | Question | high | "What are clouds made of?" |
| 6 | Instruction | high | "Clouds are not made of cotton!" |
| 7 | Question | high | "Why does it rain?" |
| 8 | Question | high | "What other ways can water fall from the sky besides rain?" |
| 9 | Activity | high | "List 3 places where you can find water in your home." |
| 10 | Activity | high | "Discuss with your partner how water moves from the ocean to a cloud." |
| 11 | Activity | high | "Compare the water cycle to making pasta." |

## 1. Preservation Verification

*To be verified during human review*

| Detected Content | Found in Output? | Location | Verbatim? |
|------------------|------------------|----------|-----------|
| "What happens to water when it gets very hot?" | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |
| "Where do you think rain comes from?" | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |
| "How does water get into the air?" | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |
| "This is the most important part of the water cycle!" | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |
| "What are clouds made of?" | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |
| "Clouds are not made of cotton!" | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |
| "Why does it rain?" | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |
| "What other ways can water fall from the sky besides rain?" | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |
| "List 3 places where you can find water in your home." | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |
| "Discuss with your partner how water moves from the ocean to a cloud." | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |
| "Compare the water cycle to making pasta." | [ ] Yes / [ ] No | Slide ___ | [ ] Yes / [ ] Adapted |

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
- [ ] Preserved content feels integrated, not jarring
- [ ] Dense preserved content distributed appropriately across slides
- [ ] No "wall of questions" - questions spaced naturally in flow

**Notes:**

## 4. Teleprompter Quality (QUAL-03)

*Verify these during human review*

- [ ] Conversational coaching style
- [ ] Preserved questions introduced naturally ("Now ask the class:")
- [ ] Activity instructions have facilitation tips
- [ ] Timing cues present where appropriate
- [ ] Not robotic reading of slide content

**Notes:**

## 5. Layout Compatibility (QUAL-04)

*Verify these during human review*

- [ ] Content renders correctly (spot check only per CONTEXT.md)
- [ ] No obvious overflow issues
- [ ] Dense content doesn't cause visual crowding

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

## Dense Fixture Special Considerations

This fixture tests the AI's ability to:
1. Handle many preserved elements (11 items) without degrading quality
2. Distribute preserved content naturally across multiple slides
3. Maintain flow when there are more questions than typical

## Verification Instructions

To complete this review:

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000
3. Create a new lesson with the dense fixture content (from `elementary-science-dense.md`)
4. Set grade level to Year 4
5. Generate slides using Fresh mode
6. Verify all 11 detected items appear in output
7. Check quality criteria above
8. Pay special attention to flow with dense content
9. Mark Overall Assessment
