# Phase 65: Foundation Types + Phase Detection - Research

**Researched:** 2026-02-14
**Domain:** TypeScript type system extension, regex-based pedagogical phase detection, .cue file persistence
**Confidence:** HIGH

## Summary

Phase 65 adds a `LessonPhase` type and optional `lessonPhase` field to the `Slide` interface, builds a regex-based phase detection module that identifies lesson phases (Hook, I Do, We Do, We Do Together, You Do, Plenary) from lesson plan text, wires phase detection into the generation flow for Fresh and Blend modes only, and ensures phase labels persist across save/load cycles in the .cue file format.

This is a purely additive change with zero risk to existing functionality. The `lessonPhase` field is optional on `Slide`, so existing slides, existing .cue files, and all existing generation flows continue to work unchanged. No new npm dependencies are needed. No file format version bump is required (the field is optional and `undefined` for old files). The phase detection module follows the established `contentPreservation/detector.ts` pattern: pure functions, regex-based, deterministic, no AI calls.

The primary technical challenge is building a comprehensive synonym dictionary for UK/Australian teaching terminology. Phase labels like "Modelled Practice" (maps to I Do), "Guided Practice" (maps to We Do), and "Independent Practice" (maps to You Do) must be recognized alongside the canonical labels. The detection must avoid false positives from natural English text (e.g., "I do not recommend..." must not match "I Do").

**Primary recommendation:** Build phase detection as a two-stage approach: (1) detect phase boundaries in lesson plan text via regex, producing a `PhaseDetectionResult`, and (2) assign `lessonPhase` to generated slides by passing detected phases as context to the AI during generation AND as a fallback post-processing step on generated slide titles/content.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.8.2 | Type definitions (LessonPhase, extended Slide) | Already in codebase, discriminated unions are the established pattern |
| No new deps | N/A | Phase detection is pure regex | Follows contentPreservation/detector.ts precedent |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new deps | N/A | N/A | N/A |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom regex detector | compromise/natural (NLP) | Overkill for finite vocabulary; adds dependency for no gain |
| Client-side regex | AI-based phase detection | Regex: 0ms, deterministic. AI: 3s, non-deterministic, costs API quota |

**Installation:**
```bash
# No installation needed -- zero new dependencies
```

## Architecture Patterns

### Recommended Project Structure
```
services/
  phaseDetection/
    phaseDetector.ts         # Main detection function + slide assignment
    phasePatterns.ts         # Synonym dictionary + regex patterns
    phaseDetector.test.ts    # Unit tests for detection accuracy
types.ts                     # LessonPhase type, lessonPhase? on Slide
services/
  saveService.ts             # No changes needed (lessonPhase serializes naturally)
  loadService.ts             # No changes needed (optional field, undefined for old files)
  geminiService.ts           # Wire phase detection into generation flow
  providers/claudeProvider.ts # Wire phase detection into generation flow
```

### Pattern 1: Phase Detection on Lesson Plan Text (Pre-Generation)
**What:** Regex-based detection of pedagogical phase boundaries in the raw lesson plan text, BEFORE sending to AI. Results are passed as context in the generation prompt so the AI can assign `lessonPhase` to each slide.
**When to use:** Fresh and Blend modes (lesson plan text is available).
**Why this approach:** The requirement (PHASE-02) specifies regex on lesson plan text. This gives the AI structured phase information to assign correctly, rather than hoping it infers phases on its own. It also enables phase detection to work on the FULL lesson plan text before any truncation occurs (avoiding Pitfall 3 from the v5.0 research).

```typescript
// services/phaseDetection/phaseDetector.ts
// Source: Codebase pattern from contentPreservation/detector.ts

export interface DetectedPhase {
  phase: LessonPhase;
  startPosition: number;  // Character offset in lesson plan text
  endPosition: number;
  matchedKeyword: string; // The actual text that matched (e.g., "Modelled Practice")
  confidence: 'high' | 'medium';
}

export interface PhaseDetectionResult {
  phases: DetectedPhase[];
  hasExplicitPhases: boolean;  // True if lesson plan uses recognizable phase labels
}

export function detectPhasesInText(text: string): PhaseDetectionResult {
  // Scan for phase markers at structural positions (start of line, after headings)
  // Return detected phases sorted by position
}
```

### Pattern 2: Post-Processing Fallback on Generated Slides
**What:** After slide generation, if the AI did not assign `lessonPhase` (or assigned it inconsistently), classify slides by scanning their titles and content for phase keywords. Also apply positional heuristics (first slide = hook, last slide = plenary).
**When to use:** As a fallback when AI output lacks phase metadata, or for Blend mode where AI might not follow phase instructions perfectly.

```typescript
// services/phaseDetection/phaseDetector.ts

export function assignPhasesToSlides(
  slides: Slide[],
  detectedPhases: PhaseDetectionResult
): Slide[] {
  return slides.map((slide, index) => {
    if (slide.lessonPhase) return slide; // Already assigned (e.g., by AI)
    const phase = classifySlideByContent(slide, index, slides.length);
    return phase ? { ...slide, lessonPhase: phase } : slide;
  });
}
```

### Pattern 3: Optional Field on Existing Interface (Non-Breaking Extension)
**What:** Add `lessonPhase?: LessonPhase` to the `Slide` interface as an optional field.
**When to use:** Any time you extend a type that is serialized to JSON and persisted in .cue files.
**Why:** This is a non-breaking change. Existing slides have `lessonPhase === undefined`. Existing .cue files load without modification. No file version migration needed. This pattern is already established in the codebase (e.g., `verbosityCache?`, `slideType?`, `source?`, `originalPastedImage?`).

```typescript
// types.ts -- non-breaking addition
export type LessonPhase = 'hook' | 'i-do' | 'we-do' | 'we-do-together' | 'you-do' | 'plenary';

export interface Slide {
  // ... existing fields unchanged ...
  lessonPhase?: LessonPhase;
}
```

### Pattern 4: Mode-Gated Feature (Fresh/Blend Only)
**What:** Phase detection is only invoked when `input.mode === 'fresh'` or `input.mode === 'blend'`. Refine mode skips phase detection entirely.
**When to use:** Features that depend on a lesson plan being the primary source.
**Why:** Refine mode operates on arbitrary PowerPoint presentations that may not follow the GRR pedagogical model at all. Forcing phase labels on arbitrary presentations would produce nonsensical labels. The existing mode gating pattern is established in `getDetectionSource()` and `getMinConfidenceForMode()` in `geminiService.ts`.

```typescript
// In generation flow:
if (input.mode !== 'refine') {
  const phaseResult = detectPhasesInText(input.lessonText);
  // Pass to AI and/or post-process slides
}
```

### Anti-Patterns to Avoid
- **Adding lessonPhase to the AI response schema as the ONLY detection mechanism:** The AI might ignore or inconsistently assign the field during the complex task of slide generation. Use regex detection as the primary mechanism and AI assignment as supplementary.
- **Bumping CURRENT_FILE_VERSION for this change:** The field is optional. Old files load fine with `lessonPhase === undefined`. Only bump the file version when a field is REQUIRED or when migration logic is needed.
- **Detecting phases in Refine mode:** Arbitrary PPTs don't follow GRR. This would produce garbage labels.
- **Using case-insensitive matching without structural guards:** "I do not recommend" must not match "I Do". Require start-of-line or heading context.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File persistence | Custom serialization for lessonPhase | JSON.stringify/parse (already used) | lessonPhase is a string literal, serializes natively |
| File migration | Version bump + migration logic | Nothing (optional field) | Additive optional fields don't need migration |
| Phase detection NLP | Natural language processing | Regex patterns | Finite vocabulary, 0ms vs 3s, deterministic |
| Mode detection | New mode field | Existing `input.mode` from `GenerationInput` | `GenerationMode = 'fresh' \| 'refine' \| 'blend'` already exists |

**Key insight:** Phase 65 is a foundation phase. Every decision should prioritize simplicity and non-breaking changes. The complexity lives in the synonym dictionary, not in architecture.

## Common Pitfalls

### Pitfall 1: False Positive Phase Detection in Body Text
**What goes wrong:** The lesson plan text contains "I do not recommend this approach" and the detector matches "I Do" from "I do not".
**Why it happens:** Naive regex matching without structural context.
**How to avoid:** Require phase markers to be at structural positions:
- Must be at the start of a line (after `\n`, `^`, or after a bullet/number marker)
- Must be followed by colon, dash, em-dash, newline, or end-of-line
- Case-sensitive for exact phase labels: "I Do" (title case) matches, "I do" (lower case) does not
- For longer synonyms like "Independent Practice", case-insensitive is safe (these phrases rarely appear casually)
**Warning signs:** Tests that use simple `text.includes('I Do')` instead of regex with anchors.

### Pitfall 2: Missing the "We Do Together" Phase
**What goes wrong:** The LessonPhase type only has 5 values (hook, i-do, we-do, you-do, plenary), missing the "We Do Together" variant. The roadmap and requirements explicitly list 6 phases.
**Why it happens:** Standard GRR model documentation only describes 3-4 phases. The "We Do Together" is a UK/Australian expansion where students work collaboratively with peers (less teacher scaffolding than "We Do").
**How to avoid:** Include `'we-do-together'` as a distinct value in the LessonPhase union. Detection keywords: "We Do Together", "Collaborative Practice", "Partner Work", "Peer Practice", "You Do Together".
**Warning signs:** The type definition having only 5 members instead of 6.

### Pitfall 3: Inconsistent Phase Assignment Between Providers
**What goes wrong:** If phase detection relies on the AI response schema, Gemini might assign phases differently than Claude. Tests pass on one provider but fail on the other.
**Why it happens:** Different AI models interpret schema enums differently.
**How to avoid:** Phase detection is CLIENT-SIDE regex, independent of the AI provider. Both providers receive the same detected phase context in their prompts, and the post-processing fallback uses the same `assignPhasesToSlides()` function regardless of provider.
**Warning signs:** Provider-specific logic in phase detection code.

### Pitfall 4: Phase Labels Not Surviving Save/Load Cycle
**What goes wrong:** Phase labels are assigned after generation but are stripped during save or lost during load because the code doesn't include them in serialization.
**Why it happens:** If the `createCueFile()` function or the `readCueFile()` function filters or transforms slide data in ways that drop unknown fields.
**How to avoid:** Verify that `lessonPhase` appears in saved .cue file JSON and is present on slides after `readCueFile()`. The current save/load code passes through all Slide fields via spread operator, so this should work automatically. Write an explicit test.
**Warning signs:** Save/load integration test missing.

### Pitfall 5: Stale Phase Detection from Truncated Lesson Plans
**What goes wrong:** Phase detection runs on truncated lesson plan text (e.g., MAX_LESSON_PLAN_CHARS = 8000). If the "You Do" section starts at character 9000, it's never detected.
**Why it happens:** Token limits require truncation for AI prompts, and the same text might be reused for detection.
**How to avoid:** Run phase detection on the FULL lesson plan text BEFORE any truncation. Pass the phase detection result (which is small) alongside the potentially truncated text.
**Warning signs:** `detectPhasesInText()` being called on already-truncated text.

### Pitfall 6: Refine Mode Accidentally Getting Phase Labels
**What goes wrong:** A teacher uploads just a PowerPoint (Refine mode), and generated slides get nonsensical phase labels like "I Do" on a title slide.
**Why it happens:** The phase detection guard checks the wrong condition, or the mode is misidentified.
**How to avoid:** The mode guard should be explicit: `if (input.mode === 'fresh' || input.mode === 'blend')`. Do NOT use `if (input.mode !== 'refine')` because future modes might be added. Test Refine mode specifically to verify no `lessonPhase` is set.
**Warning signs:** Slides generated in Refine mode having any `lessonPhase` value.

## Code Examples

Verified patterns from the codebase:

### LessonPhase Type Definition
```typescript
// types.ts -- add after SlideSource type
// Source: Requirements PHASE-01, Architecture research v5.0

export type LessonPhase = 'hook' | 'i-do' | 'we-do' | 'we-do-together' | 'you-do' | 'plenary';
```

### Slide Interface Extension
```typescript
// types.ts -- add to Slide interface
// Source: Existing pattern (verbosityCache?, slideType?, source?)

export interface Slide {
  // ... all existing fields unchanged ...
  lessonPhase?: LessonPhase;
}
```

### Phase Synonym Dictionary (UK/Australian Terminology)
```typescript
// services/phaseDetection/phasePatterns.ts
// Source: NSW Dept of Education, Third Space Learning, Brolga Education, REQUIREMENTS.md

import { LessonPhase } from '../../types';

interface PhasePattern {
  phase: LessonPhase;
  /** Structural markers: must appear at start of line, heading, or after bullet */
  structuralPatterns: RegExp[];
  /** Content markers: appear within body text of a section */
  contentPatterns: RegExp[];
}

export const PHASE_PATTERNS: PhasePattern[] = [
  {
    phase: 'hook',
    structuralPatterns: [
      /^[\s*\-#]*(?:Hook|Starter|Warm[\s-]?Up|Do\s+Now|Engage|Opener|Activation|Tuning\s+In)\s*[:\-\u2013\u2014\n]/mi,
    ],
    contentPatterns: [
      /what do you already know/i,
      /think[\s-]pair[\s-]share/i,
    ],
  },
  {
    phase: 'i-do',
    structuralPatterns: [
      /^[\s*\-#]*(?:I\s+Do|Modell?(?:ed|ing)\s*(?:Practice)?|Direct\s+Instruction|Teacher\s+(?:Model(?:ling)?|Demonstrat(?:es?|ion))|Main\s+Teaching|Explicit\s+Teaching|Explicit\s+Instruction|Input)\s*[:\-\u2013\u2014\n]/mi,
    ],
    contentPatterns: [
      /watch (?:how|me|carefully)/i,
      /let me show you/i,
      /teacher (?:models?|explains?|demonstrates?)/i,
    ],
  },
  {
    phase: 'we-do',
    structuralPatterns: [
      /^[\s*\-#]*(?:We\s+Do|Guided\s+Practice|Shared\s+(?:Practice|Activity|Writing)|Joint\s+(?:Activity|Construction)|Together\s+Time)\s*[:\-\u2013\u2014\n]/mi,
    ],
    contentPatterns: [
      /(?:work|do this|try this|let's try) together/i,
      /as a (?:class|group|whole class)/i,
    ],
  },
  {
    phase: 'we-do-together',
    structuralPatterns: [
      /^[\s*\-#]*(?:We\s+Do\s+Together|Collaborative\s+Practice|Partner\s+(?:Work|Practice|Activity)|Peer\s+Practice|You\s+Do\s+Together|Group\s+(?:Work|Activity|Practice))\s*[:\-\u2013\u2014\n]/mi,
    ],
    contentPatterns: [
      /with (?:your|a) partner/i,
      /in (?:your|small) groups?/i,
      /discuss with (?:your|a) (?:partner|neighbour|neighbor)/i,
    ],
  },
  {
    phase: 'you-do',
    structuralPatterns: [
      /^[\s*\-#]*(?:You\s+Do|Independent\s+Practice|Independent\s+(?:Work|Activity|Task)|Your\s+Turn|Applying|Application|Student\s+Activity|On\s+Your\s+Own)\s*[:\-\u2013\u2014\n]/mi,
    ],
    contentPatterns: [
      /on your own/i,
      /independently/i,
      /complete the (?:task|activity|worksheet|exercise)/i,
    ],
  },
  {
    phase: 'plenary',
    structuralPatterns: [
      /^[\s*\-#]*(?:Plenary|Review|Recap|Reflect(?:ion)?|Summar(?:y|ise|ize)|Closing|Wrap[\s-]?Up|Exit\s+Ticket|Self[\s-]?Assessment|Debrief|Consolidat(?:e|ion))\s*[:\-\u2013\u2014\n]/mi,
    ],
    contentPatterns: [
      /what (?:did we|have we|have you) learn/i,
      /key takeaway/i,
      /today we (?:learned|learnt|explored|discovered)/i,
      /thumbs up/i,
    ],
  },
];
```

### Mode Gating (Existing Pattern)
```typescript
// Source: geminiService.ts line 107-115

function getDetectionSource(input: GenerationInput): string {
  switch (input.mode) {
    case 'fresh':
      return input.lessonText;
    case 'refine':
      return input.presentationText || '';
    case 'blend':
      return input.lessonText;
  }
}

// Phase detection guard (new):
function shouldDetectPhases(mode: GenerationMode): boolean {
  return mode === 'fresh' || mode === 'blend';
}
```

### Integration into Generation Flow
```typescript
// In geminiService.ts generateLessonSlides(), after line 276 (teachable moments):
// Source: Follows exact same pattern as content preservation detection

if (shouldDetectPhases(input.mode)) {
  const phaseResult = detectPhasesInText(input.lessonText);
  // Pass phase context to AI via prompt injection (Pattern 4 from architecture)
  // Post-process generated slides as fallback
}
```

### CueFile Persistence (Already Works)
```typescript
// Source: saveService.ts createCueFile() and loadService.ts readCueFile()
// No changes needed. lessonPhase is an optional string on Slide.
// JSON.stringify naturally includes it. JSON.parse naturally restores it.
// The spread operator in createCueFile passes through all Slide fields.

// Verification test (pseudo-code):
const slide: Slide = { id: '1', title: 'Hook', content: [], speakerNotes: '', imagePrompt: '', lessonPhase: 'hook' };
const file = createCueFile('Test', [slide], [], '');
const json = JSON.stringify(file);
const parsed = JSON.parse(json) as CueFile;
assert(parsed.content.slides[0].lessonPhase === 'hook'); // Passes
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No phase metadata on slides | Add optional `lessonPhase` field | v5.0 (this phase) | Enables phase badges, balance indicators, phase-aware features |
| AI-only phase classification | Regex pre-detection + AI assignment + regex post-processing fallback | v5.0 | Instant, deterministic, provider-agnostic |
| Single `'we-do'` phase | Separate `'we-do'` and `'we-do-together'` | v5.0 | Matches real UK/Australian lesson plan structure |

**Deprecated/outdated:**
- No deprecations -- this is a purely additive feature.

## Phase Detection Strategy: Two Approaches Reconciled

The v5.0 research documents contain two different detection strategies. Both are valid and should be combined:

### Strategy A: Pre-Generation Detection on Lesson Plan Text (Primary)
- Scan the raw lesson plan text for phase boundary markers
- Produces `PhaseDetectionResult` with character positions
- Pass detected phases as structured context in the AI generation prompt
- This is what PHASE-02 requires: "regex pattern matching on lesson plan text"
- Advantage: Works on the FULL text before truncation
- Advantage: Gives the AI explicit phase context for better slide assignment

### Strategy B: Post-Generation Detection on Generated Slide Titles/Content (Fallback)
- After AI generates slides, scan slide titles and content for phase keywords
- Assign `lessonPhase` to any slide that the AI did not tag
- Also applies positional heuristics (first slide = hook, last slide = plenary)
- This handles the case where the AI ignores or misassigns phase labels (Pitfall 5 from v5.0 research)
- Advantage: Catches slides the AI forgot to tag

**Recommendation:** Use BOTH. Strategy A is primary (pre-generation). Strategy B is fallback (post-generation). The `phaseDetector.ts` module exports functions for both.

## Phase Taxonomy (6 Phases)

Based on the requirements (PHASE-01) and roadmap, the system uses 6 phases:

| Phase ID | Display Label | UK/Australian Synonyms | Detection Confidence |
|----------|--------------|----------------------|---------------------|
| `hook` | Hook / Starter | Hook, Starter, Warm-Up, Do Now, Engage, Opener, Activation, Tuning In | HIGH -- distinctive terms |
| `i-do` | I Do (Modelling) | I Do, Modelling, Modelled Practice, Direct Instruction, Teacher Models, Main Teaching, Explicit Teaching, Explicit Instruction, Input | HIGH -- well-established terms |
| `we-do` | We Do (Guided) | We Do, Guided Practice, Shared Practice, Shared Activity, Joint Activity, Joint Construction, Together Time | HIGH -- well-established terms |
| `we-do-together` | We Do Together | We Do Together, Collaborative Practice, Partner Work, Peer Practice, You Do Together, Group Work, Group Activity | MEDIUM -- less standardized, overlaps with we-do |
| `you-do` | You Do (Independent) | You Do, Independent Practice, Independent Work, Your Turn, Application, Applying, Student Activity, On Your Own | HIGH -- well-established terms |
| `plenary` | Plenary / Review | Plenary, Review, Recap, Reflection, Summary, Closing, Wrap-Up, Exit Ticket, Self-Assessment, Debrief, Consolidation | HIGH -- distinctive terms |

**Note on "We Do Together" vs "We Do":** The distinction is that "We Do" is teacher-led guided practice (teacher walks through with class), while "We Do Together" is student-led collaborative practice (students work with peers, teacher circulates). Detection priority: match "We Do Together" patterns BEFORE "We Do" patterns to avoid the longer phrase being consumed by the shorter.

## File Format Impact

**No file version bump needed.** The `lessonPhase` field is optional on `Slide`. Existing .cue files (version 4) will load correctly -- `lessonPhase` will be `undefined` for all slides in old files. This is the same pattern used for `verbosityCache?`, `slideType?`, `source?`, and `originalPastedImage?`.

The `CURRENT_FILE_VERSION` remains at `4`. The `migrateFile()` function in `loadService.ts` does not need a new migration step.

Save verification: `createCueFile()` spreads all slide fields into the saved JSON. `lessonPhase` is a string literal, so `JSON.stringify` handles it natively.

## Open Questions

1. **Distinguishing "We Do" from "We Do Together" in ambiguous text**
   - What we know: Both involve collaborative work. "We Do" is teacher-scaffolded, "We Do Together" is peer-scaffolded.
   - What's unclear: When lesson plan text says "Partner work" without clear scaffolding context, which phase is it?
   - Recommendation: Default to `we-do-together` for partner/group keywords. Default to `we-do` for teacher-led keywords. If both match, prefer `we-do-together` (more specific).

2. **What to do when no phases are detected**
   - What we know: Some lesson plans don't use GRR terminology at all (e.g., "Lesson 1: Fractions" with no phase labels).
   - What's unclear: Should we apply positional heuristics (first slide = hook, last = plenary) even when no textual evidence exists?
   - Recommendation: Only apply positional heuristics when `hasExplicitPhases === false` AND at least 5 slides exist. For decks with 1-4 slides, leave phases as `undefined`.

3. **How phase context enters the AI generation prompt**
   - What we know: The v5.0 architecture suggests appending a `=== LESSON PHASE BOUNDARIES ===` section to the prompt.
   - What's unclear: The exact prompt wording to maximize AI compliance in assigning `lessonPhase` per slide.
   - Recommendation: This is Phase 68 territory (resource injection + prompt changes). For Phase 65, build the detection module and the types. The prompt integration will follow when the generation pipeline (Phase 67) and phase-aware UI (Phase 68) are built. For Phase 65, the minimum viable integration is: add `lessonPhase` to the response schema and call `assignPhasesToSlides()` as post-processing on generated slides.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `types.ts` (Slide interface, line 10-37), `services/saveService.ts` (createCueFile, serialization), `services/loadService.ts` (readCueFile, migration), `services/aiProvider.ts` (GenerationMode, GenerationInput), `services/geminiService.ts` (getSystemInstructionForMode, generateLessonSlides)
- Codebase analysis: `services/contentPreservation/detector.ts` (regex detection pattern), `services/contentPreservation/types.ts` (detection types pattern)
- `.planning/REQUIREMENTS.md` (PHASE-01 through PHASE-07)
- `.planning/ROADMAP.md` (Phase 65 definition and success criteria)

### Secondary (MEDIUM confidence)
- [NSW Department of Education: Gradual Release of Responsibility](https://education.nsw.gov.au/teaching-and-learning/curriculum/explicit-teaching/explicit-teaching-strategies/gradual-release-of-responsibility) -- Australian teaching terminology
- [Third Space Learning: I Do We Do You Do](https://thirdspacelearning.com/blog/i-do-we-do-you-do/) -- UK primary school lesson structure and terminology
- `.planning/research/ARCHITECTURE-v5.0-smart-generation.md` -- v5.0 architecture patterns, PhaseDetector design
- `.planning/research/ARCHITECTURE-v5-smart-generation.md` -- Earlier architecture research with post-processing approach
- `.planning/research/PITFALLS-v5.0-smart-generation.md` -- Phase detection pitfalls #3, #5, #7, #9
- `.planning/research/STACK.md` -- Stack analysis confirming zero new dependencies needed

### Tertiary (LOW confidence)
- [Classwork: I Do We Do You Do](https://classwork.com/i-do-we-do-you-do-strategy-gradual-release-strategy/) -- GRR model terminology (generic, not AU/UK specific)
- [Structural Learning: I Do We Do You Do](https://www.structural-learning.com/post/i-do-we-do-you-do) -- Confirmed 3-phase model only (no "We Do Together" evidence)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns exist in codebase
- Architecture: HIGH -- follows established contentPreservation/detector.ts pattern exactly
- Phase taxonomy: HIGH -- 5 of 6 phases are well-documented in GRR literature; "We Do Together" is MEDIUM (less standardized but listed in requirements)
- Pitfalls: HIGH -- verified against v5.0 research, false positive prevention tested against codebase patterns
- Persistence: HIGH -- verified that optional fields survive save/load cycle in existing code

**Research date:** 2026-02-14
**Valid until:** 60 days (stable domain -- pedagogical phase terminology doesn't change)
