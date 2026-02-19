# Technology Stack: Scripted Import Mode, Day Picker, Claude Chat Integration

**Project:** Cue v6.0 - Scripted Lesson Plan Import
**Researched:** 2026-02-19
**Confidence:** HIGH

## Executive Summary

Scripted Import requires **zero new library dependencies**. The entire feature set is achievable with existing infrastructure: regex-based text parsing (same pattern as `phaseDetector.ts` and `contentPreservation/detector.ts`), a new `GenerationMode` value (`'scripted'`), modified system prompts, and a new UI component for day/section selection. The work is pure service-layer TypeScript: a new `scriptedParser.ts` for structured lesson plan detection, extensions to `generationPipeline.ts` for the scripted mode bypass, and a static Markdown/HTML page for Claude chat output guidance.

**Why no new libraries:** The lesson plan markers (`Say:`, `Write on board:`, `Ask:`, `## Day 1`, `## Hook`) are structural text patterns. Cue already has two production-proven regex-based detection systems (`phaseDetector.ts` with 6 phase patterns, `contentPreservation/detector.ts` with question/activity/instruction patterns) that demonstrate the exact architecture needed. The day picker is a simple React component (list of detected sections with checkboxes). Claude chat integration tips are a static content page -- no API integration.

---

## Recommended Stack (No New Dependencies)

### Existing Libraries -- Confirmed Sufficient

| Technology | Version | Already In | Purpose for Scripted Import | Confidence |
|------------|---------|-----------|----------------------------|------------|
| TypeScript 5.8 | ~5.8.2 | `devDependencies` | Typed parser output, discriminated unions for marker types, type-safe pipeline branching | HIGH |
| React 19 | ^19.2.0 | `dependencies` | Day picker UI component, import mode selector on landing page | HIGH |
| Gemini/Claude providers | Current | `services/providers/` | Minimal AI for image prompts + layout assignment only (scripted mode skips content generation) | HIGH |
| mammoth.js | ^1.11.0 | `dependencies` | DOCX text extraction (lesson plans often come as Word documents) | HIGH |
| pdf.js | 3.11.174 | CDN | PDF text extraction (lesson plans often come as PDFs) | HIGH |
| JSZip | ^3.10.1 | `dependencies` | PPTX text extraction (if lesson plans come as PowerPoint) | HIGH |
| Jest 30 | ^30.2.0 | `devDependencies` | Unit tests for parser functions (pure function pattern like phaseDetector.test.ts) | HIGH |

### What NOT to Add

| Library | Why You Might Consider It | Why NOT |
|---------|--------------------------|---------|
| `unified` / `remark` / `rehype` (Markdown AST) | Parse structured Markdown lesson plans into AST for section splitting | Massively over-engineered. Lesson plan markers (`Say:`, `Ask:`, `## Day 1`) are simple line-anchored patterns. Regex handles them in <100 lines. The existing `phaseDetector.ts` proves this pattern works at scale. Adding a Markdown AST parser (unified ecosystem = ~15 transitive deps) for string matching is absurd. |
| `pegjs` / `chevrotain` (parser generators) | Formal grammar for lesson plan syntax | Lesson plans are natural-language documents with conventions, not formal languages. A PEG grammar can't handle "Say:" appearing mid-paragraph vs as a structural marker. Regex with line-anchoring (exactly like `phasePatterns.ts`) is the right tool. |
| `yaml` / `toml` parser | Parse structured lesson plan frontmatter | Lesson plans from Claude chat will be plain text/Markdown. No YAML frontmatter needed. If the output format uses `---` section separators, regex splits trivially. |
| `react-tabs` / `@radix-ui/tabs` | Day picker tab UI | A simple list with radio buttons or clickable cards. Importing a component library for one tabbed interface adds unnecessary dependency surface. Built with existing Tailwind patterns. |
| `diff` / `diff-match-patch` | Show changes between original and parsed lesson plan | The scripted mode preserves verbatim. There's nothing to diff. If the teacher wants to see what was detected, render the parsed structure directly. |
| `clipboard-copy` | Copy Claude prompt template to clipboard | `navigator.clipboard.writeText()` is a one-liner. No library needed. |
| `marked` / `markdown-it` | Render Claude tips page as Markdown | Static HTML/JSX is simpler and more controllable for a single tips page. No Markdown rendering pipeline needed. |

---

## Core Technical Additions (All Pure TypeScript)

### 1. Scripted Lesson Plan Parser (`services/scriptedParser.ts`)

**Purpose:** Detect structured markers in lesson plan text, split into days/sections, and extract typed content blocks.

**Architecture:** Follows the exact same pattern as `phaseDetection/phaseDetector.ts` -- pure functions, regex-based detection, typed output, no side effects, no AI calls.

**Marker categories to detect:**

```typescript
// Structural markers (line-anchored, high confidence)
type ScriptedMarkerType =
  | 'say'              // "Say:", "Teacher says:", "Script:"
  | 'write-on-board'   // "Write on board:", "Board work:", "Write:"
  | 'ask'              // "Ask:", "Ask students:", "Question:"
  | 'activity'         // "Activity:", "Task:", "Do:", "Students do:"
  | 'resource'         // "Resource:", "Handout:", "Worksheet:"
  | 'timing'           // "5 minutes", "(10 min)", "Time: 15 min"
  | 'section-heading'  // "## Hook", "### I Do", "Day 1:", "Lesson 1:"
  | 'day-boundary';    // "## Day 1", "--- Day 2 ---", "LESSON 2"

interface ScriptedBlock {
  type: ScriptedMarkerType;
  text: string;           // The content after the marker
  rawLine: string;        // The original line including marker (for verbatim preservation)
  lineNumber: number;     // For UI highlighting
  confidence: 'high' | 'medium';
}

interface DaySection {
  dayLabel: string;       // "Day 1", "Lesson 2", etc.
  startLine: number;
  blocks: ScriptedBlock[];
  phases: DetectedPhase[];  // Reuse existing phase detection within each day
}

interface ScriptedParseResult {
  days: DaySection[];
  isMultiDay: boolean;
  totalBlocks: number;
  unmarkedText: string[];  // Lines that don't match any marker (for fallback)
}
```

**Why this works:** The existing `phasePatterns.ts` already detects `Ask:` (via `contentPreservation/detector.ts` DET-02 context pattern) and section headings (via `phaseDetector.ts` structural patterns). The scripted parser is a superset that adds `Say:`, `Write on board:`, timing markers, and day boundaries.

**Complexity:** LOW. This is ~200 lines of regex patterns + a scan function. The `phaseDetector.ts` is 289 lines and handles a harder problem (fuzzy GRR phase matching). Structured markers like `Say:` are unambiguous.

### 2. Generation Mode Extension

**Current `GenerationMode`:** `'fresh' | 'refine' | 'blend'`

**Addition:** `'scripted'`

```typescript
export type GenerationMode = 'fresh' | 'refine' | 'blend' | 'scripted';
```

**Pipeline behavior for scripted mode:**
- Skip Pass 1 content generation entirely (the lesson plan IS the content)
- Map `ScriptedBlock` objects directly to `Slide` objects:
  - `say` blocks become `speakerNotes` (verbatim, with pointing-right delimiters added between segments)
  - `write-on-board` blocks become slide `content` bullets
  - `ask` blocks become slide `content` with `hasQuestionFlag: true`
  - `activity` blocks become slides with `slideType: 'work-together'`
  - `section-heading` blocks become slide `title`
- AI is called ONLY for:
  - `imagePrompt` generation (one sentence describing a relevant image for each slide)
  - `layout` assignment (which of the existing layouts fits this slide's content)
- Pass 2/3 gap analysis is skipped (teacher's script is authoritative)
- Phase detection runs normally on the full text (already supported)

**Integration point:** `generationPipeline.ts` line 164 already has mode gating: `const canAnalyzeGaps = input.mode === 'fresh' || input.mode === 'blend'`. Adding `'scripted'` to the skip list is a one-line change.

### 3. Day Picker Component

**Purpose:** When a multi-day lesson plan is detected, let the teacher select which day(s) to import.

**Implementation:** A React component rendered between file upload and generation. Shows detected days as selectable cards with preview of section headings.

**No library needed.** This is a simple list:

```tsx
// Pseudocode -- actual implementation in phase planning
{parsedResult.days.map(day => (
  <button
    key={day.dayLabel}
    onClick={() => toggleDay(day.dayLabel)}
    className={selectedDays.has(day.dayLabel) ? 'ring-2 ring-blue-500' : ''}
  >
    <h3>{day.dayLabel}</h3>
    <p>{day.blocks.length} sections</p>
    <ul>{day.phases.map(p => <li>{PHASE_DISPLAY_LABELS[p.phase]}</li>)}</ul>
  </button>
))}
```

**State:** Local `useState<Set<string>>` for selected days. No global state changes needed.

### 4. Claude Chat Integration Tips

**Purpose:** A static page (or modal) that shows teachers how to prompt Claude to output lesson plans in Cue-compatible format.

**Implementation:** A React component with hardcoded content -- no Markdown rendering, no API calls, no dynamic data. Just JSX with the prompt template and copy button.

**Key content:**
- A copyable prompt template teachers can paste into Claude chat
- Format specification for the output (`## Day 1`, `### Hook`, `Say:`, `Ask:`, etc.)
- Example output snippet showing what Claude should produce
- Copy-to-clipboard via `navigator.clipboard.writeText()`

**No library needed.** The copy button is:

```typescript
const handleCopy = () => {
  navigator.clipboard.writeText(PROMPT_TEMPLATE);
  // Show toast (existing Toast component)
};
```

---

## Capability Verification

### Regex Pattern Matching for Lesson Plan Markers (HIGH confidence)

**Verified in codebase:** Two production systems already use this exact approach:

1. **`phaseDetection/phasePatterns.ts`** (134 lines): 6 phase patterns with structural (line-anchored) and content (body text) regex variants. Handles UK/Australian teaching terminology variants. Production since Phase 65.

2. **`contentPreservation/detector.ts`** (672 lines): Question detection via punctuation and context patterns (`Ask:`, `Question:`, `Q1:` prefixes -- lines 148-184), activity detection via Bloom's taxonomy verbs, instruction detection via markers (`Note:`, `Remember:`, `Important:` -- lines 277-321). Production since Phase 50.

**The scripted parser reuses these proven patterns and adds new ones.** The `Ask:` pattern is already implemented in `detector.ts`. The `Say:` pattern follows the identical structure:

```typescript
// Existing (detector.ts line 148):
/(?:Ask(?:\s+(?:students|the\s+class))?|Questions?|Q\d+)\s*:?\s*([^.!?\n]+[.!?]?)/gi

// New (same structure):
/^[\s*\-]*(?:Say|Teacher\s+says?|Script|Read\s+(?:aloud|out))\s*:\s*(.+)/mi
```

**Risk:** NONE. This is the most well-trodden path in the codebase.

### Day Boundary Detection (HIGH confidence)

**Pattern:** Multi-day lesson plans use obvious structural markers:

```
## Day 1: Introduction to Fractions
## Day 2: Comparing Fractions
--- Day 3 ---
LESSON 1 / LESSON 2
Session 1: / Session 2:
```

**Implementation:** Line-anchored regex with numeric extraction:

```typescript
/^[\s#]*(?:Day|Lesson|Session)\s*(\d+)\s*[:\-\u2013\u2014]?\s*(.*)/mi
```

This is simpler than any pattern in `phasePatterns.ts` (which must handle fuzzy synonyms like "Tuning In" for "Hook"). Day boundaries are explicit and unambiguous.

### Verbatim Script Preservation (HIGH confidence)

**Current approach for content preservation** (`contentPreservationRules.ts`): Wraps detected content in `<preserve>` XML tags and instructs the AI to include exact text. This works for questions and activities detected mid-text.

**For scripted mode:** Preservation is even simpler because we bypass AI content generation entirely. The `say` blocks become `speakerNotes` directly -- no AI rewriting, no `<preserve>` tags needed. The only AI involvement is generating `imagePrompt` strings (one descriptive sentence per slide) and selecting `layout` values from the existing enum.

**Token savings:** A typical 10-slide scripted import would use ~500 tokens for image prompts + layouts, vs ~15,000-25,000 tokens for full generation. This is a 30-50x reduction in API cost.

### Type System Extension (HIGH confidence)

**Current `GenerationMode`:** `'fresh' | 'refine' | 'blend'` (defined in `services/aiProvider.ts` line 66)

**Adding `'scripted'`** requires changes at:
1. `services/aiProvider.ts` -- type definition (1 line)
2. `services/generationPipeline.ts` -- mode gate at line 164 (1 line)
3. `services/geminiService.ts` -- `getSystemInstructionForMode` switch (new case, minimal prompt)
4. `services/providers/claudeProvider.ts` -- same pattern as Gemini
5. Landing page UI -- new mode button/selector

**All call sites that switch on `GenerationMode` are exhaustive.** TypeScript's `switch` exhaustiveness checking will flag any missed cases at compile time.

---

## Integration Points with Existing Systems

### What Scripted Mode Reuses

| Existing System | How Scripted Mode Uses It |
|----------------|--------------------------|
| `phaseDetector.ts` | Runs on each `DaySection` to assign lesson phases to slides. Unchanged. |
| `contentPreservation/detector.ts` | Runs on full text to detect questions and activities for `hasQuestionFlag`. Unchanged. |
| `generationPipeline.ts` | Entry point. Scripted mode returns after Pass 1 equivalent (direct mapping), skips Pass 2/3. |
| `uploadService.ts` / processors | PDF, DOCX, PPTX text extraction. Unchanged. The extracted text feeds into `scriptedParser.ts`. |
| `Slide` type | Output format is identical. Scripted slides have all the same fields. |
| `saveService.ts` / `loadService.ts` | .cue file format unchanged. Scripted slides serialize identically. |
| Progressive disclosure (`speakerNotes` with pointing-right emoji) | Scripted mode maps `say` blocks to segments separated by pointing-right delimiters. |
| Image generation (`generateSlideImage`) | Called once per slide for the AI-generated `imagePrompt`. Same API, much less load. |
| Toast notifications | Progress feedback during import. |
| Phase color badges | Assigned from phase detection. Unchanged. |

### What Scripted Mode Does NOT Touch

| System | Why Untouched |
|--------|--------------|
| Three-pass pipeline orchestration | Scripted mode short-circuits after block-to-slide mapping. No gap analysis. |
| Content preservation rules / `<preserve>` tags | Not needed -- no AI content generation to constrain. |
| Teachable moment detection / answer delay | These require AI slide generation which scripted mode bypasses. The teacher's script already includes answer reveals as `Say:` blocks. |
| Verbosity levels | Scripted text IS the verbosity. No concise/standard/detailed variants. |
| Resource enhancement | Orthogonal feature. Can be used after scripted import if teacher uploads worksheets. |
| Games / quiz generation | Available after import, operates on slides normally. |
| PPTX/PDF export | Operates on `Slide[]` regardless of how they were created. |

---

## CueFile Format Compatibility

**Current format:** v5 (defined in `types.ts` line 491, `CURRENT_FILE_VERSION = 5`)

**Scripted import does NOT require a version bump.** The `Slide` interface is unchanged -- scripted slides use all existing fields (`title`, `content`, `speakerNotes`, `imagePrompt`, `layout`, `lessonPhase`, `hasQuestionFlag`, `slideType`). No new fields are needed.

**The `GenerationMode` is not persisted in .cue files.** The file stores `CueFileContent` which contains `slides`, `studentNames`, `lessonText`, and resource data. How the slides were generated is not part of the save format. This means:
- A scripted-import deck can be saved and loaded identically to any other deck
- A loaded deck can be re-generated in fresh/refine/blend mode if the teacher wants
- No migration needed

---

## Token Economics for Scripted Mode

| Operation | Fresh Mode | Scripted Mode | Reduction |
|-----------|-----------|---------------|-----------|
| Content generation (10 slides) | ~15,000-25,000 tokens | 0 (direct mapping) | 100% |
| Image prompts (10 slides) | Included above | ~500 tokens (1 sentence each) | -- |
| Layout assignment (10 slides) | Included above | ~200 tokens (enum per slide) | -- |
| Gap analysis (Pass 2) | ~3,000-5,000 tokens | 0 (skipped) | 100% |
| Gap filling (Pass 3) | ~5,000-15,000 tokens | 0 (skipped) | 100% |
| **Total per deck** | **~23,000-45,000 tokens** | **~700 tokens** | **~97%** |

This is a significant cost reduction and speed improvement. A scripted import should complete in <5 seconds vs 30-60 seconds for fresh generation.

---

## Development Approach

### File-by-File Plan

| New File | Lines (est.) | Pattern Source | Purpose |
|----------|-------------|----------------|---------|
| `services/scriptedParser.ts` | ~250 | `phaseDetection/phaseDetector.ts` | Parse markers, split days, extract blocks |
| `services/scriptedParser.test.ts` | ~300 | `phaseDetection/phaseDetector.test.ts` | Unit tests for all marker types, edge cases |
| `services/scriptedMapper.ts` | ~150 | New (maps ScriptedBlock[] to Slide[]) | Convert parsed blocks into Slide objects |
| `components/DayPicker.tsx` | ~80 | Existing card pattern in UI | Multi-day selection UI |
| `components/ClaudeTips.tsx` | ~120 | Static JSX content | Claude prompt template + copy button |

| Modified File | Change Scope | Description |
|--------------|-------------|-------------|
| `services/aiProvider.ts` | 1 line | Add `'scripted'` to `GenerationMode` union |
| `services/generationPipeline.ts` | ~30 lines | Scripted mode branch (skip AI, call mapper directly) |
| `services/geminiService.ts` | ~20 lines | Minimal system prompt for image-prompt-only mode |
| `services/providers/claudeProvider.ts` | ~20 lines | Same as Gemini |
| `components/Dashboard.tsx` (or landing page) | ~50 lines | Mode selector UI, day picker integration |
| `types.ts` | 0 lines | No changes (Slide interface unchanged) |

**Total estimated new code:** ~900 lines (including tests)
**Total estimated modified code:** ~120 lines across 5 files

---

## Sources

- **Codebase analysis** (HIGH confidence): All assertions verified by reading source files
  - `services/phaseDetection/phaseDetector.ts` -- 289 lines, pure regex detection
  - `services/phaseDetection/phasePatterns.ts` -- 161 lines, 6 phase pattern definitions
  - `services/contentPreservation/detector.ts` -- 672 lines, question/activity/instruction detection
  - `services/generationPipeline.ts` -- 329 lines, three-pass pipeline with mode gating
  - `services/aiProvider.ts` -- 430 lines, GenerationMode type and AIProviderInterface
  - `services/geminiService.ts` -- generation prompts and mode-specific system instructions
  - `types.ts` -- 615 lines, Slide interface, CueFile format, all app types
  - `package.json` -- current dependencies confirmed

- **No external sources needed.** This feature is entirely about extending existing codebase patterns. No new libraries, no API changes, no format changes. The technology decisions are dictated by what already works.
