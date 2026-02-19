# Architecture Patterns: Scripted Import Mode

**Domain:** Structured lesson plan parsing and minimal-AI slide generation
**Researched:** 2026-02-19
**Confidence:** HIGH

## Recommended Architecture

### Overview

Scripted Import adds a fourth generation mode that short-circuits the existing three-pass pipeline. Instead of AI generating slide content, a deterministic parser extracts structured blocks from the lesson plan text, and a mapper converts them directly to `Slide[]`. AI is called only for image prompts and layout assignment -- a 97% reduction in token usage.

```
Teacher uploads lesson plan (PDF/DOCX/PPTX/text)
        |
        v
[Existing document processors]  -- extract text (unchanged)
        |
        v
[scriptedParser.ts]  -- detect markers, split days, extract blocks
        |
        v
[DayPicker.tsx]  -- if multi-day, teacher selects day(s)
        |
        v
[scriptedMapper.ts]  -- convert selected blocks to Slide[]
        |
        v
[AI: image prompts + layouts only]  -- minimal AI call (~700 tokens)
        |
        v
[phaseDetector.ts]  -- assign lesson phases (unchanged)
        |
        v
[generationPipeline.ts]  -- return slides (skip Pass 2/3)
        |
        v
[Existing slide editor, presenter, export]  -- all work unchanged
```

### Component Boundaries

| Component | Responsibility | Input | Output | Communicates With |
|-----------|---------------|-------|--------|-------------------|
| `scriptedParser.ts` | Detect markers, split days, extract typed blocks | Raw lesson plan text (string) | `ScriptedParseResult` (days, blocks, metadata) | Called by pipeline or landing page |
| `scriptedMapper.ts` | Convert blocks to slides with verbatim content | `ScriptedBlock[]` (filtered by day selection) | `Slide[]` (without imagePrompt/layout) | Called by pipeline |
| `DayPicker.tsx` | Multi-day selection UI | `ScriptedParseResult` | `Set<string>` (selected day labels) | Renders in landing page, informs pipeline |
| `ClaudeTips.tsx` | Static prompt template page | None (hardcoded content) | None (UI only, copy-to-clipboard) | Independent component |
| `generationPipeline.ts` (modified) | Orchestrate scripted mode branch | `GenerationInput` with mode='scripted' | `PipelineResult` | Calls scriptedParser, scriptedMapper, AI provider |
| AI providers (modified) | Generate image prompts + layouts only | Slide titles + content summary | `imagePrompt` + `layout` per slide | Called by pipeline in scripted mode |

### Data Flow

```
1. Text extraction (existing):
   File -> uploadService -> processor -> raw text string

2. Parsing (new):
   raw text -> scriptedParser.detectMarkers() -> ScriptedBlock[]
   raw text -> scriptedParser.splitDays() -> DaySection[]

3. Day selection (new, UI):
   DaySection[] -> DayPicker component -> selectedDays: Set<string>

4. Filtering:
   DaySection[] + selectedDays -> blocks for selected days only

5. Mapping (new):
   ScriptedBlock[] -> scriptedMapper.mapToSlides() -> Slide[] (partial)
   - say blocks -> speakerNotes segments (with pointing-right delimiters)
   - write-on-board blocks -> content[] bullets
   - ask blocks -> content[] + hasQuestionFlag: true
   - activity blocks -> content[] + slideType: 'work-together'
   - section-heading blocks -> slide title

6. AI enrichment (minimal):
   Slide[] (partial) -> AI provider -> Slide[] with imagePrompt + layout

7. Phase assignment (existing):
   raw text -> detectPhasesInText() -> PhaseDetectionResult
   Slide[] + PhaseDetectionResult -> assignPhasesToSlides() -> Slide[] (final)

8. Return:
   Slide[] -> PipelineResult { slides, coveragePercentage: null, remainingGaps: [], warnings: [], wasPartial: false }
```

---

## Patterns to Follow

### Pattern 1: Pure Function Parser (follow `phaseDetector.ts`)

**What:** All parsing functions are pure -- same input always produces same output. No side effects, no AI calls, no state mutation.

**When:** Always, for the scripted parser. This is non-negotiable for testability.

**Why this works in the codebase:** `phaseDetector.ts` (289 lines) and `contentPreservation/detector.ts` (672 lines) both follow this pattern. They are the two most well-tested modules in the codebase with comprehensive unit tests.

**Example:**

```typescript
// Pure function: text in, typed result out
export function detectScriptedMarkers(text: string): ScriptedBlock[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const blocks: ScriptedBlock[] = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of SCRIPTED_PATTERNS) {
      const match = pattern.regex.exec(line);
      if (match) {
        blocks.push({
          type: pattern.markerType,
          text: match[1].trim(),  // Captured group: content after marker
          rawLine: line,
          lineNumber: i + 1,
          confidence: pattern.confidence,
        });
        break;  // First match wins per line
      }
    }
  }

  return blocks;
}
```

### Pattern 2: Structural + Content Pattern Tiers (follow `phasePatterns.ts`)

**What:** Each marker type has structural patterns (line-anchored, high confidence) and content patterns (inline, medium confidence). Structural patterns are checked first.

**When:** For all scripted marker types.

**Why:** The `phasePatterns.ts` approach handles the real-world messiness of lesson plans. A `Say:` at the start of a line is definitely a speech marker. A `say` buried mid-sentence might be a coincidence.

**Example:**

```typescript
export const SCRIPTED_PATTERNS: ScriptedPattern[] = [
  {
    markerType: 'say',
    confidence: 'high',
    // Anchored to line start, optional bullet/heading prefix
    regex: /^[\s*\-#]*(?:Say|Teacher\s+says?|Script|Read\s+(?:aloud|out)|Tell\s+(?:students|the\s+class))\s*:\s*(.+)/i,
  },
  {
    markerType: 'write-on-board',
    confidence: 'high',
    regex: /^[\s*\-#]*(?:Write\s+(?:on\s+(?:the\s+)?board|on\s+board)|Board\s*(?:work)?|Display|Show\s+(?:on\s+(?:the\s+)?board|on\s+screen))\s*:\s*(.+)/i,
  },
  // ... etc
];
```

### Pattern 3: Mode Gating in Pipeline (follow existing mode checks)

**What:** The generation pipeline branches based on `GenerationMode`. Scripted mode takes an early return path that skips AI content generation and gap analysis.

**When:** In `generationPipeline.ts`.

**Why:** The pipeline already has mode gating at line 164: `const canAnalyzeGaps = input.mode === 'fresh' || input.mode === 'blend'`. This is the established pattern for mode-specific behavior.

**Example:**

```typescript
// In runGenerationPipeline, before Pass 1:
if (input.mode === 'scripted') {
  // Parse markers from lesson text
  const parseResult = detectScriptedMarkers(lessonPlanText);

  // Map blocks to slides (verbatim, no AI)
  const slides = mapBlocksToSlides(parseResult.blocks);

  // AI call: image prompts + layouts only
  const enrichedSlides = await enrichWithImagePrompts(provider, slides, signal);

  // Phase detection (reuse existing)
  const phaseResult = detectPhasesInText(lessonPlanText);
  const slidesWithPhases = assignPhasesToSlides(enrichedSlides, phaseResult);

  return {
    slides: slidesWithPhases,
    coveragePercentage: null,  // No gap analysis
    remainingGaps: [],
    warnings: [],
    wasPartial: false,
  };
}

// Existing Pass 1/2/3 flow continues for fresh/refine/blend...
```

### Pattern 4: Slide Boundary Heuristics

**What:** Determine where one slide ends and another begins from a stream of `ScriptedBlock` objects.

**When:** In `scriptedMapper.ts`.

**Rules (in priority order):**
1. **Explicit section heading** = new slide (e.g., `## Hook`, `### We Do`)
2. **Day boundary** = new slide (already handled by day filtering, but also marks a break within a day)
3. **Phase transition** = new slide (detected by phase detector, e.g., moving from Hook blocks to I Do blocks)
4. **Activity block** = new slide (activities are standalone events, deserve their own slide)
5. **Accumulation threshold** = new slide (if current slide has accumulated 4+ `say` blocks without a break, split)

**Why explicit rules instead of AI:** The teacher wrote the structure. Respecting their headings and markers produces predictable results. AI-based splitting would be a black box that sometimes groups content wrong.

### Pattern 5: Pointing-Right Segment Mapping

**What:** Convert `say` blocks within a slide into pointing-right delimited `speakerNotes` that work with the existing progressive disclosure system.

**When:** In `scriptedMapper.ts` when building `speakerNotes` for each slide.

**Rules:**
- Segment 0 (before any pointing-right): The slide's intro/setup. Use the first `say` block.
- Segment N: The `say` block that follows `content[N-1]` being revealed. Use subsequent `say` blocks.
- If there are more `say` blocks than content bullets: concatenate remaining `say` blocks into the last segment.
- If there are fewer `say` blocks than content bullets: empty segments (the bullet appears with no additional teacher narration).

**Example:**

```typescript
// Input: 3 content bullets from write-on-board, 4 say blocks
// Output speakerNotes:
// "Opening context from say[0]
//  Explanation of bullet 1 from say[1]
//  Explanation of bullet 2 from say[2]
//  Explanation of bullet 3 from say[3]"
```

This maps directly to the existing teleprompter rules in `geminiService.ts` (lines 12-37): "Segment 0 (Intro): Set the scene before any bullets appear. Segment 1: Student just read Bullet 1. Explain Bullet 1's significance."

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: AI-Assisted Parsing

**What:** Using AI to interpret ambiguous lesson plan structure ("Is this a question or a statement?").

**Why bad:** Adds latency, cost, and non-determinism to a step that should be instant and predictable. The existing `contentPreservation/detector.ts` handles ambiguity with confidence levels, not AI calls.

**Instead:** Use confidence levels (high/medium) and handle unmarked text as general content. Let the teacher fix edge cases in the slide editor post-import.

### Anti-Pattern 2: Over-Parsing Unmarked Text

**What:** Trying to extract structure from plain prose that has no markers.

**Why bad:** If a lesson plan has no `Say:`, `Ask:`, or section headings, it's not a scripted lesson plan -- it's a regular lesson plan that should use Fresh mode. Forcing scripted parsing on unstructured text produces garbage slides.

**Instead:** Count detected markers. If fewer than 3 markers detected in the full text, show a warning: "This document doesn't appear to be a scripted lesson plan. Consider using Fresh mode instead." Let the teacher override.

### Anti-Pattern 3: Mutating Input Slides

**What:** Modifying the `Slide` objects in place during mapping or enrichment.

**Why bad:** The existing codebase is strict about immutability. `phaseDetector.ts` (line 162): "Returns NEW slide objects (spread operator), never mutates input." `generationPipeline.ts` uses spread operator consistently.

**Instead:** Always return new objects: `return { ...slide, imagePrompt: generatedPrompt }`.

### Anti-Pattern 4: Persisting Generation Mode in CueFile

**What:** Adding a `generationMode: 'scripted'` field to the .cue file format.

**Why bad:** Forces a version bump (v5 -> v6), requires migration logic, and serves no purpose. A saved deck of scripted-import slides is indistinguishable from any other deck -- the `Slide` interface is the same.

**Instead:** Don't persist generation mode. The file format stays at v5. Scripted slides use all existing Slide fields.

### Anti-Pattern 5: Tightly Coupling Parser to Specific AI Outputs

**What:** Making the scripted parser depend on Claude-specific output formatting.

**Why bad:** Teachers write lesson plans in many formats. Coupling to Claude's output means the parser breaks when teachers use lesson plans from other sources, colleagues, or manually written plans.

**Instead:** The parser recognizes generic markers (`Say:`, `Ask:`, section headings) that are common across all scripted lesson plans. The Claude tips page encourages a format that the parser handles well, but the parser is not limited to that format.

---

## Scalability Considerations

| Concern | Typical (5-15 slides) | Large Plan (30+ slides) | Multi-Day (5 days, 50+ slides) |
|---------|----------------------|------------------------|-------------------------------|
| Parser performance | Instant (<10ms) | Instant (<20ms) | Instant (<50ms) |
| Slide mapping | Instant | Instant | Day picker limits to 1-2 days at a time |
| AI image prompts | ~5 sec (10 calls) | ~15 sec (30 calls) | ~10 sec per selected day |
| Token cost | ~700 tokens | ~2,100 tokens | ~1,400 tokens per day |
| Memory | Negligible | Negligible | DaySection[] is lightweight strings |

**The parser is O(lines * patterns) which is effectively O(n) for practical purposes.** A 1000-line lesson plan with 20 patterns = 20,000 regex checks, completing in <50ms in any modern browser.

**Bottleneck:** AI image prompt generation. This is per-slide and requires network round trips. Mitigation: batch all slides into a single AI call that returns an array of image prompts (similar to the colleague transformation chunking pattern in `transformationPrompts.ts`).

---

## File Structure

```
services/
  scriptedParser.ts          # NEW: Marker detection, day splitting, block extraction
  scriptedParser.test.ts     # NEW: Unit tests (pure functions, easy to test)
  scriptedMapper.ts          # NEW: ScriptedBlock[] -> Slide[]
  scriptedMapper.test.ts     # NEW: Unit tests for mapping logic
  generationPipeline.ts      # MODIFIED: Add scripted mode branch
  aiProvider.ts              # MODIFIED: Add 'scripted' to GenerationMode
  geminiService.ts           # MODIFIED: Add minimal system prompt for image-only mode
  providers/
    geminiProvider.ts        # MODIFIED: Handle scripted mode
    claudeProvider.ts        # MODIFIED: Handle scripted mode

components/
  DayPicker.tsx              # NEW: Multi-day selection UI
  ClaudeTips.tsx             # NEW: Static prompt template page
  Dashboard.tsx              # MODIFIED: Add scripted mode to import options
```

---

## Sources

- **Codebase analysis** (HIGH confidence): Architecture patterns extracted from existing code
  - `phaseDetection/phaseDetector.ts` -- pure function parser pattern (289 lines)
  - `phaseDetection/phasePatterns.ts` -- structural + content pattern tiers (161 lines)
  - `contentPreservation/detector.ts` -- marker detection with confidence levels (672 lines)
  - `generationPipeline.ts` -- mode gating, pipeline orchestration (329 lines)
  - `prompts/transformationPrompts.ts` -- batching/chunking pattern for multi-slide AI calls
  - `geminiService.ts` -- teleprompter segment rules (pointing-right delimiter system)
