# Roadmap: Cue v3.9 Delay Answer Reveal

## Overview

This milestone transforms Cue's AI slide generation to create deliberate "thinking pauses" for students. When the AI detects teachable moments (problems with answers), it splits them across progressive bullets and generates scaffolding strategies in the teleprompter to help teachers guide students through productive struggle before revealing answers.

## Milestones

- v3.8 Preserve Teacher Content (Phases 48-50) - shipped 2026-02-01
- v3.9 Delay Answer Reveal (Phases 51-54) - in progress

## Phases

- [ ] **Phase 51: Detection Foundation** - Identify teachable moments in lesson content
- [ ] **Phase 52: Prompt Engineering Core** - AI generates split bullets with scaffolding
- [ ] **Phase 53: Scaffolding Templates** - Subject-specific scaffolding strategies
- [ ] **Phase 54: Quality Assurance** - Validate generation across content types

## Phase Details

### Phase 51: Detection Foundation

**Goal**: Reliably identify problem-answer pairs in lesson content with conservative detection to preserve lesson flow

**Depends on**: Nothing (first phase of v3.9)

**Requirements**: DET-01, DET-02, DET-03, DET-04

**Success Criteria** (what must be TRUE):
1. AI receives XML-tagged teachable moments in system prompt for lesson content containing Q&A pairs, definitions, or math with results
2. Detection flags less than 30% of bullets to avoid fragmenting the lesson
3. Each detected moment includes content type classification (math, vocabulary, comprehension, science)
4. Problem-answer pairs are correctly associated (answer follows its problem)

**Plans**: TBD

---

### Phase 52: Prompt Engineering Core

**Goal**: AI generates slides with problem/answer split across progressive bullets and scaffolding guidance in teleprompter

**Depends on**: Phase 51 (detection provides input for AI prompts)

**Requirements**: RST-01, RST-02, RST-03, RST-04, SCF-01, SCF-02, SCF-03

**Success Criteria** (what must be TRUE):
1. Problem bullet appears first with no answer leakage (answer text not visible until next reveal)
2. Answer appears as the immediately following progressive bullet on the same slide
3. Teleprompter shows strategy steps between problem and answer reveals
4. Each scaffolded moment includes 2-3 question prompts for teacher to guide student thinking
5. Transitions between problem, scaffolding, and answer feel natural (not jarring)

**Plans**: TBD

---

### Phase 53: Scaffolding Templates

**Goal**: Scaffolding strategies match content complexity with subject-specific approaches

**Depends on**: Phase 52 (core scaffolding working, now specialized)

**Requirements**: SCF-04, SCF-05

**Success Criteria** (what must be TRUE):
1. Math problems get decomposition scaffolding (break into steps, estimate first, check units)
2. Vocabulary gets context scaffolding (word parts, sentence context, related words)
3. Comprehension gets evidence scaffolding (find in text, connect ideas, infer meaning)
4. Each scaffold prompt is verbally deliverable in under 20 words

**Plans**: TBD

---

### Phase 54: Quality Assurance

**Goal**: Validated generation across diverse lesson content with no answer leakage or detection failures

**Depends on**: Phase 53 (all features implemented, now testing)

**Requirements**: QUA-01, QUA-02, QUA-03

**Success Criteria** (what must be TRUE):
1. Generated slides never leak answers in problem statements or scaffolding prompts
2. Detection and generation work correctly with math, reading, and science lesson plans of varying formats
3. Both Gemini and Claude providers produce equivalent scaffolded output

**Plans**: TBD

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 51. Detection Foundation | v3.9 | 0/TBD | Not started | - |
| 52. Prompt Engineering Core | v3.9 | 0/TBD | Not started | - |
| 53. Scaffolding Templates | v3.9 | 0/TBD | Not started | - |
| 54. Quality Assurance | v3.9 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-01*
*Last updated: 2026-02-01*
