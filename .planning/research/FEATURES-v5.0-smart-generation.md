# Feature Landscape: v5.0 Smart Generation Pipeline

**Domain:** Multi-pass AI slide generation with auto gap analysis, resource integration, and lesson phase detection
**Researched:** 2026-02-14
**Confidence:** MEDIUM -- core patterns are well-established but phase detection for UK lesson plans specifically is novel territory

## Table Stakes

Features users expect from a "smart generation" upgrade. Missing any of these makes the v5.0 label unjustified.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Auto gap analysis during generation** | Current gap analysis is manual (teacher clicks "Check for Gaps" post-generation). Competitors like Monsha and Chalkie generate complete decks from lesson plans in one step. Teachers expect "upload and go" to produce a near-complete deck. | Medium | Existing `analyzeGaps()` in aiProvider, `GAP_ANALYSIS_SYSTEM_PROMPT`, `buildGapSlideGenerationPrompt()` | Wire existing gap analysis as Pass 2 after initial generation, auto-fill gaps into deck |
| **Coverage score on first generation** | After generation, teacher needs to see "85% of your lesson plan is covered" so they know what's missing. Competitors show completion/alignment metrics. | Low | Existing `GapAnalysisResult.coveragePercentage` | Already computed in gap analysis -- just needs to surface in UI on generation complete |
| **Accept/reject gap suggestions** | Teachers must control what gap slides get added. Force-inserting slides would violate teacher agency. Chalkie, Monsha, and MagicSchool all use review-before-insert patterns. | Low | Existing gap slide generation (`generateSlideFromGap()`) | Current UI already has accept/reject per gap (Phase 59). Need to auto-trigger rather than manual. |
| **Resource upload alongside lesson plan** | Teachers commonly have case studies, worksheets, or reference PDFs they want incorporated. Monsha, Chalkie, and Edcafe all support file uploads alongside lesson plan input. Cue already has `UploadedResource` infrastructure (Phase 43+). | Medium | Existing `uploadService.ts`, `processUploadedFile()`, `UploadPanel.tsx` | Infrastructure exists for resource upload in Resource Hub. Need to expose during INPUT state, not just EDITING state. |
| **Resource content fed into generation prompt** | Uploaded resources must actually influence slide content, not just sit as attachments. Monsha analyzes uploaded content and generates aligned slides. | Medium | Existing document processors (PDF, DOCX, image), `documentAnalysisService` | Extract text/images from resources, inject as additional context into generation prompt |
| **Lesson phase labels on slides** | Teacher expects to see which slides map to Hook, I Do, We Do, You Do, Plenary. The system already mentions these phases in the fresh-mode prompt (`getSystemInstructionForMode`). Currently the AI is told to "Preserve the pedagogical structure" but the output has no phase metadata. | Medium | Existing `Slide` type needs `lessonPhase` field | New field on Slide interface. AI returns phase tag per slide. |

## Differentiators

Features that set Cue apart from Monsha/Chalkie/MagicSchool. Not expected, but make teachers choose Cue.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Multi-pass pipeline with progress feedback** | Most competitors do a single AI call and return results. Cue can show "Pass 1: Generating slides... Pass 2: Checking coverage... Pass 3: Filling gaps..." as a visible pipeline. Teachers see the AI "thinking" through their lesson, building trust in the output. | Medium | New generation orchestrator wrapping existing functions | Self-Refine pattern: generate -> evaluate -> fill gaps. Show progress per pass. |
| **Resource-aware slide enrichment** | Not just "here's a worksheet" but the AI weaves case study content into relevant slides. E.g., if teacher uploads a "Rainforest Case Study.pdf", the AI creates a slide that references specific facts from it, with "[See Case Study: Rainforest]" callout. No competitor does deep content weaving. | High | Document text extraction, prompt engineering for context injection | Differentiated from Monsha which generates separate aligned materials, not embedded references |
| **Phase-aware deck structure badges** | Visual badges on slides (Hook, I Do, We Do, You Do, Plenary) with colour coding. Teacher can see at a glance if their lesson flow is balanced. No competitor provides this structural overview of lesson pedagogy. | Low | `lessonPhase` field on Slide, badge rendering in SlideCard/sidebar | Low implementation cost, high pedagogical value |
| **Phase balance indicator** | After generation, show "Your lesson is 60% teacher-led (I Do) and only 10% independent practice (You Do)" with suggestion to add more student-led activities. Unique among competitors. | Medium | Phase distribution calculation from slide metadata | Adds genuine pedagogical value; Ofsted-relevant for UK teachers |
| **Smart resource placement** | When teacher uploads a worksheet alongside lesson plan, AI suggests which slide to reference it at (e.g., "Worksheet 1 fits after Slide 7: Fractions Practice"). Extends existing `SlideMatch` concept from document enhancement. | Medium | Existing `SlideMatch` interface, `buildSlideContextForEnhancement()` | Already proven pattern from Phase 45 enhancement flow |
| **Generation memory across modes** | In Blend mode with uploaded resources, the AI remembers what content came from the lesson plan vs. the resources vs. the PPT. Provenance tracking per slide section. Extends existing `SlideSource` type. | High | Extended `SlideSource` type to include resource provenance | Complex but enables "where did this come from?" transparency |

## Anti-Features

Features to explicitly NOT build in v5.0. These are traps that sound good but hurt the product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Fully automatic gap-fill without review** | Teachers must approve every slide. Auto-inserting gap slides without consent violates teacher agency and creates "AI ran the lesson" feeling. UK teachers are particularly sensitive to this given Ofsted scrutiny. | Show gap suggestions in review panel. Teacher clicks "Add" or "Skip" per gap. Default to showing, not inserting. |
| **Real-time lesson phase detection during presentation** | Detecting which phase the teacher is currently in during live delivery adds complexity with low value. The phase is known at authoring time, not runtime. | Detect phases at generation time from lesson plan text. Static labels, not dynamic detection. |
| **AI-generated resources from scratch during generation** | The existing Resource Hub (Phase 43+) generates worksheets/handouts post-generation. Trying to also generate resources alongside slides in one pass would overload the context window and produce mediocre results for both. | Keep resource generation as a separate step. In v5.0, integrate *uploaded* resources into generation. AI-generated resources remain a post-generation feature. |
| **Unlimited resource uploads** | Token limits are real. Each uploaded PDF could be 10+ pages. Allowing unlimited uploads would blow past context windows (Gemini: ~1M tokens, Claude: ~200K). | Cap at 3 supplementary resources per generation. Show clear messaging about why. |
| **Phase detection for Refine mode** | When refining an existing PPT, the teacher's PPT may not follow I Do/We Do/You Do at all. Forcing phase labels onto arbitrary PPT content would produce nonsensical labels. | Only detect phases in Fresh and Blend modes where a lesson plan (with pedagogical structure) is the source. Refine mode skips phase detection. |
| **Cross-resource deduplication** | If teacher uploads a worksheet that repeats lesson plan content, trying to detect and merge duplicates adds complexity with edge cases. | Let the AI naturally handle overlap through prompt instructions: "Do not repeat content that appears in both the lesson plan and uploaded resources." |

## Feature Dependencies

```
Resource Upload in INPUT state
  -> Resource text extraction (existing infrastructure)
    -> Resource context injection into generation prompt
      -> Resource-aware slide generation
        -> Smart resource placement (SlideMatch on generated slides)

Lesson Phase Detection
  -> lessonPhase field on Slide type
    -> Phase labels in generation response schema
      -> Phase badge rendering in SlideCard
        -> Phase balance indicator

Multi-Pass Pipeline
  -> Pass 1: Initial generation (existing generateLessonSlides)
    -> Pass 2: Gap analysis (existing analyzeGaps, auto-triggered)
      -> Pass 3: Gap slide generation (existing generateSlideFromGap, per accepted gap)
        -> Final deck assembly with gap slides inserted at suggestedPosition

Resource Upload in INPUT state -> Resource context injection -> Multi-Pass Pipeline (resources inform all passes)
Lesson Phase Detection -> Multi-Pass Pipeline (phase labels assigned during Pass 1)
```

## Detailed Feature Specifications

### 1. Multi-Pass Generation Pipeline

**Current state:** Single-pass generation via `generateLessonSlides()`, then manual "Check for Gaps" button in editor.

**Target state:** Three-pass pipeline triggered by single "Generate" click:
- **Pass 1 (Generate):** Existing `generateLessonSlides()` produces initial deck
- **Pass 2 (Evaluate):** Existing `analyzeGaps()` runs automatically, returns `GapAnalysisResult` with `coveragePercentage` and `IdentifiedGap[]`
- **Pass 3 (Fill):** For each gap the teacher accepts, `generateSlideFromGap()` creates full slides

**Architecture pattern:** Self-Refine (generate -> feedback -> refine) adapted as generate -> evaluate -> fill. NOT a loop -- exactly 3 passes. Looping would be wasteful because gap analysis quality does not improve with re-runs.

**Progress UX:**
```
[=====     ] Pass 1: Generating slides from lesson plan...
[========  ] Pass 2: Checking coverage against lesson plan...
[==========] Pass 3: Filling 3 gaps... (2/3)
```

**Token budget consideration:** Pass 2 (gap analysis) receives the full deck + lesson plan. With 20 slides at ~200 chars speaker notes each, that's roughly 4,000 chars of deck context + 8,000 chars lesson plan = ~12,000 chars. Well within limits for both Gemini and Claude.

**Complexity:** Medium. All three AI operations already exist. New code is the orchestrator function and progress UI.

### 2. Resource Integration into Generation

**Current state:** `UploadPanel.tsx` lives in Resource Hub (EDITING state only). Resources are uploaded for AI enhancement (differentiation, answer keys) -- NOT for initial generation.

**Target state:** Resources uploaded alongside lesson plan in INPUT state. Resource content extracted and injected into generation prompt as additional context.

**How resource context enters the prompt:**

```
=== LESSON PLAN ===
[lesson plan text]

=== SUPPLEMENTARY RESOURCES ===

Resource 1: "Rainforest Case Study.pdf" (3 pages)
[extracted text from PDF]

Resource 2: "Vocabulary Worksheet.docx" (1 page)
[extracted text from DOCX]

=== INSTRUCTIONS ===
Incorporate key content from supplementary resources into relevant slides.
When referencing a resource, add a callout: "[See: Resource Name]"
Do not create separate slides for each resource -- weave content into topic-appropriate slides.
```

**Token budget:** Each resource capped at 2,000 chars extracted text. With 3 resources max, that's 6,000 additional chars. Combined with lesson plan (8,000 chars), total context is ~14,000 chars. Comfortable for both providers.

**Upload UX in INPUT state:**
- Below the lesson plan upload area, a secondary drop zone: "Add supplementary resources (optional)"
- Shows thumbnails of uploaded resources with remove button
- Max 3 resources, shows count "2/3 resources"
- Accepted types: same as existing (`pdf`, `image`, `docx`)

**Complexity:** Medium. Reuses existing upload infrastructure. New code is the INPUT state upload UI and prompt context injection.

### 3. Lesson Phase Detection

**Current state:** The fresh-mode system prompt says "Preserve the pedagogical structure: 'Hook', 'I Do', 'We Do', 'You Do'" but the AI output has no phase metadata. The `Slide` interface has no phase field.

**Target state:** Each generated slide tagged with a `lessonPhase` field. AI assigns phases during generation. Phases displayed as badges in the editor.

**Phase taxonomy (UK primary aligned):**

| Phase | Display Label | Colour | Typical Position | Detection Keywords in Lesson Plan |
|-------|---------------|--------|------------------|-----------------------------------|
| `hook` | Hook / Starter | Amber | First 1-2 slides | "Hook", "Starter", "Engage", "Introduction" |
| `i-do` | I Do (Modelling) | Blue | After hook | "I Do", "Model", "Demonstrate", "Direct instruction", "Teacher explains", "Main teaching" |
| `we-do` | We Do (Guided) | Purple | Middle | "We Do", "Guided practice", "Together", "Shared activity", "Partner work" |
| `you-do` | You Do (Independent) | Green | After we-do | "You Do", "Independent", "On your own", "Apply", "Practice" |
| `plenary` | Plenary / Review | Pink | Last 1-2 slides | "Plenary", "Review", "Recap", "Assessment", "Exit ticket", "Self-assessment" |
| `transition` | Transition | Grey | Between phases | Success criteria slides, differentiation slides, setup slides |

**Implementation approach:** Add `lessonPhase` to the Gemini response schema as an enum field. The AI already understands these phases from the system prompt. Adding it as a structured output field is trivial.

```typescript
// Addition to Slide interface
lessonPhase?: 'hook' | 'i-do' | 'we-do' | 'you-do' | 'plenary' | 'transition';
```

**Phase balance analysis:**
After generation, calculate distribution:
```
Hook: 1 slide (8%)   [=         ]
I Do: 5 slides (42%) [=====     ]
We Do: 3 slides (25%)[===       ]
You Do: 2 slides (17%)[==        ]
Plenary: 1 slide (8%)[=         ]
```

If any phase is 0%, suggest: "Your lesson has no independent practice (You Do) slides. Consider adding student-led activities."

**Scope limitation:** Phase detection is AI-assigned during generation only (Fresh and Blend modes). Not applied during Refine mode (arbitrary PPTs don't follow GRR model). Teacher can manually override phase labels in editor.

**Complexity:** Medium for AI schema changes and badge rendering. Low for balance calculation. Manual override is a small UI addition.

### 4. Resource-Aware Gap Analysis (Pass 2 Enhancement)

**Current state:** Gap analysis compares deck against lesson plan only.

**Target state:** Gap analysis also considers uploaded resources. If the lesson plan mentions "case study activity" and the teacher uploaded a case study PDF, the gap analysis recognises it IS covered (via the resource) and does not flag it as a gap.

**Implementation:** Extend `buildGapAnalysisContext()` to include resource summaries:

```
=== UPLOADED RESOURCES (teacher will distribute these separately) ===
1. "Rainforest Case Study.pdf" - Content summary: [first 500 chars]
2. "Vocabulary Worksheet.docx" - Content summary: [first 500 chars]

When assessing coverage, count resource content as "covered" even if no slide explicitly
presents it -- the teacher will distribute these resources alongside the presentation.
```

**Complexity:** Low. Extends existing context builder with additional section.

## MVP Recommendation

**Prioritise for v5.0 (essential):**

1. **Multi-pass pipeline orchestrator** -- The headline feature. Without this, v5.0 is not a meaningful upgrade. Wire existing `generateLessonSlides` -> `analyzeGaps` -> `generateSlideFromGap` into a single "Generate" flow with progress UI.

2. **Coverage score display** -- Zero new AI work. Surface existing `coveragePercentage` from gap analysis as a badge after generation: "87% of your lesson plan covered."

3. **Lesson phase labels** -- Add `lessonPhase` to response schema and Slide type. Render as coloured badges in sidebar/SlideCard. Low effort, high perceived value.

4. **Resource upload in INPUT state** -- Move upload UI from Resource Hub to also appear in INPUT state. Extract content, inject into generation prompt.

**Defer to v5.1:**

- **Phase balance indicator** -- Nice to have but not essential for launch. Can be added as a quick follow-up since phase labels are the prerequisite.
- **Resource-aware gap analysis** -- Useful but edge case. Most teachers upload resources for separate distribution, not as slide content.
- **Smart resource placement** -- Extends SlideMatch pattern. Good differentiator but can come after core pipeline is stable.
- **Generation memory/provenance** -- High complexity, low urgency. Track in a future milestone.

## Phase Ordering Rationale

1. **Lesson phase detection** first because it's a new field on Slide that all subsequent features reference (badges, balance, gap analysis phase-awareness).
2. **Multi-pass pipeline** second because it's the core value proposition and requires the orchestrator that wraps everything else.
3. **Resource upload in INPUT** third because it extends the pipeline with additional context but is additive, not foundational.
4. **Coverage score + accept/reject UI** are small UI pieces that emerge naturally from the pipeline work.

## Confidence Assessment

| Feature | Confidence | Reason |
|---------|------------|--------|
| Multi-pass pipeline | HIGH | All three AI operations already exist and work. Orchestration is pure code, no AI risk. Self-Refine pattern well-documented. |
| Resource integration | HIGH | Upload infrastructure exists (Phase 43). Document processors exist. Prompt context injection is standard. |
| Lesson phase detection | MEDIUM | AI can classify phases, but accuracy depends on lesson plan structure. UK lesson plans vary widely in format. Need fallback for unstructured plans. |
| Phase balance indicator | MEDIUM | Calculation is trivial but pedagogical thresholds ("what's a good I Do / You Do ratio?") need teacher validation. |
| Resource-aware gap analysis | MEDIUM | Concept is sound but gap analysis prompt is already near complexity limit. Adding resource context may reduce gap detection accuracy. |

## Competitor Landscape Summary

| Competitor | Auto Gap Analysis | Resource Upload | Phase Detection | Multi-Pass |
|-----------|-------------------|----------------|-----------------|------------|
| **Monsha** | No (single-pass) | Yes (PDF, DOCX, images, YouTube) | No | No |
| **Chalkie** | No (single-pass) | Yes (file, URL) | No | No |
| **MagicSchool** | No (single-pass) | Yes (PDF, text, articles, YouTube) | No | No |
| **Curipod** | No (single-pass) | Minimal (topic-based) | No | No |
| **Edcafe** | No (single-pass) | Yes (upload materials) | No | No |
| **Cue v4.x** | Yes (manual step) | Yes (Resource Hub, post-gen) | No | No |
| **Cue v5.0** | Yes (auto) | Yes (alongside lesson plan) | Yes | Yes |

Cue v5.0's differentiators: multi-pass pipeline with visible progress, auto gap analysis, and lesson phase detection. No competitor offers any of these three. Resource upload is table stakes (all competitors have it) but Cue's resource-into-slides weaving would be unique.

## Sources

- [Eugene Yan: Patterns for Building LLM-based Systems](https://eugeneyan.com/writing/llm-patterns/) -- Guardrails, evaluation, and pipeline patterns (HIGH confidence)
- [Self-Refine: Iterative Refinement with Self-Feedback](https://selfrefine.info/) -- Generate-feedback-refine loop architecture (HIGH confidence)
- [Emergent Mind: LLM-Driven Automated Generation Pipeline](https://www.emergentmind.com/topics/llm-driven-automated-generation-pipeline) -- Multi-stage pipeline patterns (MEDIUM confidence)
- [Emergent Mind: Iterative LLM-Based Approach](https://www.emergentmind.com/topics/iterative-llm-based-approach) -- Generate-validate-refine pattern (MEDIUM confidence)
- [Classwork: I Do, We Do, You Do Simplified](https://classwork.com/implement-gradual-release-with-ai/) -- GRR model with AI (MEDIUM confidence)
- [Third Space Learning: I Do We Do You Do](https://thirdspacelearning.com/blog/i-do-we-do-you-do/) -- UK primary school lesson structure (HIGH confidence)
- [Teachwire: Lesson Plan Templates](https://www.teachwire.net/news/11-of-the-best-free-blank-lesson-plan-templates-for-teachers/) -- UK lesson plan structure (HIGH confidence)
- [Monsha: AI Presentation Maker](https://monsha.ai/tools/presentation-maker) -- Competitor resource upload flow (MEDIUM confidence)
- [Chalkie AI](https://chalkie.ai/) -- Competitor lesson generation features (MEDIUM confidence)
- [MagicSchool](https://chalkie.ai/our-blog/20-best-ai-tools-for-teachers) -- Competitor feature survey (LOW confidence, secondhand source)
