# Pitfalls Research: Content Preservation

**Domain:** Adding verbatim content preservation to AI-powered slide generation
**Project:** Cue - Preserve Teacher Content milestone
**Researched:** 2026-02-01
**Confidence:** HIGH (verified against codebase + research literature)

## Executive Summary

Adding content preservation to an existing AI generation system creates a fundamental tension: LLMs are optimized for helpful transformation, not faithful reproduction. The current Cue system produces smooth, coherent slides by letting the AI restructure content freely. Introducing preservation constraints risks breaking this coherence (the AI awkwardly works around fixed content) or failing to preserve (the AI ignores instructions and paraphrases anyway). This research identifies pitfalls specific to hybrid generation where some content must be verbatim and some must be AI-generated around it.

---

## Critical Pitfalls

Mistakes that cause data loss, broken generation, or require architectural rewrites.

---

### Pitfall 1: The "Helpful Transformation" Instinct

**Risk:** LLMs are trained to be helpful, which often means improving, summarizing, or clarifying input rather than reproducing it verbatim. Research shows that "instruction-tuning can work against verbatim reproduction because the model is rewarded for being helpful and concise, which may bias it toward summarizing or restructuring rather than emitting long, repetitive sequences."

**Warning signs:**
- Questions appear but with slightly different wording ("What fraction..." becomes "Which fraction...")
- Numbers change subtly (3/4 becomes 75%, "5 items" becomes "several items")
- Activities are summarized rather than preserved ("Draw a diagram showing..." becomes "Create a visual representation...")
- Teleprompter scripts reference preserved content but don't include it verbatim

**Prevention:**
1. Use explicit markers around preserved content: `[VERBATIM START]...[VERBATIM END]`
2. Include negative examples in prompts: "WRONG: 'What fraction represents...' CORRECT: 'What is 3/4 of 12?' (exact original)"
3. Add verification step: Parse output and compare preserved sections against originals
4. Consider two-pass generation: First extract-and-mark, then generate-around

**Phase to address:** Phase 1 (Extraction) - Establish extraction format with clear markers

**Sources:**
- [Verbatim Data Transcription Failures in LLM Code Generation](https://arxiv.org/html/2601.03640)
- [A Field Guide to LLM Failure Modes](https://medium.com/@adnanmasood/a-field-guide-to-llm-failure-modes-5ffaeeb08e80)

---

### Pitfall 2: Teleprompter-Slide Desynchronization

**Risk:** The current system generates slides and teleprompter scripts together in one coherent pass. When questions are preserved on slides but teleprompter is AI-generated, the scripts may not properly reference the preserved questions or may generate conflicting instructions.

**Warning signs:**
- Teleprompter says "Ask students about..." but slide shows a different question
- Scripts explain concepts that don't match preserved activity instructions
- Progressive disclosure segments don't align with preserved bullet points
- Teacher reads teleprompter expecting AI-generated flow but encounters jarring preserved content

**Why it happens:**
- Current generation produces both slide content and teleprompter in single API call
- Teleprompter rules (TELEPROMPTER_RULES in geminiService.ts) assume AI controls all content
- Progressive disclosure timing ("👉" segments) calculated assuming AI-generated bullets
- No mechanism to signal "this bullet is fixed, generate script around it"

**Prevention:**
1. Pass preserved content to teleprompter generation as required context
2. Modify teleprompter prompt: "The following elements are FIXED and will appear on the slide. Generate scripts that work WITH these exact elements:"
3. Test teleprompter output against slide content programmatically
4. Consider generating teleprompter AFTER slides are finalized (not in parallel)

**Phase to address:** Phase 2 (Dual-Output) - Explicit handoff between slide generation and teleprompter generation

---

### Pitfall 3: Formatting Destruction During Extraction

**Risk:** PDF/document extraction loses formatting that matters for questions and activities. A numbered list becomes a run-on paragraph. A table becomes gibberish. The AI receives malformed input and produces malformed output.

**Warning signs:**
- "1. First question 2. Second question" instead of proper line breaks
- Table data merged into single string
- Indentation hierarchy (a, b, c sub-questions) lost
- Math expressions rendered as text: "3/4" instead of fractions
- Multi-part questions collapsed into single line

**Why it happens:**
- PDF text extraction (pdf.js) prioritizes text content over layout
- Current extraction doesn't preserve structural markers
- LLM receives flat text, loses ability to distinguish structure
- Research shows: "The model's interpretation is influenced not only by the input text but also by its internal representations, increasing the likelihood of semantic drift"

**Prevention:**
1. Extract with layout preservation (current pdf.js + image approach helps)
2. Detect question patterns BEFORE sending to AI: regex for numbered lists, question marks, etc.
3. Pre-process extracted text to restore structure: split on common patterns
4. Include images of pages alongside text for AI to reference visual layout
5. Mark structural elements: `[LIST_START]`, `[ITEM]`, `[TABLE]`

**Phase to address:** Phase 1 (Extraction) - Add structured extraction with pattern detection

---

### Pitfall 4: Context Window Pollution

**Risk:** Adding preservation instructions significantly increases prompt length. The current system already uses substantial context for teleprompter rules, student-friendly rules, and layout instructions. Adding verbose preservation instructions may push important guidance out of the effective context window, causing the AI to ignore either preservation OR existing generation rules.

**Warning signs:**
- Generation quality drops after adding preservation logic
- AI follows preservation rules but breaks teleprompter segment count
- Preserved content appears but slide layout/theme rules ignored
- Inconsistent behavior between short and long lesson plans

**Why it happens:**
- Current prompts in geminiService.ts already substantial (TELEPROMPTER_RULES ~30 lines, STUDENT_FRIENDLY_RULES ~20 lines)
- Each new constraint competes for model attention
- LLMs have recency bias - later instructions may override earlier ones
- No prioritization mechanism for conflicting instructions

**Prevention:**
1. Measure current prompt token count before adding preservation logic
2. Use structured output schemas (already in place) to enforce preservation fields
3. Prioritize preservation instructions near the end of system prompt (recency bias)
4. Consider splitting into multiple passes: extraction pass, then generation pass
5. Test with longest reasonable lesson plan to ensure context window sufficiency

**Phase to address:** Phase 2 (Integration) - Token budget analysis before implementation

---

### Pitfall 5: The "State Tracking Amnesia" Problem

**Risk:** When generating multiple slides with preserved content, the AI must track which preserved elements have been used and which remain. Research shows "the core difficulty is state tracking. When a model is asked to emit N items in order, it must implicitly represent and update an internal 'cursor'... Its state is a distributed pattern over activations that must be reconstructed at every generation step."

**Warning signs:**
- Same question appears on multiple slides
- Some questions never appear (skipped during generation)
- Questions appear out of order relative to lesson flow
- AI "forgets" middle items, preserving only first and last

**Why it happens:**
- LLMs don't have explicit loop counters or state variables
- Each token generation reconstructs state from context
- Long generation increases cumulative error
- No built-in mechanism for "used/unused" tracking

**Prevention:**
1. Explicitly number preserved items in prompt: "PRESERVED ITEM 1 OF 5: [question]"
2. Include checklist in prompt: "You must place all of: [ ] Q1, [ ] Q2, [ ] Q3..."
3. Validate output: Count preserved items in result vs. expected count
4. Consider one-item-per-call approach for critical preservation (slower but reliable)
5. Post-generation validation with automatic retry if items missing

**Phase to address:** Phase 2 (Integration) - Add explicit item tracking in prompt and post-validation

**Sources:**
- [Verbatim Data Transcription Failures in LLM Code Generation](https://arxiv.org/html/2601.03640)

---

### Pitfall 6: Breaking Existing Generation Quality

**Risk:** Modification to prompts for preservation inadvertently regresses the quality of non-preserved content. The current system produces good teleprompter scripts, appropriate layouts, and student-friendly language. Adding constraints may cause the AI to over-focus on preservation at the expense of everything else.

**Warning signs:**
- Teleprompter scripts become mechanical or robotic
- Layout choices become less appropriate
- Student-friendly language deteriorates
- Generation time increases significantly
- Teachers complain output "feels different" after update

**Why it happens:**
- Prompt engineering is zero-sum: attention on preservation = less attention elsewhere
- New instructions may inadvertently contradict existing instructions
- Temperature/sampling settings optimized for current prompts may not work for new ones
- No regression test suite for generation quality

**Prevention:**
1. Establish baseline metrics BEFORE adding preservation (subjective quality scores on test cases)
2. Use A/B testing: Same lesson plan with and without preserved content
3. Add preservation as ADDITIVE prompt section, not replacement of existing rules
4. Preserve existing system instruction structure; add preservation as new section
5. Create regression test suite of "golden" lesson plans that should generate well

**Phase to address:** Phase 1 (Pre-work) - Establish baseline quality metrics and test cases

---

## Moderate Pitfalls

Mistakes that cause UX degradation or technical debt, but are recoverable.

---

### Pitfall 7: Slide Fit Violations

**Risk:** Preserved content may not fit the slide format. A long question that fits a worksheet doesn't fit a presentation bullet. The AI must either truncate (breaking preservation) or overflow (breaking layout).

**Warning signs:**
- Bullet points wrap multiple times or overflow slide boundaries
- AI truncates preserved questions to fit
- AI crams multiple preserved items into one slide, destroying readability
- Preserved activities lose critical details to fit space constraints
- PPTX export looks broken due to overflow

**Why it happens:**
- Worksheet questions designed for paper, not slides
- No character limit enforcement during preservation
- AI tries to be helpful by fitting content, which means changing it
- Layout system assumes AI-generated content within bounds

**Prevention:**
1. Detect content length during extraction, flag items that may not fit
2. Provide AI explicit guidance: "If a preserved item exceeds 20 words, place it as the ONLY content point on that slide"
3. Allow AI to split long preserved content across "Part 1" / "Part 2" slides
4. Design dedicated "Question" layout that accommodates longer text
5. Show preview to teacher with "This content may not display well" warnings
6. Consider teleprompter-only placement for very long content

**Phase to address:** Phase 3 (UI) - Add length detection and dedicated layouts

---

### Pitfall 8: Coherence Disruption Around Preserved Islands

**Risk:** Preserved content creates "islands" of fixed text that the AI must flow around. The narrative arc may become disjointed: smooth AI content, then jarring preserved content, then smooth AI content. Teachers notice the seams.

**Warning signs:**
- Tone shifts noticeably between AI and preserved sections
- Transitions feel forced: "And now for a question: [preserved]"
- Teleprompter scripts don't acknowledge what the preserved content introduces
- Students/teachers comment that some slides "feel different"

**Why it happens:**
- AI generates content without knowing preserved content will appear
- Preserved content may use different vocabulary/register than AI
- No transition generation around fixed elements
- Teleprompter doesn't know to set up preserved questions

**Prevention:**
1. Instruct AI to generate TRANSITIONAL content around preserved items
2. Prompt: "The following question will appear. Before it, generate a brief setup. After it, acknowledge what students just saw."
3. Preserve CONTEXT alongside questions (if worksheet says "Read the following and answer:", preserve that too)
4. Allow AI to slightly reformat (not reword) preserved content for tonal consistency
5. Test with teachers: Do preserved sections feel integrated or bolted-on?

**Phase to address:** Phase 2 (Integration) - Transition generation around preserved content

---

### Pitfall 9: Extraction False Positives

**Risk:** The AI incorrectly identifies content as "questions to preserve" when it's actually explanatory text, examples, or rhetorical questions. Everything gets flagged for preservation, and the AI has nothing left to transform.

**Warning signs:**
- Example questions in lesson plan (not for students) get preserved
- Rhetorical questions in narrative text get extracted
- "Questions to consider" section headers get treated as questions
- Nearly all lesson plan text marked for preservation
- Teacher overwhelmed by confirmation UI

**Why it happens:**
- Question marks in non-questions
- Teacher materials include example questions not meant for slides
- AI struggles to distinguish "question for students" from "question in exposition"
- No semantic understanding of pedagogical intent

**Prevention:**
1. Define extraction criteria precisely: "Questions are ONLY text ending in ? that STUDENTS will answer"
2. Use two-stage extraction: First identify candidates, then classify (question/activity/example/other)
3. Require teacher confirmation of extracted items before generation
4. Provide "not a question" feedback mechanism to improve extraction
5. Include context: Extract surrounding sentences to help classify

**Phase to address:** Phase 1 (Extraction) - Classification step with teacher confirmation UI

---

### Pitfall 10: Validation Complexity Explosion

**Risk:** Verifying preservation is harder than implementing it. You need to compare extracted content against generated output, handle minor formatting differences, account for legitimate AI adjustments (punctuation), and not false-positive on similar-but-different text.

**Warning signs:**
- Validation passes but preservation actually failed (false negative)
- Validation fails on acceptable output (false positive due to punctuation)
- Validation logic becomes complex and brittle
- No one trusts validation results
- Flaky tests block deployment

**Why it happens:**
- String comparison is fragile (whitespace, punctuation, encoding)
- AI may legitimately adjust formatting (capitalize, add period)
- Near-matches hard to detect (paraphrase vs verbatim)
- No clear definition of "preserved enough"

**Prevention:**
1. Use hash-based comparison for strict validation (normalize whitespace first)
2. Define acceptable variations: punctuation, capitalization, trailing spaces
3. Log all validation failures for manual review during development
4. Consider semantic similarity as fallback (embedding comparison) for soft validation
5. Start simple: Exact substring match after normalization
6. Create explicit test cases: "These must pass", "These must fail"

**Phase to address:** Phase 3 (Validation) - Build validation with clear pass/fail criteria

---

## Minor Pitfalls

Annoyances that are fixable with simple changes.

---

### Pitfall 11: No Visual Indicator for Preserved Content

**Risk:** Teacher can't tell which slide content is preserved vs AI-generated. They edit preserved content thinking it's AI, then wonder why regeneration doesn't change it.

**Prevention:**
1. Visual badge on preserved items: "[Preserved]" or lock icon
2. Different styling (e.g., slight background color)
3. Tooltip explaining "This content is preserved from your original document"
4. "Edit source" vs "Edit freely" distinction

**Phase to address:** Phase 3 (UI)

---

### Pitfall 12: Preservation Survives Regeneration Unexpectedly

**Risk:** Teacher clicks "Regenerate Slides" expecting all-new content, but preserved items stay. This is correct behavior but surprises users.

**Prevention:**
1. Clear messaging: "Regenerate will keep your preserved questions and activities"
2. Option to "Clear all preserved content" before regeneration
3. Distinguish "Regenerate AI content" from "Start fresh"

**Phase to address:** Phase 3 (UI)

---

### Pitfall 13: Duplicate Questions When PDF Has Answer Key

**Risk:** PDF has questions on page 1 and same questions with answers on page 5 (answer key). Both get extracted, leading to duplicate preserved content.

**Prevention:**
1. Detect answer key sections and exclude from extraction
2. Deduplicate extracted questions by similarity
3. Extraction UI shows potential duplicates for teacher to resolve

**Phase to address:** Phase 1 (Extraction)

---

## Phase-Specific Warning Summary

| Phase | Highest-Risk Pitfall | Mitigation Priority |
|-------|---------------------|---------------------|
| Pre-work | Breaking existing generation quality | Establish baseline metrics |
| Extraction (Phase 1) | Formatting destruction | Layout-aware extraction |
| Extraction (Phase 1) | Extraction false positives | Two-stage classification |
| Integration (Phase 2) | Helpful transformation instinct | Explicit markers + negative examples |
| Integration (Phase 2) | State tracking amnesia | Numbered items + post-validation |
| Integration (Phase 2) | Teleprompter desync | Pass preserved content to teleprompter gen |
| Integration (Phase 2) | Context window pollution | Token budget analysis |
| UI (Phase 3) | Slide fit violations | Length detection + dedicated layouts |
| Validation (Phase 3) | Validation complexity | Start simple, expand as needed |

---

## Testing Strategy for Preservation

### Golden Test Cases

Create test lesson plans that exercise preservation:

1. **Simple case:** Single question, short, clear
2. **Multiple questions:** 5+ questions that must all appear
3. **Long content:** Question that exceeds typical bullet length
4. **Formatted content:** Numbered list, table, multi-part question
5. **Mixed lesson:** Lots of explanatory text + few questions (extraction precision)
6. **Edge case:** Question marks in non-questions ("What is photosynthesis? It's...")
7. **Answer key present:** PDF with questions and answers (deduplication test)

### Regression Tests

After implementing preservation, verify:

- [ ] Teleprompter segment count still matches bullets + 1
- [ ] Layout selection still appropriate for non-preserved content
- [ ] Student-friendly language still applied to non-preserved content
- [ ] Generation time within acceptable bounds (< 30% increase)
- [ ] Preserved content appears exactly once
- [ ] All preserved items appear (none skipped)
- [ ] Preserved content appears verbatim (character-for-character match after normalization)

### A/B Quality Check

For same lesson plan:

1. Generate WITHOUT preservation (current system)
2. Generate WITH preservation (new system)
3. Compare: teleprompter quality, layout appropriateness, coherence
4. Preserved version should not be noticeably worse

---

## Cue-Specific Integration Notes

### Current Architecture Impact

Based on codebase analysis:

**geminiService.ts generateLessonSlides():**
- Currently takes lessonText + pageImages
- Returns structured Slide[] with content, speakerNotes, etc.
- Preservation requires: identifying preserved items IN lessonText, marking them, ensuring they appear in output

**types.ts Slide interface:**
- No current field for "preserved" flag
- May need: `preservedContent?: { originalText: string; source: 'extraction' | 'manual' }[]`
- Or: `content: Array<{ text: string; preserved?: boolean }>`

**Teleprompter rules (TELEPROMPTER_RULES):**
- Assume AI controls all bullet content
- Progressive disclosure: "Segment N explains Bullet N"
- Preservation means: "Segment N explains PRESERVED Bullet N that you didn't write"

### Recommended Architecture Extension

```typescript
// Preserve extraction results
interface PreservedItem {
  id: string;
  originalText: string;
  type: 'question' | 'activity' | 'instruction';
  slideHint?: string; // "Place after Success Criteria"
}

// Generation input extension
interface GenerationInput {
  lessonText: string;
  lessonImages?: string[];
  // NEW
  preservedItems?: PreservedItem[];
  preservationMode?: 'verbatim' | 'formatted'; // How strict?
}

// Output validation
interface SlideWithValidation extends Slide {
  preservedItemIds?: string[]; // Which preserved items appear on this slide
}

// Post-generation check
function validatePreservation(
  input: PreservedItem[],
  output: SlideWithValidation[]
): { missing: string[]; modified: string[] } {
  // Compare input preserved items against output
  // Flag any that don't appear verbatim
}
```

---

## Sources

### LLM Verbatim Reproduction Challenges
- [Verbatim Data Transcription Failures in LLM Code Generation](https://arxiv.org/html/2601.03640) - State tracking and verbatim reproduction limitations
- [A Taxonomy of Prompt Defects in LLM Systems](https://arxiv.org/html/2509.14404v1) - Systematic classification of prompt failure modes
- [A Field Guide to LLM Failure Modes](https://medium.com/@adnanmasood/a-field-guide-to-llm-failure-modes-5ffaeeb08e80) - Production failure patterns

### Document Processing
- [Guide to Accurate AI Document Processing in 2025](https://unstract.com/blog/ai-document-processing-with-unstract/) - Layout preservation techniques
- [Why LLMs Suck at OCR](https://www.runpulse.com/blog/why-llms-suck-at-ocr) - Transformation vs. preservation challenges
- [Agentic Document Extraction](https://research.aimultiple.com/agentic-document-extraction/) - Multi-stage extraction patterns

### Hallucination and Preservation
- [From Illusion to Insight: Hallucination Mitigation Techniques](https://www.mdpi.com/2673-2688/6/10/260) - Why models modify instead of preserve
- [Comprehensive Survey of Hallucination in LLMs](https://arxiv.org/html/2510.06265v1) - Prompt-induced vs. model-internal modification
- [Structured Generation for LLM Evaluations](https://www.comet.com/site/blog/structured-generation-llm-as-a-judge/) - Using schemas to constrain output

### Context and Testing
- [Context Engineering Guide 2026](https://codeconductor.ai/blog/context-engineering/) - Managing context window effectively
- [Generative AI Testing Tools](https://www.accelq.com/blog/generative-ai-testing-tools/) - Testing AI outputs for correctness

### Existing Cue Codebase
- geminiService.ts - Current generation prompts and teleprompter rules
- types.ts - Slide interface, GenerationInput structure
- enhancementPrompts.ts - Preservation patterns from document enhancement feature

---

*Pitfalls research: 2026-02-01*
