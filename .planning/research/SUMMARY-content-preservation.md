# Project Research Summary

**Project:** Cue v3.8 - Preserve Teacher Content
**Domain:** Prompt engineering for AI-powered educational slide generation
**Researched:** 2026-02-01
**Confidence:** HIGH

## Executive Summary

Content preservation in Cue is fundamentally a **prompt engineering challenge**, not an architectural one. The existing system already passes full lesson text to AI providers and produces structured slide output. The problem is that LLMs are trained to be helpful by transforming, summarizing, and "improving" content, which causes them to generalize specific questions like "Calculate 24 x 15" into vague prompts like "practice multiplication." The solution is to teach the AI to distinguish between content that should be transformed (explanatory text) and content that must be preserved verbatim (teacher-specified questions, activities, and instructions).

The recommended approach is a three-layer strategy: (1) heuristic-based detection of preservable content using regex patterns before sending to AI, (2) XML-tagged prompting that wraps preserved content in explicit `<preserve>` markers with few-shot examples showing correct vs incorrect behavior, and (3) optional post-generation validation using Levenshtein distance to surface any modifications for teacher review. No new libraries are required beyond the existing stack; the solution is additive to current prompts.

The primary risk is the "helpful transformation instinct" where the AI ignores preservation instructions and paraphrases anyway. This is mitigated through explicit negative examples in prompts ("WRONG: 'What fraction represents...' CORRECT: 'What is 3/4 of 12?'"), numbered item tracking to prevent the AI from "forgetting" items during long generation, and ensuring teleprompter scripts receive preserved content as required context so they don't desynchronize from slides. A secondary risk is breaking existing generation quality; this requires establishing baseline metrics before implementation.

## Key Findings

### Recommended Stack

No new dependencies required. This is a prompt-only enhancement to the existing architecture.

**Core techniques:**
- **XML-tagged preservation blocks:** Wrap content in `<preserve type="question">` tags for clear semantic boundaries
- **Few-shot exemplars:** 2-3 examples showing correct vs incorrect preservation (diminishing returns after 3)
- **Heuristic detection:** Regex patterns for questions (ending in ?), activities ("In pairs...", "Draw..."), and numbered lists
- **Levenshtein validation (optional):** Post-generation fuzzy matching to verify preservation (fastest-levenshtein, ~300kb weekly npm downloads)

**Why no new libraries:**
- Pattern detection is simple regex, not NLP
- XML tags work natively with both Gemini and Claude
- Existing `GenerationInput` type already passes full lesson text
- Response schemas already support string arrays for slide content

### Expected Features

**Must have (table stakes):**
- Specific questions preserved verbatim on slides (e.g., "What would happen if we removed all the bees?" stays exact)
- Math problems with specific numbers intact (e.g., "24 x 15" not "multiplication practice")
- Activity instructions preserved step-by-step (e.g., "1. Cut paper in half 2. Fold on dotted line")
- Teleprompter includes preserved content so teacher can read exact questions aloud
- Works across Fresh, Refine, and Blend modes

**Should have (differentiators):**
- Automatic detection without teacher markup (no `[PRESERVE]` tags required)
- Visual indicator showing which content was preserved vs AI-generated
- Preservation count feedback ("3 questions preserved from your lesson plan")

**Defer (v2+):**
- Teacher override UI ("use original" vs "use AI version")
- Per-slide preservation settings
- Explicit preservation markers for power users

### Architecture Approach

The solution requires prompt-layer changes only. A new `services/prompts/contentPreservationRules.ts` module (following the existing `studentFriendlyRules.ts` pattern) will export preservation instructions. These get injected into `getSystemInstructionForMode()` in geminiService.ts and `getSystemPromptForMode()` in claudeProvider.ts for all three generation modes.

**Major components:**
1. **Content detector** (`services/contentPreservation/detector.ts`) — Regex-based detection of questions, activities, and instructions before AI call
2. **Preservation rules** (`services/prompts/contentPreservationRules.ts`) — System prompt instructions with XML tag format and few-shot examples
3. **Post-validation** (`services/contentPreservation/validator.ts`, optional) — Levenshtein matching to flag modifications for teacher review

**Files to modify:**
- `services/aiProvider.ts` — Add `preservedContent` to GenerationInput type
- `services/geminiService.ts` — Inject preservation rules into system prompt
- `services/providers/claudeProvider.ts` — Inject preservation rules into system prompt

### Critical Pitfalls

1. **Helpful transformation instinct** — LLMs are trained to summarize and improve, not reproduce verbatim. Mitigate with explicit XML markers, negative examples showing incorrect paraphrasing, and post-validation checks.

2. **Teleprompter-slide desynchronization** — Teleprompter scripts may not properly reference preserved questions if generated independently. Mitigate by passing preserved content as required context to teleprompter generation.

3. **State tracking amnesia** — AI may forget middle items when preserving 5+ questions across multiple slides. Mitigate with explicit numbering ("PRESERVED ITEM 1 OF 5") and post-generation count validation.

4. **Breaking existing generation quality** — Adding preservation constraints may degrade teleprompter quality or layout selection. Mitigate by establishing baseline quality metrics BEFORE implementation and running A/B comparisons.

5. **Context window pollution** — Verbose preservation instructions compete for attention with existing teleprompter/layout rules. Mitigate by measuring token budget, keeping instructions concise, and placing preservation rules near end of prompt (recency bias).

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Preservation Rules and Detection

**Rationale:** Foundation must exist before integration. Detection patterns and prompt rules are decoupled from providers, enabling isolated testing.

**Delivers:**
- `contentPreservationRules.ts` with XML tag format and few-shot examples
- `detector.ts` with regex patterns for questions, activities, numbered lists
- Test fixtures with preservation scenarios

**Addresses:**
- Math problem preservation (highest visibility failure)
- Question preservation (core user expectation)

**Avoids:**
- Formatting destruction pitfall (detection happens on clean text)
- Extraction false positives (clear classification criteria)

### Phase 2: Provider Integration

**Rationale:** Both providers must support preservation equally. Gemini is primary, Claude is secondary. Integration tests ensure parity.

**Delivers:**
- Modified `geminiService.ts` with preservation rules in all three modes
- Modified `claudeProvider.ts` with equivalent rules
- Teleprompter prompts updated to receive preserved content as context
- `GenerationInput` extended with `preservedContent` field

**Addresses:**
- Activity instruction preservation
- Teleprompter includes preserved content
- Consistent preservation across modes

**Avoids:**
- Teleprompter-slide desync (explicit context passing)
- State tracking amnesia (numbered item tracking)
- Provider behavior divergence (test both with identical inputs)

### Phase 3: Validation and Polish

**Rationale:** Post-validation is optional but valuable for teacher trust. UI indicators provide feedback without blocking core flow.

**Delivers:**
- Optional Levenshtein-based post-validation
- Warning toast for modified content ("1 activity may have been modified")
- Preservation count feedback in UI

**Addresses:**
- Visual indicator for preserved content
- Preservation count feedback

**Avoids:**
- Validation complexity explosion (start with exact substring match)
- Slide fit violations (detect long content, suggest dedicated layouts)

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** Cannot integrate rules that don't exist. Detection and rules are testable in isolation.
- **Phase 2 before Phase 3:** Validation requires working preservation to validate. UI feedback requires preservation to count.
- **Gemini before Claude:** Gemini is primary provider; establish patterns there first, then port to Claude.
- **Detection is heuristic, not AI:** Keeps detection fast, deterministic, and debuggable. AI interprets tags, doesn't create them.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Provider Integration):** May need prompt iteration if initial rules don't achieve sufficient preservation. Plan for 2-3 prompt refinement cycles.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Detection):** Regex patterns are well-understood; no research needed.
- **Phase 3 (Validation):** Levenshtein matching is standard; fastest-levenshtein is well-documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new libraries needed; prompt-only solution verified against Anthropic docs |
| Features | HIGH | Clear user expectations from workflow analysis; competitors don't offer this |
| Architecture | HIGH | Direct codebase analysis; follows existing patterns (studentFriendlyRules.ts) |
| Pitfalls | HIGH | Verified against academic research on LLM verbatim reproduction failures |

**Overall confidence:** HIGH

The solution is well-scoped (prompt engineering), the architecture supports it (no structural changes), and the pitfalls are documented with mitigations. This is a focused enhancement, not a risky experiment.

### Gaps to Address

- **Prompt iteration cycles:** Initial preservation rules may need refinement. Budget time for 2-3 iterations based on real lesson plan testing.
- **Edge cases:** Very long questions (50+ words) may not fit slides. Need to handle gracefully (split across slides or teleprompter-only placement).
- **Answer key deduplication:** PDFs with questions on page 1 and answer key on page 5 may extract duplicates. Detection should deduplicate by similarity.

## Sources

### Primary (HIGH confidence)
- [Anthropic Claude Documentation - Use XML tags](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) — XML tags as semantic markers
- [Verbatim Data Transcription Failures in LLM Code Generation](https://arxiv.org/html/2601.03640) — State tracking and reproduction limitations
- Cue codebase analysis — geminiService.ts, claudeProvider.ts, aiProvider.ts, studentFriendlyRules.ts

### Secondary (MEDIUM confidence)
- [PromptHub Few-Shot Guide](https://www.prompthub.us/blog/the-few-shot-prompting-guide) — 2-3 example sweet spot
- [IBM Prompt Engineering Guide 2026](https://www.ibm.com/think/prompt-engineering) — Context engineering principles
- [Deterministic Quoting](https://mattyyeung.github.io/deterministic-quoting) — Pattern for verbatim quotes (informed architecture decision)
- Competitor analysis — Monsha, Chalkie, MagicSchool, Brisk, Eduaide (none offer automatic preservation)

### Tertiary (LOW confidence)
- Teacher workflow expectations inferred from AI tool research and prompt engineering guides (would benefit from direct teacher interviews)

---
*Research completed: 2026-02-01*
*Ready for roadmap: yes*
