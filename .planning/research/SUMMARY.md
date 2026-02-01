# Project Research Summary

**Project:** Cue v3.9 - Delay Answer Reveal
**Domain:** AI-powered pedagogical scaffolding for educational presentations
**Researched:** 2026-02-01
**Confidence:** HIGH

## Executive Summary

Delay Answer Reveal is fundamentally a **prompt engineering task**, not a library task. The existing Cue architecture already has everything needed: progressive bullet disclosure (`content[]` + `visibleBullets` state), teleprompter scripts (`speakerNotes`), and content detection patterns (`contentPreservation/detector.ts`). The AI will restructure lesson content during generation to separate problems from answers, then generate scaffolding guidance in the teleprompter that helps teachers guide students through "teachable moments."

The recommended approach is three-phase: (1) extend the content detection system to identify problem-answer pairs in source material, (2) enhance AI prompts with teachable moment formatting rules and scaffolding templates, and (3) integrate with the existing teleprompter segment system. No new dependencies, types, or major components are required. The existing `Slide.content[]` array and `speakerNotes` field handle everything.

The critical risks are **over-detection** (flagging too many bullets as teachable moments, fragmenting the lesson) and **generic scaffolding** (one-size-fits-all prompts that don't match content complexity). Research shows 3-5 seconds of "wait time" improves learning, but the quality of what happens during the wait matters more than the pause itself. Prevention requires conservative detection criteria (< 30% of bullets flagged), content-aware scaffold generation aligned to Bloom's taxonomy, and clear problem/answer separation to prevent answer leakage.

## Key Findings

### Recommended Stack

**No changes required.** The existing Cue stack (React 19, Vite 6, TypeScript, Tailwind, @google/genai) provides everything needed. This is purely a prompt engineering and detection logic extension.

**Core technologies (unchanged):**
- **React 19 + Vite 6**: Already handles progressive disclosure with `visibleBullets` state
- **TypeScript**: `Slide.content[]` and `speakerNotes` support the required data structure
- **Gemini/Claude providers**: AI prompt injection framework exists in `services/prompts/`
- **Content preservation**: `contentPreservation/detector.ts` provides pattern-based detection

### Expected Features

**Must have (table stakes):**
- **Automatic detection** of answer-containing content (extends detector.ts patterns)
- **Problem-first bullet sequencing** (AI restructures at generation time, no runtime logic)
- **Scaffolding strategy in teleprompter** (wait time cues + 2-3 question prompts)
- **Question prompts for teacher use** (Socratic questioning embedded in speakerNotes)

**Should have (differentiators):**
- **Adaptive scaffolding by content type** (math vs vocabulary vs comprehension)
- **Hint progression** (gentle -> medium -> strong before reveal)
- **Visual badge in editor** (teacher sees which bullets have delayed answers)

**Defer (v2+):**
- **Cognitive load indicators** (wait time based on complexity heuristics)
- **Per-bullet scaffolding toggle** (teacher granular control)

### Architecture Approach

The architecture leverages existing Cue patterns. Detection happens client-side (pure functions, deterministic). Detected teachable moments format as XML tags in the system prompt. The AI generates slides with problem/answer split into consecutive bullets and scaffolding guidance embedded in teleprompter segments between them. No new components, no new APIs, no interface changes.

**Major components:**
1. **Content Detection Extension** (`detector.ts`) - Identify problem-answer pairs using patterns (Q&A proximity, definition structures, math results)
2. **Prompt Engineering** (`contentPreservationRules.ts`) - XML-tagged teachable moments + scaffolding generation instructions
3. **Provider Integration** (`geminiService.ts`, `claudeProvider.ts`) - Pass teachable moments to system prompt

### Critical Pitfalls

1. **Over-Detection Tsunami** - Flag < 30% of bullets; weight toward "You Do" sections; max 1-2 pauses per slide
2. **Generic Scaffolding** - Use content-aware scaffold types (recall/process/analysis); match to Bloom's taxonomy
3. **Answer Leakage** - Strict problem/answer separation in detection; scaffold prompts must NOT contain answer
4. **Timing Misalignment** - Scaffold segment appears AFTER problem bullet revealed; extended segment model
5. **Jarring Transitions** - Integrated single-pass generation; AI knows about upcoming pauses when writing preceding content

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Detection Foundation

**Rationale:** Detection must be deterministic and conservative before any AI generation changes. Wrong detection ruins the feature.

**Delivers:** Teachable moment detection with pattern-based identification of problem-answer pairs.

**Addresses:** TS-1 (automatic detection of answer-containing content)

**Avoids:** Over-Detection Tsunami (conservative criteria from day one)

**Files touched:**
- `services/contentPreservation/types.ts` (add TeachableMoment type)
- `services/contentPreservation/detector.ts` (add detectTeachableMoments function)
- Unit tests for detection patterns

### Phase 2: Prompt Engineering Core

**Rationale:** Once detection works, AI needs rules to act on detected moments. This is where visible behavior changes.

**Delivers:** AI generates split problem/answer bullets with scaffolding in teleprompter.

**Addresses:** TS-2 (problem-first bullet sequencing), TS-3 (scaffolding in teleprompter)

**Avoids:** Answer Leakage (strict separation in prompt rules), Generic Scaffolding (scaffold type templates)

**Files touched:**
- `services/prompts/contentPreservationRules.ts` (add getTeachableMomentRules)
- `services/geminiService.ts` (integrate teachable moments into system prompt)
- `services/providers/claudeProvider.ts` (same integration)

### Phase 3: Scaffolding Templates

**Rationale:** Generic scaffolding works but content-aware scaffolding is the differentiator.

**Delivers:** Subject-specific scaffolding (math decomposition, vocabulary context, comprehension evidence).

**Addresses:** TS-4 (refined question prompts), D-1 (adaptive scaffolding by content type)

**Avoids:** Mismatched Difficulty (Bloom's-aligned scaffold complexity), Wait Time Vagueness (complexity-adjusted timing)

**Files touched:**
- `services/prompts/contentPreservationRules.ts` (expanded with subject templates)
- Possibly new `services/prompts/scaffoldingTemplates.ts`

### Phase 4: Quality Assurance

**Rationale:** Prompt engineering is iterative. Real lesson plans reveal edge cases.

**Delivers:** Validated generation across math, reading, and science content.

**Addresses:** All table stakes validated, regression testing for non-scaffolded slides

**Avoids:** Jarring Transitions (tone consistency testing), Timing Misalignment (progressive disclosure verification)

**Files touched:** None (testing only)

### Phase Ordering Rationale

- **Detection before generation:** Without reliable detection, the AI has nothing to act on. Detection is pure functions, easy to test in isolation.
- **Core prompts before templates:** Get basic split-and-scaffold working before optimizing for content types. Validates the architecture early.
- **Templates before QA:** Subject-specific scaffolding needs testing with real lesson plans. QA phase catches prompt edge cases.
- **Avoids v3.8 pattern:** Content preservation worked because detection informed generation. Same pattern here.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Scaffold prompt wording may need iteration; test with real AI outputs
- **Phase 3:** Subject-specific heuristics need validation against actual lesson plans

Phases with standard patterns (skip research-phase):
- **Phase 1:** Detection patterns well-understood; extends existing detector.ts
- **Phase 4:** Standard testing; no new research needed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No changes; verified against current codebase |
| Features | MEDIUM | Pedagogical research solid; detection signals need real-world validation |
| Architecture | HIGH | Extends proven v3.8 content preservation pattern |
| Pitfalls | HIGH | Grounded in cognitive science (wait time, ZPD, desirable difficulties) |

**Overall confidence:** HIGH

### Gaps to Address

- **Detection precision:** Pattern-based heuristics may have false positives/negatives; needs testing with diverse lesson plans
- **Scaffold quality:** AI-generated prompts need prompt engineering iteration; few-shot examples critical
- **Teacher adoption:** Novel UX in teleprompter; may need onboarding or visual indicators

## Sources

### Primary (HIGH confidence)

**Cue codebase analysis:**
- `/types.ts` - Slide interface already supports content[] + speakerNotes
- `/services/contentPreservation/detector.ts` - Detection patterns to extend
- `/services/prompts/contentPreservationRules.ts` - Prompt injection framework
- `/services/geminiService.ts` - TELEPROMPTER_RULES, BLOOM_DIFFICULTY_MAP
- `/components/PresentationView.tsx` - Progressive disclosure implementation

### Secondary (MEDIUM confidence)

**Wait time and scaffolding research:**
- Rowe (1972), Stahl (1994) - Wait time of 3-5 seconds improves response quality
- [A Theory of Adaptive Scaffolding for LLM-Based Pedagogical Agents](https://arxiv.org/html/2508.01503v1) - ZPD alignment
- [Edutopia: 6 Scaffolding Strategies](https://www.edutopia.org/blog/scaffolding-lessons-six-strategies-rebecca-alber) - Practical techniques

**Socratic questioning:**
- [UConn: Socratic Questions](https://cetl.uconn.edu/resources/teaching-your-course/leading-effective-discussions/socratic-questions/) - Question types for prompts

**Desirable difficulties:**
- [Desirable Difficulties in Learning](https://www.psychologicalscience.org/observer/desirable-difficulties) - Why struggle improves retention

### Tertiary (LOW confidence)

- Subject-specific scaffolding templates - inferred from educational best practices, needs validation

---
*Research completed: 2026-02-01*
*Ready for roadmap: yes*
