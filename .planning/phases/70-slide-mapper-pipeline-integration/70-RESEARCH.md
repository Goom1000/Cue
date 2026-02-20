# Phase 70: Slide Mapper + Pipeline Integration - Research

**Researched:** 2026-02-21
**Domain:** Block-to-slide mapping with teleprompter segment invariant enforcement, and generation pipeline mode extension
**Confidence:** HIGH

## Summary

Phase 70 converts the `ScriptedBlock[]` output from Phase 69's parser into valid Cue `Slide[]` objects, enforces the teleprompter segment count invariant (`speakerNotes` segments = `content.length + 1`), and wires a `'scripted'` generation mode into the pipeline that bypasses all three AI passes. The phase has two distinct subsystems: (1) a pure-function slide mapper (`mapBlocksToSlides`) that groups blocks into slides based on section headings and interaction points, and (2) a pipeline integration that extends `GenerationMode` with `'scripted'` and adds an early-return path in `runGenerationPipeline`.

The Cue codebase already provides all necessary patterns. The `Slide` interface (`types.ts` line 13) defines the target shape. The `phaseDetection/phaseDetector.ts` module provides the pure-function, immutable mapping pattern. The `generationPipeline.ts` module has existing mode-gating at line 164 (`canAnalyzeGaps`) that demonstrates how to add mode-specific behavior. The `TELEPROMPTER_RULES` constant in `geminiService.ts` (lines 25-37) defines the segment count invariant that must be enforced mechanically since no AI prompt will do it. Zero new dependencies are needed.

The primary risk is the segment count invariant: the mapper must produce exactly `(content.length + 1)` segments in `speakerNotes` for every slide, using the `\u{1F449}` (pointing right) emoji as delimiter. This invariant is enforced by AI prompts in existing modes (referenced in 8+ places across geminiService.ts and claudeProvider.ts), but scripted mode must enforce it deterministically in the mapper. The second risk is regression: extending `GenerationMode` touches 6+ switch sites across two provider files and the pipeline.

**Primary recommendation:** Build the mapper as a pure-function module at `services/scriptedParser/scriptedMapper.ts` co-located with the parser. The pipeline integration modifies `services/aiProvider.ts` (type extension) and `services/generationPipeline.ts` (early-return path). Both providers (`geminiService.ts`, `claudeProvider.ts`) need `'scripted'` cases in their switch statements to compile, but those cases will never be reached since the pipeline short-circuits before calling providers.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Split slides on Ask: and Activity: blocks (interaction points) -- consecutive Say/Write blocks group together on the same slide
- Section headings (## Hook, ### I Do, etc.) always create a new slide boundary
- Maximum content bullets per slide: as many as visually fit on the slide without overflowing. Auto-split to a continuation slide if content would go off-screen
- Short single-sentence Activity: blocks are absorbed as a content bullet on the current slide rather than spawning a separate work-together slide. Substantial multi-step activities get their own work-together slide
- Ask: and Write on board: blocks both become plain-text content[] bullets -- no labels, no "Q:" or "Board:" prefixes
- Scripted slide content bullets match the visual style of existing AI-generated Cue slides
- One content bullet per Ask: block -- multi-sentence questions are not split into separate bullets
- hasQuestionFlag is metadata only -- no visual indicator on the slide from the mapper (existing teachable moment system handles question detection at presentation time)
- Substantial Activity: blocks produce work-together typed slides with activity instructions parsed into content[] bullets (step-by-step)
- Short single-sentence Activity: blocks are absorbed into the preceding slide as a regular content bullet
- Full activity facilitation text goes into speakerNotes for the teleprompter
- Say: text maps to the segment BEFORE the next content bullet reveal -- "say this, then show that" pattern
- Multiple consecutive Say: blocks before a single content bullet merge into one segment with paragraph breaks (\n\n) preserved between them
- Empty segments are acceptable -- if no Say: block precedes a content bullet, that segment is empty. Respects the lesson plan as written
- Trailing Say: blocks (after the last content bullet on a slide) fill the final segment -- they wrap up the current slide's context

### Claude's Discretion
- Continuation slide titling (same title vs "(cont.)" suffix)
- Implicit Say: block treatment (identical to explicit vs flagged)
- Timer/duration detection from Activity: block text
- Short vs substantial Activity: threshold heuristic (single line vs multi-line, or character count -- Claude picks)
- Exact content bullet overflow threshold for auto-splitting

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAP-01 | Mapper converts `ScriptedBlock[]` to `Slide[]` with correct field mapping (Say: -> speakerNotes, Write on board: -> content[], Ask: -> content[] with hasQuestionFlag) | Slide interface at `types.ts:13` defines target shape. Say: blocks become segments in `speakerNotes` delimited by `\u{1F449}`. Write-on-board and Ask blocks become plain-text entries in `content: string[]`. Ask blocks also set `hasQuestionFlag: true`. Activity blocks produce `slideType: 'work-together'` slides. Section-heading blocks set slide `title` and trigger new slide boundaries. |
| MAP-02 | Mapper enforces segment count invariant: speakerNotes has exactly (content.length + 1) segments per slide | The invariant is defined in `TELEPROMPTER_RULES` (geminiService.ts:36) and referenced in 8+ prompt locations. The mapper must count content bullets per slide, then produce exactly `N+1` segments using the `\u{1F449}` delimiter. The "say this, then show that" pattern from CONTEXT.md maps naturally: segment[0] = intro/first Say before any content, segment[i] = Say before content[i], segment[N] = trailing Say after last content. Empty segments are acceptable per user decision. |
| MAP-03 | Mapper creates slide boundaries only on section headings and phase transitions (not per-marker) | Per CONTEXT.md: section headings always create new slide boundaries. Ask: and Activity: blocks create interaction-point boundaries. Consecutive Say/Write blocks group together. The mapper walks blocks sequentially, accumulating onto the current slide until a boundary trigger is encountered. |
| MAP-04 | Mapper assigns lessonPhase from section headings using existing phase detection patterns | `SectionLabel` from parser (`'Hook' | 'I Do' | 'We Do' | 'You Do' | 'Plenary'`) maps directly to `LessonPhase` from `types.ts:11` (`'hook' | 'i-do' | 'we-do' | 'you-do' | 'plenary'`). The mapper sets `lessonPhase` on each slide based on the current section context. No need for `phaseDetector.ts` -- the parser already identified sections. |
| MAP-05 | Mapper sets `slideType: 'work-together'` on slides generated from Activity: blocks | Substantial Activity: blocks produce slides with `slideType: 'work-together'` and `layout: 'work-together'`. Activity instructions are parsed into `content[]` bullets (step-by-step). Short single-sentence activities are absorbed as regular content bullets on the current slide. Follows the existing work-together slide pattern (`geminiService.ts:845-848`). |
| PIPE-01 | `GenerationMode` type extended with `'scripted'` value across all providers and switch sites | `GenerationMode` at `aiProvider.ts:66` becomes `'fresh' | 'refine' | 'blend' | 'scripted'`. All switch sites in `geminiService.ts` (lines 110-116, 124-126, 131-236, 174-238, 346-381, 431) and `claudeProvider.ts` (lines 401-409, 417-418, 425-534, 718-824) need `'scripted'` cases. Since scripted mode bypasses providers entirely, these cases can throw "unreachable" errors or return empty values. |
| PIPE-02 | Scripted mode bypasses all three AI passes (generate, gap analysis, auto-fill) in generation pipeline | Early-return path in `runGenerationPipeline` (`generationPipeline.ts:90`). Before Pass 1, check `input.mode === 'scripted'`, call the mapper, run phase assignment, and return `PipelineResult` with `coveragePercentage: null`, `remainingGaps: []`, `wasPartial: false`. |
| PIPE-05 | Existing Fresh/Refine/Blend modes unaffected by scripted mode addition (regression-safe) | The early-return path means no shared code path changes for existing modes. The only shared change is the `GenerationMode` type extension. Switch cases in providers get a new `'scripted'` case but existing cases are untouched. The `canAnalyzeGaps` expression at `generationPipeline.ts:164` is after the early return, so it never sees scripted mode. |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.8.2 | Type-safe slide construction, discriminated union for GenerationMode | Already in project; typed Slide interface is the contract |
| Jest | ^30.2.0 | Unit tests for mapper pure function and pipeline integration | Already in project; phaseDetector.test.ts is the test pattern |

### Supporting

No supporting libraries needed. This is pure TypeScript data transformation (ScriptedBlock[] -> Slide[]) plus a single mode-gate addition in the pipeline.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sequential block walker | Functional reduce over blocks | Reduce is harder to debug/step through. The sequential walker with explicit state (like the parser's state machine) is the established codebase pattern. |
| Early-return in pipeline | New `runScriptedPipeline` function | Separate function duplicates PipelineResult construction and progress callback wiring. The existing pipeline already has mode-gating precedent (line 164). Early return is simpler. |
| Per-provider scripted cases | No-op provider that the pipeline never calls | Over-engineered. TypeScript exhaustiveness checking requires the cases. Throwing "unreachable" is the standard pattern. |

**Installation:**
```bash
# No new dependencies needed
```

---

## Architecture Patterns

### Recommended Project Structure

```
services/
  scriptedParser/
    types.ts                    # Existing: ScriptedBlock, ScriptedParseResult, etc.
    scriptedParser.ts           # Existing: parseScriptedLessonPlan()
    scriptedParser.test.ts      # Existing: 37 tests
    scriptedMapper.ts           # NEW: mapBlocksToSlides()
    scriptedMapper.test.ts      # NEW: mapper tests
  aiProvider.ts                 # MODIFIED: GenerationMode type extension
  generationPipeline.ts         # MODIFIED: scripted mode early-return path
  geminiService.ts              # MODIFIED: add 'scripted' case to switch statements
  providers/
    claudeProvider.ts           # MODIFIED: add 'scripted' case to switch statements
```

Co-locating the mapper with the parser keeps the scripted import subsystem self-contained. The mapper imports types from `./types.ts` and is imported by `generationPipeline.ts`.

### Pattern 1: Block-to-Slide Grouping (Sequential Accumulator)

**What:** Walk the `ScriptedBlock[]` array sequentially, accumulating blocks onto a "current slide" until a boundary trigger is encountered (section heading or interaction point). When a boundary fires, flush the current slide to the output array and start a new one.

**When to use:** Always -- this is the core mapping strategy.

**Why:** Mirrors the parser's line-by-line state machine pattern. The parser walks lines and accumulates blocks; the mapper walks blocks and accumulates slides. Same mental model, same debugging approach.

**Example:**

```typescript
// Source: Derived from scriptedParser.ts state machine pattern
interface SlideAccumulator {
  currentSlide: PartialSlide;
  slides: Slide[];
  currentSection: SectionLabel | null;
  currentPhase: LessonPhase | undefined;
}

function mapBlocksToSlides(blocks: ScriptedBlock[]): Slide[] {
  const state: SlideAccumulator = {
    currentSlide: createEmptyPartialSlide(),
    slides: [],
    currentSection: null,
    currentPhase: undefined,
  };

  for (const block of blocks) {
    switch (block.type) {
      case 'section-heading':
        flushSlide(state);
        state.currentSection = block.content as SectionLabel;
        state.currentPhase = sectionToPhase(block.content as SectionLabel);
        state.currentSlide.title = block.content;
        state.currentSlide.lessonPhase = state.currentPhase;
        break;

      case 'say':
        // Accumulate into speakerNotes segments
        state.currentSlide.saySegments.push(block.content);
        break;

      case 'write-on-board':
        // Add as content bullet
        state.currentSlide.contentBullets.push(block.content);
        break;

      case 'ask':
        // Add as content bullet with question flag
        state.currentSlide.contentBullets.push(block.content);
        state.currentSlide.hasQuestion = true;
        // Ask: creates an interaction-point boundary
        // But the question itself belongs on the CURRENT slide
        // Only flush if there are MORE blocks after this one
        break;

      case 'activity':
        if (isSubstantialActivity(block.content)) {
          flushSlide(state);
          // Activity gets its own work-together slide
          buildActivitySlide(state, block);
          flushSlide(state);
        } else {
          // Short activity absorbed as content bullet
          state.currentSlide.contentBullets.push(block.content);
        }
        break;
    }
  }

  flushSlide(state);
  return state.slides;
}
```

### Pattern 2: Segment Count Enforcement (Post-Processing)

**What:** After building content[] and collecting Say: blocks for a slide, construct speakerNotes by aligning Say blocks to content bullet positions. The invariant `segments.length === content.length + 1` is enforced mechanically.

**When to use:** During the `flushSlide` step, before pushing to the output array.

**Why:** The teleprompter in `PresentationView.tsx:1265` splits on `\u{1F449}` and expects exactly `content.length + 1` segments. Segment 0 is the intro (before any bullet), segment N is spoken after bullet N is revealed.

**Example:**

```typescript
// Source: TELEPROMPTER_RULES invariant (geminiService.ts:36)
// "The number of segments MUST be exactly (Number of Bullets + 1)"

function buildSpeakerNotes(
  saySegments: string[],
  contentCount: number
): string {
  const requiredSegments = contentCount + 1;

  if (saySegments.length === 0) {
    // No Say blocks at all -- create empty segments
    return Array(requiredSegments).fill('').join('\u{1F449}');
  }

  if (saySegments.length === requiredSegments) {
    // Perfect match -- each Say aligns 1:1 with a segment slot
    return saySegments.join('\u{1F449}');
  }

  if (saySegments.length > requiredSegments) {
    // More Say blocks than slots -- merge excess into appropriate segments
    // Strategy: distribute Say blocks across slots, merging with \n\n
    const merged = distributeSayBlocks(saySegments, requiredSegments);
    return merged.join('\u{1F449}');
  }

  // Fewer Say blocks than slots -- pad trailing with empty strings
  const padded = [...saySegments];
  while (padded.length < requiredSegments) {
    padded.push('');
  }
  return padded.join('\u{1F449}');
}
```

### Pattern 3: SectionLabel to LessonPhase Mapping

**What:** Map the parser's `SectionLabel` type to the `Slide.lessonPhase` type. These are the same concepts with different string formats.

**When to use:** When setting `lessonPhase` on slides from section headings.

**Example:**

```typescript
// Source: types.ts LessonPhase and scriptedParser/types.ts SectionLabel
import { LessonPhase } from '../../types';
import { SectionLabel } from './types';

const SECTION_TO_PHASE: Record<SectionLabel, LessonPhase> = {
  'Hook': 'hook',
  'I Do': 'i-do',
  'We Do': 'we-do',
  'You Do': 'you-do',
  'Plenary': 'plenary',
};

function sectionToPhase(section: SectionLabel): LessonPhase {
  return SECTION_TO_PHASE[section];
}
```

Note: `LessonPhase` also includes `'we-do-together'` but the parser's `SectionLabel` does not have a "We Do Together" option. If a lesson plan has a "We Do Together" section, the parser would match `'We Do'` (the closest canonical heading). This is acceptable -- `'we-do-together'` is a nuance handled by the `phaseDetector.ts` heuristics for AI-generated slides, not needed for explicitly-headered scripted plans.

### Pattern 4: Pipeline Early-Return for Scripted Mode

**What:** Before any AI calls in `runGenerationPipeline`, check for scripted mode and return directly from the mapper.

**When to use:** At the top of `runGenerationPipeline`, before Pass 1.

**Why:** The pipeline already has mode-gating at line 164 (`canAnalyzeGaps`). An early return for scripted mode is the cleanest approach -- it avoids touching any AI-related code paths.

**Example:**

```typescript
// Source: generationPipeline.ts, before Pass 1
import { parseScriptedLessonPlan } from './scriptedParser/scriptedParser';
import { mapBlocksToSlides } from './scriptedParser/scriptedMapper';

export async function runGenerationPipeline(
  provider: AIProviderInterface,
  input: GenerationInput,
  options: PipelineOptions
): Promise<PipelineResult> {
  // =========================================================================
  // Scripted mode: bypass all AI passes, map directly from parsed blocks
  // =========================================================================
  if (input.mode === 'scripted') {
    const parseResult = parseScriptedLessonPlan(options.lessonPlanText);
    // Use first day's blocks (day selection is Phase 72)
    const blocks = parseResult.days[0]?.blocks ?? [];
    const slides = mapBlocksToSlides(blocks);

    return {
      slides,
      coveragePercentage: null,
      remainingGaps: [],
      warnings: parseResult.warnings,
      wasPartial: false,
    };
  }

  // ... existing pipeline code unchanged ...
}
```

### Pattern 5: Slide ID Generation

**What:** Each slide needs a unique `id` string. Existing patterns use `\`slide-${Date.now()}-${index}\`` for AI-generated slides and `\`work-together-${Date.now()}\`` for work-together slides.

**When to use:** When creating slide objects in the mapper.

**Example:**

```typescript
// Source: geminiService.ts:426, claudeProvider.ts:839
const slide: Slide = {
  id: `scripted-${Date.now()}-${index}`,
  title: partialSlide.title,
  content: partialSlide.contentBullets,
  speakerNotes: buildSpeakerNotes(partialSlide.saySegments, partialSlide.contentBullets.length),
  imagePrompt: '',  // Phase 71 handles AI image prompts
  layout: 'split',  // Default; Phase 71 handles AI layout assignment
  hasQuestionFlag: partialSlide.hasQuestion || undefined,
  lessonPhase: partialSlide.lessonPhase,
  slideType: partialSlide.isWorkTogether ? 'work-together' : undefined,
};
```

### Anti-Patterns to Avoid

- **One slide per block:** The CONTEXT.md explicitly states that consecutive Say/Write blocks group together. Each block does NOT create a new slide. Only section headings and interaction points create boundaries.

- **AI-dependent segment count:** In existing modes, AI is prompted to produce the correct segment count. In scripted mode, there is NO AI. The mapper must mechanically enforce the invariant. Never rely on downstream processing to fix the count.

- **Modifying existing switch cases:** When adding `'scripted'` to provider switch statements, do NOT modify existing `'fresh'`, `'refine'`, or `'blend'` cases. Add the new case only. The early-return in the pipeline means scripted cases in providers are unreachable -- they exist only for TypeScript exhaustiveness.

- **Calling `detectPreservableContent` in scripted mode:** Content preservation detection is for AI prompt injection. Scripted mode has no AI content generation. The early-return path naturally skips this -- do not add it back.

- **Using `phaseDetector.ts` when the parser already provides sections:** The scripted parser identifies section headings with `SectionLabel` values. The mapper should use these directly. Running `detectPhasesInText` on scripted text is redundant since the parser has already parsed the exact same headings at higher precision.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Segment delimiter | Custom delimiter system | `\u{1F449}` (pointing right emoji) | The entire presentation layer (`PresentationView.tsx:1265`) splits on this specific emoji. Using anything else breaks progressive disclosure. |
| Slide ID generation | UUID library | `\`scripted-${Date.now()}-${index}\`` | Codebase pattern from `geminiService.ts:426`. No collision risk in single-user app. |
| LessonPhase from section headings | `phaseDetector.ts` re-detection | Direct `SECTION_TO_PHASE` lookup map | Parser already detected sections. A lookup is O(1) and zero-ambiguity. phaseDetector uses fuzzy matching for unstructured text -- overkill here. |
| Segment count validation | Trust the grouping logic | Explicit `segments.length === content.length + 1` assertion | The invariant is critical enough that it must be checked, not assumed. A post-processing validation catch is cheap insurance. |

**Key insight:** The mapper is a pure data transformation from one typed structure (`ScriptedBlock[]`) to another (`Slide[]`). Every sub-problem (grouping, segment building, phase mapping, ID generation) has a precedent in the codebase. The mapper composes existing patterns, it does not invent new ones.

---

## Common Pitfalls

### Pitfall 1: Segment Count Violation Breaks Teleprompter

**What goes wrong:** A slide has 3 content bullets but speakerNotes contains 2 segments (or 5 segments). The teleprompter in `PresentationView.tsx:1265` splits on the emoji delimiter and misaligns segments with bullet reveals. Teacher advances past a bullet but the teleprompter shows the wrong text, or hangs on a blank segment.

**Why it happens:** The mapper groups Say blocks and content-producing blocks (Write/Ask) independently. If a lesson plan has 4 Say blocks but only 2 Write-on-board blocks, naive concatenation produces the wrong count.

**How to avoid:** The `buildSpeakerNotes` function must take `contentCount` as input and produce exactly `contentCount + 1` segments. Three cases: (1) perfect match -- 1:1 mapping; (2) too many Say blocks -- merge adjacent ones with `\n\n` preserving paragraph breaks per CONTEXT.md; (3) too few Say blocks -- pad with empty strings (empty segments are acceptable per CONTEXT.md). Add a post-processing assertion: `slide.speakerNotes.split('\u{1F449}').length === slide.content.length + 1`.

**Warning signs:** `speakerNotes.split('\u{1F449}').length !== content.length + 1` on any output slide.

### Pitfall 2: Slide Boundary Explosion From Per-Ask Splitting

**What goes wrong:** A teacher writes a lesson plan with 15 Ask: blocks interspersed with Say: blocks. If every Ask: creates a new slide, the deck has 15+ slides when the teacher expected ~8-10.

**Why it happens:** The CONTEXT.md says Ask: blocks create interaction-point boundaries. A literal interpretation creates a new slide after every question. But many questions are embedded within a teaching sequence and should stay on the same slide.

**How to avoid:** The CONTEXT.md decision is nuanced: "Split slides on Ask: and Activity: blocks (interaction points)." This means Ask: is a POTENTIAL boundary, not an automatic one. The grouping logic should: (1) always split on section headings, (2) split on Ask: only when the current slide already has content (the question is a transition point), (3) absorb Ask: as a content bullet if it's the first block on a slide. Test with a fixture that has 10+ Ask: blocks to verify reasonable slide count.

### Pitfall 3: Work-Together Slide Missing Required Fields

**What goes wrong:** An Activity: block produces a slide with `slideType: 'work-together'` but without the `layout: 'work-together'` field. The presentation renderer does not apply the work-together visual style.

**Why it happens:** The existing work-together slide creation in `geminiService.ts:845-848` sets BOTH `slideType` AND `layout`. If the mapper only sets `slideType`, the rendering path that checks `layout` (used for visual styling) misses it.

**How to avoid:** When creating a work-together slide, set both fields: `slideType: 'work-together'` and `layout: 'work-together'`. Follow the exact pattern from `geminiService.ts:845-848`.

### Pitfall 4: TypeScript Exhaustiveness Gaps in Provider Switch Statements

**What goes wrong:** Adding `'scripted'` to `GenerationMode` causes TypeScript compilation errors in provider switch statements that don't handle the new case. Or worse, a non-exhaustive `if/else` chain silently falls through.

**Why it happens:** `GenerationMode` is checked in 6+ switch statements across `geminiService.ts` and `claudeProvider.ts`. TypeScript catches missing switch cases (with `default: never`), but `if/else` chains like `canAnalyzeGaps` at `generationPipeline.ts:164` are NOT caught.

**How to avoid:** (1) Add `'scripted'` case to every switch statement in both providers -- these throw "unreachable" since the pipeline early-returns before calling providers. (2) Audit all `if/else` expressions that check `input.mode` -- specifically `canAnalyzeGaps` at line 164. Since the scripted early-return happens before line 164, the existing expression is safe and needs no modification. (3) Search for `mode === 'fresh'`, `mode === 'refine'`, `mode === 'blend'` across the entire codebase to find all check sites.

### Pitfall 5: Empty Slides From Consecutive Section Headings

**What goes wrong:** A lesson plan has `## Hook` followed immediately by `### I Do` with no content between them. The mapper creates an empty slide for Hook (no content, no speakerNotes) that appears as a blank slide in the deck.

**Why it happens:** Each section heading triggers `flushSlide`, but if the current slide has no accumulated blocks, flushing produces an empty slide.

**How to avoid:** In `flushSlide`, skip pushing if the current slide has zero content bullets AND zero Say segments. The next section heading's title simply replaces the current slide's title. This collapses consecutive headings into a single slide.

### Pitfall 6: Short vs Substantial Activity Threshold Ambiguity

**What goes wrong:** A single-sentence Activity like "Activity: Think-pair-share about what you've learned" gets its own work-together slide with minimal content, when it should be absorbed as a content bullet.

**Why it happens:** The threshold for "short" vs "substantial" is not defined. Without a clear heuristic, all activities get their own slides.

**How to avoid:** Use a multi-line heuristic: if the Activity block content contains `\n` (a line break, indicating multi-step instructions), it is substantial and gets its own slide. Single-line activities without line breaks are absorbed as content bullets. This aligns with the CONTEXT.md discretion item and is easy to test.

---

## Code Examples

### Example 1: SpeakerNotes Construction With Segment Alignment

```typescript
// Source: Derived from TELEPROMPTER_RULES (geminiService.ts:36) and CONTEXT.md decisions

const SEGMENT_DELIMITER = '\u{1F449}'; // Pointing right emoji

/**
 * Build speakerNotes string from Say: block texts, aligned to content bullet count.
 *
 * The CONTEXT.md "say this, then show that" pattern means:
 * - saySegments[0] is spoken before any bullet (segment 0 = intro)
 * - saySegments[i] is spoken before content[i] is revealed
 * - The last Say after all content fills the final segment
 *
 * The invariant: result.split(SEGMENT_DELIMITER).length === contentCount + 1
 */
function buildSpeakerNotes(saySegments: string[], contentCount: number): string {
  const requiredCount = contentCount + 1;

  if (saySegments.length === 0) {
    // No Say blocks -- all empty segments
    return Array(requiredCount).fill('').join(SEGMENT_DELIMITER);
  }

  // Distribute Say blocks into exactly requiredCount slots
  const slots: string[] = Array(requiredCount).fill('');

  if (saySegments.length <= requiredCount) {
    // Fewer or equal Say blocks than slots -- place each in order, leave remaining empty
    for (let i = 0; i < saySegments.length; i++) {
      slots[i] = saySegments[i];
    }
  } else {
    // More Say blocks than slots -- merge extras into last slot
    for (let i = 0; i < requiredCount - 1; i++) {
      slots[i] = saySegments[i];
    }
    // Merge remaining Say blocks into the final slot with paragraph breaks
    const remaining = saySegments.slice(requiredCount - 1);
    slots[requiredCount - 1] = remaining.join('\n\n');
  }

  return slots.join(SEGMENT_DELIMITER);
}
```

### Example 2: Activity Substance Heuristic

```typescript
// Source: CONTEXT.md "Claude's Discretion" -- Short vs substantial Activity threshold

/**
 * Determine if an Activity: block is substantial enough for its own work-together slide.
 *
 * Heuristic: multi-line activities (containing \n) are substantial.
 * Single-line activities are short and get absorbed as content bullets.
 */
function isSubstantialActivity(content: string): boolean {
  return content.includes('\n');
}
```

### Example 3: Pipeline Early Return for Scripted Mode

```typescript
// Source: generationPipeline.ts mode-gating pattern (line 164)

// At the top of runGenerationPipeline, before Pass 1:
if (input.mode === 'scripted') {
  onProgress?.({
    stage: 'generating',
    stageIndex: 0,
    totalStages: 1,  // Only one stage for scripted
  });

  const parseResult = parseScriptedLessonPlan(lessonPlanText);
  const allBlocks = parseResult.days.flatMap(day => day.blocks);
  const slides = mapBlocksToSlides(allBlocks);

  return {
    slides,
    coveragePercentage: null,
    remainingGaps: [],
    warnings: parseResult.warnings,
    wasPartial: false,
  };
}
```

### Example 4: GenerationMode Type Extension

```typescript
// Source: aiProvider.ts:66

// BEFORE:
export type GenerationMode = 'fresh' | 'refine' | 'blend';

// AFTER:
export type GenerationMode = 'fresh' | 'refine' | 'blend' | 'scripted';
```

### Example 5: Provider Switch Case (Unreachable)

```typescript
// Source: geminiService.ts getDetectionSource (line 108-116)

function getDetectionSource(input: GenerationInput): string {
  switch (input.mode) {
    case 'fresh':
      return input.lessonText;
    case 'refine':
      return input.presentationText || '';
    case 'blend':
      return input.lessonText;
    case 'scripted':
      // Unreachable: pipeline early-returns before calling provider
      return '';
  }
}
```

### Example 6: Slide Construction

```typescript
// Source: Slide interface (types.ts:13) + ID pattern (geminiService.ts:426)

function createSlideFromPartial(partial: PartialSlide, index: number): Slide {
  return {
    id: `scripted-${Date.now()}-${index}`,
    title: partial.title || 'Untitled',
    content: partial.contentBullets,
    speakerNotes: buildSpeakerNotes(partial.saySegments, partial.contentBullets.length),
    imagePrompt: '',  // Phase 71 handles AI-generated prompts
    layout: partial.isWorkTogether ? 'work-together' : 'split',
    hasQuestionFlag: partial.hasQuestion || undefined,
    lessonPhase: partial.lessonPhase,
    slideType: partial.isWorkTogether ? 'work-together' : undefined,
  };
}
```

---

## Codebase Integration Points

### Files Modified

| File | Change | Risk |
|------|--------|------|
| `services/aiProvider.ts:66` | Add `'scripted'` to `GenerationMode` union | LOW -- type-only change, TypeScript catches missing cases |
| `services/generationPipeline.ts` | Add scripted mode early-return before Pass 1 | LOW -- early return, no shared path changes |
| `services/geminiService.ts` | Add `'scripted'` case to 3 switch statements (getDetectionSource, getMinConfidenceForMode, getSystemInstructionForMode) | LOW -- unreachable cases, return empty/throw |
| `services/providers/claudeProvider.ts` | Add `'scripted'` case to 3 switch statements (mirrors gemini changes) | LOW -- unreachable cases, return empty/throw |

### Files Created

| File | Purpose | Size Estimate |
|------|---------|---------------|
| `services/scriptedParser/scriptedMapper.ts` | `mapBlocksToSlides()` pure function | ~200-250 lines |
| `services/scriptedParser/scriptedMapper.test.ts` | Comprehensive mapper tests | ~400-500 lines |

### Key Interfaces

The mapper consumes `ScriptedBlock[]` from Phase 69 and produces `Slide[]` from `types.ts`.

```
ScriptedBlock[] (from scriptedParser)
    |
    | mapBlocksToSlides()
    v
Slide[] (types.ts interface)
    |
    | returned via PipelineResult
    v
App.tsx setSlides()
```

### Switch Statement Audit

All sites that reference `GenerationMode` and need a `'scripted'` case:

| File | Function | Line | Type |
|------|----------|------|------|
| `geminiService.ts` | `getDetectionSource` | 108-116 | switch -- add case |
| `geminiService.ts` | `getMinConfidenceForMode` | 124-126 | ternary -- safe (not called for scripted) |
| `geminiService.ts` | `getSystemInstructionForMode` | 131-236 | switch -- add case |
| `geminiService.ts` | `generateLessonSlides` (internal mode checks) | 174-238, 346-381, 431 | switch/if -- add cases |
| `claudeProvider.ts` | `getDetectionSource` | 401-409 | switch -- add case |
| `claudeProvider.ts` | `getMinConfidenceForMode` | 417-418 | ternary -- safe |
| `claudeProvider.ts` | `getSystemPromptForMode` | 425-534 | switch -- add case |
| `claudeProvider.ts` | `generateLessonSlides` (internal mode checks) | 718-824 | switch/if -- add cases |
| `generationPipeline.ts` | `canAnalyzeGaps` | 164 | boolean `||` -- safe (after early return) |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AI-generated segment alignment | Mechanical segment enforcement | This phase | Scripted mode cannot rely on AI prompt instructions to enforce the segment count invariant. The mapper must do it deterministically. |
| Three-mode pipeline (fresh/refine/blend) | Four-mode pipeline (+ scripted) | This phase | First non-AI generation path in Cue. Scripted mode produces slides without any AI involvement (image prompts deferred to Phase 71). |
| Phase detection via `phaseDetector.ts` | Direct section-to-phase mapping from parser | This phase | For scripted slides, the parser already identified section headings. The mapper maps them directly to LessonPhase values without running the fuzzy phaseDetector. |

**Deprecated/outdated:**
- Using `phaseDetector.ts` for scripted slides when the parser already provides section labels. The fuzzy pattern-based detector is designed for unstructured AI input. Scripted input is already structured.

---

## Open Questions

1. **How should Ask: blocks interact with slide boundaries?**
   - What we know: CONTEXT.md says "Split slides on Ask: and Activity: blocks (interaction points)." This means Ask: is a boundary trigger.
   - What's unclear: Should Ask: create a boundary BEFORE or AFTER itself? The question text belongs on the CURRENT slide (as a content bullet), but the next block should start a new slide (new teaching sequence begins after the interaction).
   - Recommendation: Ask: block adds its content to the CURRENT slide, then triggers a flush. The next block starts a fresh slide. This means the question is the LAST content bullet on its slide, and the answer/follow-up starts the next slide. This matches natural teaching flow: "show question, discuss, move on to new content."

2. **What title should slides get when there is no section heading?**
   - What we know: Section headings become slide titles. But slides created by interaction-point splits (Ask:/Activity: boundaries) within a section may not have a natural title.
   - What's unclear: Should continuation slides use the section heading as title, or synthesize a title from content?
   - Recommendation: Continuation slides inherit the current section heading as their title. If there is no section heading context at all (the lesson plan has blocks but no ## headings), use the first content bullet as the title (truncated to ~60 chars). This is Claude's discretion per CONTEXT.md.

3. **Should `imagePrompt` be empty string or a synthesized fallback?**
   - What we know: Phase 71 handles AI image prompt generation. Phase 70 creates slides without AI.
   - What's unclear: Should the mapper set `imagePrompt: ''` (empty, waiting for Phase 71) or synthesize something like `"An educational illustration about " + title`?
   - Recommendation: Set `imagePrompt: ''` (empty). Phase 71 is explicitly designed to handle this. Setting a synthesized prompt in the mapper means Phase 71 would need to detect and replace it. Empty is cleaner -- Phase 71 fills it.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `types.ts:13` -- Slide interface with all fields (content, speakerNotes, imagePrompt, layout, hasQuestionFlag, slideType, lessonPhase)
- Codebase: `types.ts:11` -- LessonPhase type definition (`'hook' | 'i-do' | 'we-do' | 'we-do-together' | 'you-do' | 'plenary'`)
- Codebase: `services/scriptedParser/types.ts` -- ScriptedBlock, SectionLabel, ScriptedParseResult, DaySection
- Codebase: `services/scriptedParser/scriptedParser.ts` -- parseScriptedLessonPlan() pure function (364 lines, 37 tests)
- Codebase: `services/generationPipeline.ts` -- runGenerationPipeline, PipelineResult, mode gating at line 164
- Codebase: `services/aiProvider.ts:66` -- GenerationMode type, GenerationInput interface
- Codebase: `services/geminiService.ts:25-37` -- TELEPROMPTER_RULES with segment count invariant
- Codebase: `services/geminiService.ts:108-116` -- getDetectionSource switch on mode
- Codebase: `services/geminiService.ts:131-236` -- getSystemInstructionForMode switch
- Codebase: `services/geminiService.ts:845-848` -- Work-together slide creation pattern (id, slideType, layout)
- Codebase: `services/providers/claudeProvider.ts:401-534` -- Mirror of gemini mode switches
- Codebase: `services/providers/claudeProvider.ts:1123-1126` -- Work-together slide creation pattern
- Codebase: `services/phaseDetection/phaseDetector.ts:158` -- assignPhasesToSlides (bypassed for scripted, used as pure-function reference pattern)
- Codebase: `components/PresentationView.tsx:1265` -- Teleprompter segment splitting on `\u{1F449}`
- Codebase: `App.tsx:577-611` -- Pipeline call site, uploadMode derivation, GenerationInput construction
- Phase 69: `69-01-SUMMARY.md` -- Parser output shape, 37 tests passing, all PARSE requirements complete
- Phase 70: `70-CONTEXT.md` -- All locked decisions for slide grouping, segment mapping, activity handling
- v6.0 research: `ARCHITECTURE-v6.0-scripted-import.md` -- Data flow, pipeline integration pattern, mode gating approach
- v6.0 research: `PITFALLS-v6.0-scripted-import.md` -- 18 identified pitfalls with prevention strategies

### Secondary (MEDIUM confidence)
- None needed. All findings verified against codebase source files.

### Tertiary (LOW confidence)
- None. No external web searches required for this phase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all patterns verified in existing codebase
- Architecture: HIGH -- mapper follows parser's state machine pattern; pipeline integration follows existing mode-gating pattern; all integration points audited
- Pitfalls: HIGH -- identified from direct codebase analysis, TELEPROMPTER_RULES audit (8+ references), v6.0 pre-research pitfall document, and CONTEXT.md constraint analysis
- Type design: HIGH -- mapper input (ScriptedBlock[]) and output (Slide[]) are both fully defined with production types

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable -- no external dependencies that could change)
