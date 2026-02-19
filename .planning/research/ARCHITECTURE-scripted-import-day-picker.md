# Architecture Patterns: Scripted Import, Day Picker, and Claude Chat Tips

**Domain:** Lesson presentation app -- new import mode and UI features
**Researched:** 2026-02-19
**Confidence:** HIGH (based on direct codebase analysis, no external dependencies)

---

## Recommended Architecture

### Overview

Three new features integrate into the existing Cue pipeline at distinct layers:

1. **Scripted Import** -- A new `GenerationMode` (`'scripted'`) that bypasses AI content generation and uses a deterministic parser to produce slides directly from teacher-authored scripts.
2. **Day Picker** -- A UI interstitial between file upload and generation that splits multi-day lesson plans before they enter the pipeline.
3. **Claude Chat Tips** -- Static content displayed on the landing page to help teachers get better output from Claude conversations.

The key architectural insight: scripted import is fundamentally different from existing modes. Fresh/refine/blend all ask AI to _transform_ text into slides. Scripted mode has the teacher's slide structure _already defined_ -- the parser extracts it deterministically, and AI is only needed for cosmetic tasks (image prompts, layout selection).

---

## Component Boundaries

| Component | Responsibility | Communicates With | New/Modified |
|-----------|---------------|-------------------|--------------|
| `services/scriptedParser.ts` | Parse Say:/Ask:/Write: markup into Slide[] | Called by generation pipeline | **NEW** |
| `services/scriptedDaySplitter.ts` | Split multi-day text into separate day chunks | Called by Day Picker UI component | **NEW** |
| `services/generationPipeline.ts` | Orchestrate passes; add scripted mode gate | Calls scriptedParser, aiProvider | **MODIFIED** |
| `services/aiProvider.ts` | GenerationMode type, GenerationInput type | Used by pipeline | **MODIFIED** (type only) |
| `services/geminiService.ts` | System instruction/prompt construction | Called by provider | **MODIFIED** (scripted prompt path) |
| `services/providers/geminiProvider.ts` | Gemini API calls | Delegates to geminiService | No change needed |
| `services/providers/claudeProvider.ts` | Claude API calls | Mirrors gemini pattern | **MODIFIED** (scripted prompt path) |
| `App.tsx` | Landing page state, mode detection, generation trigger | Calls pipeline, renders UI | **MODIFIED** |
| `components/DayPicker.tsx` | Day selection interstitial UI | Reads from daySplitter, feeds App state | **NEW** |
| `components/ClaudeTips.tsx` | Static tips panel | Rendered on landing page | **NEW** |

---

## Data Flow

### Current Flow (Fresh/Refine/Blend)

```
Landing Page (upload PDF/paste text)
  --> App.tsx: uploadMode derived from uploaded files
  --> handleGenerate(): builds GenerationInput
  --> runGenerationPipeline()
    --> Pass 1: provider.generateLessonSlides(input) --> AI generates Slide[]
    --> Pass 2: provider.analyzeGaps() --> coverage analysis
    --> Pass 3: provider.generateSlideFromGap() --> fill gaps
  --> setSlides(result.slides)
  --> AppState.EDITING
```

### New Flow (Scripted Import)

```
Landing Page (upload DOCX or paste scripted text)
  --> App.tsx: detect scripted format in text
    --> If multi-day detected: show DayPicker interstitial
    --> User selects a day
    --> daySplitter extracts that day's text
  --> handleGenerate(): builds GenerationInput with mode='scripted'
  --> runGenerationPipeline()
    --> Mode gate: scripted mode detected
    --> scriptedParser.parseScriptedLesson(text) --> Slide[] (deterministic)
    --> Minimal AI pass: generate imagePrompt + layout for each slide
    --> Skip Pass 2 (gap analysis) and Pass 3 (gap fill) entirely
  --> setSlides(result.slides)
  --> AppState.EDITING
```

---

## Feature 1: Scripted Import Parser

### Where It Fits

A new pure-function service at `services/scriptedParser.ts`. Follows the same pattern as `services/contentPreservation/detector.ts` and `services/phaseDetection/phaseDetector.ts` -- pure functions, regex-based, no side effects, no AI calls.

### Parser Input Format

The scripted lesson plan format uses explicit instructor cues:

```
Lesson: Introduction to Fractions
Phase: Hook

Say: "Good morning everyone! Today we're going to explore something really useful -- fractions."

Write on board: 1/2, 1/4, 3/4

Ask: "Can anyone tell me what a fraction is?"

Say: "Great answers! A fraction is a part of a whole."

Phase: I Do

Say: "Watch carefully as I show you how to identify the numerator and denominator."

Write on board: Numerator / Denominator

Show: [diagram of fraction parts]
```

### Parser Output Types

```typescript
// services/scriptedParser.ts

export type ScriptedCueType = 'say' | 'ask' | 'write' | 'show' | 'activity' | 'do';

export interface ScriptedCue {
  type: ScriptedCueType;
  text: string;
  position: number;  // Line number in source
}

export interface ScriptedSection {
  phase?: LessonPhase;       // Mapped from Phase: header
  title?: string;            // From section heading or first Say:
  cues: ScriptedCue[];
}

export interface ScriptedParseResult {
  lessonTitle: string;
  sections: ScriptedSection[];
  dayLabel?: string;          // "Day 1", "Lesson 2", etc.
  warnings: string[];         // Unparseable lines, missing content
}

export interface ScriptedSlideResult {
  slides: Slide[];
  parseWarnings: string[];
}
```

### Parser Logic

```typescript
export function parseScriptedLesson(text: string): ScriptedParseResult {
  // 1. Detect lesson title: first "Lesson:" or "Title:" line
  // 2. Split into sections at "Phase:" boundaries
  // 3. Within each section, parse cue lines:
  //    - Say: "..." --> teacher speaking (teleprompter content)
  //    - Ask: "..." --> question for class (slide content + teleprompter)
  //    - Write on board: ... --> visual content (slide bullet)
  //    - Show: ... --> image/visual reference (imagePrompt seed)
  //    - Activity: ... --> student activity instruction (slide content)
  //    - Do: ... --> student action (slide content)
  // 4. Map Phase: headers to LessonPhase using existing phase patterns
  // 5. Collect warnings for unrecognized lines
}

export function scriptedCuesToSlides(result: ScriptedParseResult): ScriptedSlideResult {
  // Group cues into slides using these rules:
  // - Each phase boundary starts a new slide (unless section has no cues)
  // - Consecutive Say: cues are concatenated into teleprompter segments
  // - Ask:/Write:/Activity:/Do: cues become slide content (bullet points)
  // - Show: cues seed the imagePrompt field
  // - Title: first Ask/Write in section, or phase display label
  //
  // Slide construction:
  //   title: derived from section heading or first substantive cue
  //   content: Ask + Write + Activity + Do cues (as bullet points)
  //   speakerNotes: Say cues joined with point-hand delimiter
  //   imagePrompt: from Show: cues or auto-generated from content
  //   lessonPhase: from Phase: header mapping
  //   source: { type: 'ai-generated' }  // Consistent with existing
  //   hasQuestionFlag: true if any Ask: cues present
}
```

### Why This Pattern

- **Pure functions** match `phaseDetector.ts` and `detector.ts` patterns -- testable, no mocking needed.
- **Separate parse and transform** steps allow the parser to be unit tested against raw text, and the transformer to be tested against parsed results independently.
- **Regex-based** avoids AI cost for what is a deterministic operation. The teacher has already structured the content.

### Integration with Phase Detection

The parser should recognize Phase: headers and map them to `LessonPhase` values using the existing `PHASE_PATTERNS` synonyms. For example:

```
Phase: Hook           --> 'hook'
Phase: I Do           --> 'i-do'
Phase: Modelling      --> 'i-do'
Phase: We Do          --> 'we-do'
Phase: Group Work     --> 'we-do-together'
Phase: Independent    --> 'you-do'
Phase: Plenary        --> 'plenary'
```

Use `detectPhasesInText()` on the phase header text for consistency with existing detection logic.

---

## Feature 2: Scripted Mode in Generation Pipeline

### Pipeline Modification

The key change to `generationPipeline.ts` is a mode gate early in the pipeline:

```typescript
// In runGenerationPipeline():

// =========================================================================
// Mode gate: scripted mode bypasses AI generation entirely
// =========================================================================
if (input.mode === 'scripted') {
  return runScriptedPipeline(input, options);
}

// ... existing Pass 1/2/3 logic unchanged ...
```

### Scripted Pipeline Function

```typescript
async function runScriptedPipeline(
  input: GenerationInput,
  options: PipelineOptions
): Promise<PipelineResult> {
  const { onProgress, signal } = options;

  // Stage 1: Parse (deterministic, instant)
  onProgress?.({
    stage: 'generating',
    stageIndex: 0,
    totalStages: 2,  // Parse + Enhance
    detail: 'Parsing scripted lesson...',
  });

  const parseResult = parseScriptedLesson(input.lessonText);
  const { slides, parseWarnings } = scriptedCuesToSlides(parseResult);

  if (signal?.aborted) {
    return { slides, coveragePercentage: null, remainingGaps: [], warnings: parseWarnings, wasPartial: true };
  }

  // Stage 2: AI enhancement (image prompts + layout selection only)
  onProgress?.({
    stage: 'generating',
    stageIndex: 1,
    totalStages: 2,
    detail: 'Generating visuals...',
  });

  // Minimal AI call: enhance image prompts and assign layouts
  // This is a SINGLE call, not per-slide, to keep cost low
  const enhancedSlides = await enhanceScriptedSlides(provider, slides, signal);

  return {
    slides: enhancedSlides,
    coveragePercentage: null,  // No gap analysis for scripted mode
    remainingGaps: [],
    warnings: parseWarnings,
    wasPartial: signal?.aborted ?? false,
  };
}
```

### Why Skip Pass 2 and 3

Gap analysis (Pass 2) compares "what the AI generated" against "what the lesson plan said." In scripted mode, the slides ARE the lesson plan -- there is no gap by definition. The teacher wrote exactly what they want on each slide.

### Type Changes

In `services/aiProvider.ts`:

```typescript
// Before:
export type GenerationMode = 'fresh' | 'refine' | 'blend';

// After:
export type GenerationMode = 'fresh' | 'refine' | 'blend' | 'scripted';
```

In `App.tsx`, the `uploadMode` derivation needs a fourth path:

```typescript
const uploadMode = useMemo<UploadMode>(() => {
  const hasLesson = uploadedFile !== null || lessonText.trim() !== '';
  const hasPpt = existingPptFile !== null;
  const isScripted = detectScriptedFormat(lessonText);  // New check

  if (isScripted) return 'scripted';
  if (hasLesson && hasPpt) return 'blend';
  if (hasPpt) return 'refine';
  if (hasLesson) return 'fresh';
  return 'none';
}, [uploadedFile, lessonText, existingPptFile]);
```

### Scripted Format Detection

A lightweight heuristic to detect if pasted/uploaded text is in scripted format:

```typescript
// services/scriptedParser.ts

export function detectScriptedFormat(text: string): boolean {
  // Count scripted cue markers
  const cuePattern = /^(Say|Ask|Write(?:\s+on\s+board)?|Show|Activity|Do)\s*:/gmi;
  const matches = text.match(cuePattern);

  // Threshold: at least 3 scripted cues in the text
  return (matches?.length ?? 0) >= 3;
}
```

This is conservative (3 matches) to avoid false positives on lesson plans that happen to contain "Say:" in regular prose.

---

## Feature 3: Day Picker

### Where in the UI Flow

The day picker appears **between upload and generation** -- after the user has uploaded/pasted content, but before they click Generate. It is conditional: only shown when multi-day structure is detected.

```
Upload/Paste text
  --> detectMultiDay(text) ?
    YES --> Show DayPicker interstitial (user picks Day 1, Day 2, etc.)
         --> splitByDay(text, selectedDay) trims lessonText to that day
    NO  --> Normal flow (no interstitial)
  --> Generate button works on the (potentially trimmed) text
```

### Day Splitter Service

```typescript
// services/scriptedDaySplitter.ts

export interface DetectedDay {
  label: string;       // "Day 1", "Lesson 2", "Monday", etc.
  startIndex: number;  // Character offset in source text
  endIndex: number;    // End of this day's content
  preview: string;     // First 100 chars for UI display
}

export interface DaySplitResult {
  days: DetectedDay[];
  isMultiDay: boolean;
}

const DAY_PATTERNS = [
  /^#{1,3}\s*Day\s+(\d+)/gmi,
  /^#{1,3}\s*Lesson\s+(\d+)/gmi,
  /^Day\s+(\d+)\s*[:\-\u2013\u2014]/gmi,
  /^Lesson\s+(\d+)\s*[:\-\u2013\u2014]/gmi,
  /^(Monday|Tuesday|Wednesday|Thursday|Friday)\s*[:\-\u2013\u2014]/gmi,
  /^Week\s+\d+,?\s*Day\s+(\d+)/gmi,
  /^Session\s+(\d+)/gmi,
];

export function detectDays(text: string): DaySplitResult {
  // Scan for day boundary patterns
  // Return detected days with positions
  // isMultiDay = days.length >= 2
}

export function extractDayText(text: string, day: DetectedDay, allDays: DetectedDay[]): string {
  // Extract text from day.startIndex to next day's startIndex (or end of text)
  // Preserve the day header for phase detection context
}
```

### UI Component

```typescript
// components/DayPicker.tsx

interface DayPickerProps {
  days: DetectedDay[];
  selectedDay: number | null;  // Index into days array
  onSelectDay: (index: number) => void;
  onSelectAll: () => void;     // Use entire document (skip splitting)
}
```

The DayPicker renders as a horizontal pill selector or vertical list, showing day labels and previews. It slots into the landing page between the upload zones and the Generate button.

### State Management

In `App.tsx`, add:

```typescript
// Day picker state
const [detectedDays, setDetectedDays] = useState<DetectedDay[]>([]);
const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

// Recalculate when lessonText changes
useEffect(() => {
  const result = detectDays(lessonText);
  setDetectedDays(result.days);
  if (result.isMultiDay) {
    setSelectedDayIndex(0);  // Default to first day
  } else {
    setSelectedDayIndex(null);  // No splitting needed
  }
}, [lessonText]);

// In handleGenerate, apply day splitting before pipeline:
const effectiveLessonText = selectedDayIndex !== null
  ? extractDayText(lessonText, detectedDays[selectedDayIndex], detectedDays)
  : lessonText;
```

### Why Before Generation (Not After)

Splitting after generation would mean the AI processes all days' content, producing a bloated deck that needs pruning. Splitting before means:
- Smaller input = faster generation, fewer tokens, lower cost
- More focused slides = better quality
- Teacher sees exactly which day they are generating for

---

## Feature 4: Claude Chat Tips

### Architecture

This is the simplest feature -- purely static content with no service layer.

```typescript
// components/ClaudeTips.tsx

// Static tips content, no API calls
const CLAUDE_TIPS = [
  {
    title: 'Structure your lesson plan',
    description: 'Use clear headings like "Hook:", "I Do:", "We Do:", "You Do:", "Plenary:" to get phase-aware slides.',
  },
  {
    title: 'Include teacher cues',
    description: 'Write "Say:", "Ask:", "Write on board:" to get precise teleprompter scripts in scripted mode.',
  },
  {
    title: 'Specify your audience',
    description: 'Mention the year group/grade level. "Year 6 fractions lesson" gives age-appropriate content.',
  },
  {
    title: 'Request specific formats',
    description: 'Ask Claude to format as a scripted lesson plan with Say/Ask/Write cues for direct import into Cue.',
  },
];
```

### Where Displayed

On the landing page, below the textarea and above the Generate button. Collapsible by default (shows only a "Tips for using Claude to write lesson plans" header). Expands to show the tips list on click.

### Integration Point

In `App.tsx`, within the `appState === AppState.INPUT` block, after the textarea:

```tsx
{/* Claude Chat Tips */}
<ClaudeTips collapsed={true} />
```

No state management needed beyond a local `useState(true)` for the collapsed toggle inside the component.

---

## Patterns to Follow

### Pattern 1: Pure Parser Service (same as phaseDetector and detector)

**What:** Stateless functions that take text in, return typed results out. No side effects, no AI calls.
**When:** For any text analysis that can be done deterministically (scripted parsing, day splitting, format detection).
**Example:**

```typescript
// Same pattern as phaseDetector.ts
export function parseScriptedLesson(text: string): ScriptedParseResult {
  if (!text || text.trim().length === 0) {
    return { lessonTitle: '', sections: [], warnings: ['Empty input'] };
  }
  // ... pure regex logic ...
}
```

### Pattern 2: Pipeline Mode Gate (same as refine mode skip)

**What:** Early return in `runGenerationPipeline` based on `input.mode`. The existing code already does this for refine mode (line 164-174 skips gap analysis). Scripted mode extends this pattern.
**When:** When a mode needs fundamentally different pipeline behavior.
**Example:**

```typescript
// Existing pattern in generationPipeline.ts:
const canAnalyzeGaps = input.mode === 'fresh' || input.mode === 'blend';
if (!canAnalyzeGaps) {
  return { slides, coveragePercentage: null, remainingGaps: [], warnings, wasPartial: false };
}

// New pattern extends it:
if (input.mode === 'scripted') {
  return runScriptedPipeline(provider, input, options);
}
```

### Pattern 3: Conditional UI Interstitial (similar to mode indicator)

**What:** UI element that appears conditionally based on detected content. The existing mode indicator (fresh/refine/blend) appears only when `uploadMode !== 'none'`. The day picker follows this pattern.
**When:** When user needs to make a choice based on detected content structure.
**Example:**

```tsx
{/* Existing pattern */}
{uploadMode !== 'none' && <ModeIndicator mode={uploadMode} />}

{/* New pattern */}
{detectedDays.length >= 2 && (
  <DayPicker
    days={detectedDays}
    selectedDay={selectedDayIndex}
    onSelectDay={setSelectedDayIndex}
    onSelectAll={() => setSelectedDayIndex(null)}
  />
)}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Sending Full Scripted Text to AI for Slide Generation

**What:** Using AI (Pass 1) to generate slides from scripted lesson text the same way fresh/refine/blend do.
**Why bad:** The scripted format already defines the slide structure. Asking AI to "transform" it will paraphrase teacher-authored content, lose the Say:/Ask:/Write: precision, and cost tokens unnecessarily.
**Instead:** Parse deterministically, only use AI for cosmetic enhancement (image prompts, layout selection).

### Anti-Pattern 2: Multi-Day Detection in the Pipeline

**What:** Putting day detection/splitting logic inside `generationPipeline.ts`.
**Why bad:** Day selection requires user interaction (picking which day). The pipeline runs _after_ user clicks Generate -- too late for UI interaction.
**Instead:** Day detection runs on text change in the landing page. User picks a day. The selected day's text is what enters the pipeline.

### Anti-Pattern 3: DOCX-Specific Parsing in the Scripted Parser

**What:** Having the scripted parser handle DOCX file format conversion (bold text as Say, headings as phases).
**Why bad:** DOCX processing already exists in `docxProcessor.ts` which outputs plain text via mammoth. The parser should work on plain text output, not raw DOCX.
**Instead:** Chain: DOCX upload --> `processDocx()` --> extracted text --> `detectScriptedFormat()` --> `parseScriptedLesson()`. Each layer handles one concern.

### Anti-Pattern 4: Storing Day Selection in File Format

**What:** Adding selectedDay to the `.cue` file format.
**Why bad:** The day choice is a pre-generation concern. The resulting slides are already scoped to one day. Storing the selection adds complexity with no benefit -- you cannot re-split after generation.
**Instead:** Day selection is ephemeral landing-page state only. Once generated, the slides stand on their own.

---

## File-by-File Change Map

### New Files

| File | Purpose | Lines (est.) |
|------|---------|-------------|
| `services/scriptedParser.ts` | Parse scripted lesson text into structured data, convert to Slide[] | ~250 |
| `services/scriptedParser.test.ts` | Unit tests for parser | ~300 |
| `services/scriptedDaySplitter.ts` | Detect multi-day structure, extract day text | ~100 |
| `services/scriptedDaySplitter.test.ts` | Unit tests for day splitter | ~150 |
| `components/DayPicker.tsx` | Day selection UI component | ~80 |
| `components/ClaudeTips.tsx` | Static tips panel component | ~60 |

### Modified Files

| File | Change | Impact |
|------|--------|--------|
| `services/aiProvider.ts` | Add `'scripted'` to `GenerationMode` union | Minimal -- type-only |
| `services/generationPipeline.ts` | Add scripted mode gate, `runScriptedPipeline()` function | Medium -- new code path, existing paths unchanged |
| `services/geminiService.ts` | Add scripted enhancement prompt (image/layout only) | Small -- new function, existing functions unchanged |
| `services/providers/claudeProvider.ts` | Mirror scripted enhancement prompt | Small |
| `App.tsx` | Add scripted detection, day picker state, DayPicker render, ClaudeTips render, DOCX upload in lesson plan zone | Medium -- new state + UI elements, existing flow intact |
| `types.ts` | No changes needed (Slide interface already has all needed fields) | None |

---

## Scripted Mode AI Enhancement Detail

Scripted mode still needs AI for two things:

1. **Image prompts** -- The parser extracts `Show:` cues as seeds, but slides without `Show:` cues need AI-generated image prompts based on content.
2. **Layout selection** -- Given the content pattern (number of bullets, question presence, etc.), AI picks the best layout.

This should be a single batched AI call, not per-slide:

```typescript
// In generationPipeline.ts or a new service function

async function enhanceScriptedSlides(
  provider: AIProviderInterface,
  slides: Slide[],
  signal?: AbortSignal
): Promise<Slide[]> {
  // Build a lightweight prompt:
  // "For each slide below, generate an imagePrompt and select a layout.
  //  Do NOT modify title, content, or speakerNotes."
  //
  // Send all slides in one call, get back image prompts + layouts.
  // This is much cheaper than full generation.
  //
  // Fallback: if AI call fails, return slides with generic image prompts
  // and 'split' layout (graceful degradation).
}
```

---

## Integration with Existing Systems

### Content Preservation (detector.ts)

Scripted mode does NOT need content preservation detection. The parser preserves teacher content by design -- everything is kept verbatim. The existing `detectPreservableContent()` call in `geminiService.ts` should be skipped for scripted mode.

### Phase Detection (phaseDetector.ts)

Scripted mode maps `Phase:` headers to `LessonPhase` values directly using `detectPhasesInText()`. The parser calls this on each phase header line, not the full text. This gives higher accuracy than full-text scanning since the phase label is explicit.

### Verbosity (teleprompter rules)

Scripted mode uses the teacher's `Say:` cues as teleprompter content directly. The verbosity setting (concise/standard/detailed) should NOT rewrite these -- the teacher wrote exactly what they want to say. Verbosity may affect any AI-generated _transitional_ notes (e.g., "[Point to board]" actions), but core Say: content is sacrosanct.

### .cue File Format

No changes needed. Scripted-generated slides produce the same `Slide[]` structure. The `source` field can be `{ type: 'ai-generated' }` since the parser is part of the app's generation flow. Alternatively, add `'scripted'` to `SlideSource.type` for provenance tracking -- but this is optional and cosmetic.

### Supplementary Resources

Supplementary resources (landing page uploads) should still be available in scripted mode. They may inform the AI enhancement pass (image prompt generation) but do not affect parsing.

---

## DOCX Upload Support

The lesson plan upload zone currently accepts only `.pdf`. For scripted import, teachers will commonly paste from or upload `.docx` files from Claude chat exports.

### Change Required

In `App.tsx`, the lesson plan file input:

```tsx
// Before:
<input type="file" accept=".pdf" />

// After:
<input type="file" accept=".pdf,.docx" />
```

And `handleFileChange` needs a DOCX branch:

```typescript
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') {
    // Existing PDF processing path
    setUploadedFile(file);
    await processPdf(file, setIsProcessingFile, (text, images) => {
      setLessonText(text);
      setPageImages(images);
    }, setError);
  } else if (ext === 'docx') {
    // New DOCX path using existing processDocx
    setUploadedFile(file);
    setIsProcessingFile(true);
    try {
      const result = await processDocx(file);
      setLessonText(result.text);
      setPageImages([]);  // DOCX has no page images
    } catch (err: any) {
      setError(err.message || 'Failed to process DOCX');
    } finally {
      setIsProcessingFile(false);
    }
  } else {
    setError("Please upload a PDF or DOCX document.");
  }
};
```

`processDocx` from `services/documentProcessors/docxProcessor.ts` already exists and uses mammoth.js. No new dependency needed.

---

## Suggested Build Order

Based on dependency analysis:

### Phase 1: Parser Core (no AI, no UI dependencies)

1. `services/scriptedParser.ts` -- parse + transform functions
2. `services/scriptedParser.test.ts` -- comprehensive test suite
3. `services/scriptedDaySplitter.ts` -- day detection + extraction
4. `services/scriptedDaySplitter.test.ts` -- test suite

**Rationale:** Pure functions with zero dependencies on existing code (except types). Can be built and tested in isolation.

### Phase 2: Pipeline Integration

5. Add `'scripted'` to `GenerationMode` in `services/aiProvider.ts`
6. Add `runScriptedPipeline()` to `services/generationPipeline.ts`
7. Add scripted enhancement function (image prompts + layouts)
8. Integration tests

**Rationale:** Depends on parser from Phase 1. Needs type change before pipeline change.

### Phase 3: UI Integration

9. `components/DayPicker.tsx` -- day selection component
10. `components/ClaudeTips.tsx` -- static tips panel
11. `App.tsx` modifications -- DOCX upload, scripted detection, day picker state, UI wiring
12. End-to-end testing

**Rationale:** Depends on both parser and pipeline. DayPicker needs daySplitter. App.tsx needs everything.

### Build Order Dependency Graph

```
scriptedParser.ts  ----\
                        +---> generationPipeline.ts ---> App.tsx
scriptedDaySplitter.ts -+                                  ^
                        |                                   |
                        +---> DayPicker.tsx ----------------+
                                                            |
ClaudeTips.tsx  (independent) -----------------------------+
```

---

## Sources

- Direct codebase analysis of all files listed above (HIGH confidence)
- Existing patterns: `phaseDetector.ts`, `detector.ts`, `generationPipeline.ts`, `docxProcessor.ts`
- Type definitions: `types.ts`, `aiProvider.ts`
- UI flow: `App.tsx` (handleGenerate, uploadMode derivation, landing page render)
