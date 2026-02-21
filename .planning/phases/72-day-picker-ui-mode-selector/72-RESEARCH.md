# Phase 72: Day Picker UI + Mode Selector - Research

**Researched:** 2026-02-21
**Domain:** React UI components, state management, scripted import flow integration
**Confidence:** HIGH

## Summary

Phase 72 is a pure UI phase. All backend infrastructure is complete: the scripted parser (Phase 69) already returns `ScriptedParseResult` with `days: DaySection[]`, `totalBlocks`, `totalDays`, and `stats: ParseStats`; the slide mapper (Phase 70) converts `ScriptedBlock[]` to `Slide[]`; the generation pipeline (Phase 70/71) already handles `mode: 'scripted'` with enrichment. The pipeline even has a placeholder comment at `generationPipeline.ts:180` -- "Flatten all days' blocks (day selection is Phase 72)" -- marking exactly where day filtering needs to be wired in.

The work is: (1) auto-detect scripted markers in uploaded text and surface a mode suggestion banner, (2) build a day picker card grid that appears when 2+ days are detected, (3) show reactive import statistics, (4) extend the lesson plan upload to accept DOCX and plain text (not just PDF), and (5) wire selected days into the generation pipeline. No new libraries are needed. No AI calls are involved in detection or day picking -- this is pure local parsing.

**Primary recommendation:** Add a `detectScriptedMarkers()` pure function to the scripted parser, build the day picker and mode banner as inline sections in the App.tsx landing page (following existing mode indicator and verbosity selector patterns), and update `GenerationInput` to carry `selectedDays?: number[]` for the pipeline to filter before mapping.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Auto-detect approach: parser checks for scripted markers (Say:, Ask:, etc.) after upload -- if found, scripted mode is suggested automatically
- No upfront toggle -- mode suggestion only appears when markers are detected
- Banner with toggle switch: "Scripted markers detected" banner appears after upload with a switch to override back to AI generation mode
- If no markers detected, scripted mode is not offered (markers are required for scripted import to work)
- Inline step: day cards appear on the landing page below the upload area (no modal)
- Preview cards in a grid: each card shows day number, title, section names, and block counts
- All days pre-selected by default (teacher deselects what they don't want)
- Select all / deselect all control above the card grid
- Day picker only appears when 2+ days are detected (single-day plans skip this step)
- Compact stats summary line above the generate button: "3 days . 8 sections . 24 script blocks"
- Stats update reactively as days are selected/deselected
- Generate button text changes in scripted mode to communicate the different action
- Generic inline callout (amber/yellow) below day cards when not all days are selected
- Message: "Some days may reference content from unselected days"
- Informational only -- does not block generation, no extra confirmation step
- Warning hidden completely when all days selected or only 1 day exists

### Claude's Discretion
- Exact banner color and icon style (match existing app design language)
- Day card visual treatment (shadows, borders, selection indicator)
- Stats line typography and spacing
- Select all control style (checkbox vs button)
- Generate button label in scripted mode
- Animation/transition for day picker appearing after upload

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DAY-01 | Day picker UI appears between upload and generation when 2+ days detected | Parser returns `ScriptedParseResult.days[]` and `totalDays`; day picker renders when `totalDays >= 2` in scripted mode |
| DAY-02 | Day cards show day number, title, and section/block count preview | `DaySection` has `dayNumber`, `title`, `blocks[]`; section count derived from counting `section-heading` blocks; content block count from filtering non-heading blocks |
| DAY-03 | User can select one or more days to generate decks for | React state `Set<number>` (selected day numbers), initialized with all day numbers; toggle on card click |
| DAY-04 | Select-all option available for importing all days | Simple "Select All" / "Deselect All" button above grid that sets/clears the full day number set |
| DAY-05 | Cross-day reference warning shown when importing a subset of days | Amber callout visible when `selectedDays.size < totalDays && totalDays > 1` |
| MODE-01 | Landing page provides explicit toggle between AI generation and scripted import after upload | `detectScriptedMarkers()` runs on `lessonText` after upload; banner with toggle switch shown when markers detected |
| MODE-02 | Scripted mode available for DOCX, PDF, and plain text uploads | Extend lesson plan file input to accept `.docx,.txt,.pdf`; extract text from DOCX via mammoth (already in deps); read `.txt` via `File.text()`; run marker detection on extracted text |
| MODE-03 | Import preview displays detected statistics before generation | Stats line computed from `ScriptedParseResult.stats` filtered by selected days; shown above generate button |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | Component UI, state management | Already in project (package.json) |
| TypeScript | 5.8.2 | Type safety | Already in project |
| Tailwind CSS (via classes) | N/A | Styling (utility classes in JSX) | Already used throughout all components |
| mammoth | 1.11.0 | DOCX text extraction | Already in dependencies, used by docxProcessor.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pdf.js | 3.11.174 (CDN) | PDF text extraction | Already loaded via CDN in App.tsx processPdf() |

### Alternatives Considered
None -- this phase uses only existing project libraries with zero new dependencies.

**Installation:**
```bash
# No installation needed -- all dependencies already present
```

## Architecture Patterns

### Recommended Project Structure
```
services/scriptedParser/
  scriptedParser.ts     # Add detectScriptedMarkers() export
  types.ts              # Existing types (ScriptedParseResult, DaySection, etc.)

App.tsx                 # Add mode state, day picker UI, stats line, banner
                        # Extend handleFileChange for DOCX/TXT
                        # Wire selectedDays into GenerationInput

services/generationPipeline.ts  # Filter days by selectedDays before mapping
services/aiProvider.ts          # Extend GenerationInput with selectedDays
```

### Pattern 1: Marker Detection as Pure Function
**What:** A pure function `detectScriptedMarkers(text: string): boolean` in `scriptedParser.ts` that checks if text contains scripted markers without doing a full parse.
**When to use:** After any lesson plan upload/paste completes, before generation.
**Example:**
```typescript
// In services/scriptedParser/scriptedParser.ts
/**
 * Quick detection of scripted markers in text.
 * Returns true if at least one explicit marker (Say:, Ask:, etc.) is found.
 * Used by UI to auto-suggest scripted import mode.
 * Much cheaper than a full parse -- just regex matching.
 */
export function detectScriptedMarkers(text: string): boolean {
  return MARKER_PATTERNS.some(pattern => pattern.regex.test(
    text.split('\n').find(line => pattern.regex.test(line)) ?? ''
  ));
}
```

A more robust approach is to check line-by-line:
```typescript
export function detectScriptedMarkers(text: string): boolean {
  const lines = text.split('\n');
  for (const line of lines) {
    for (const pattern of MARKER_PATTERNS) {
      if (pattern.regex.test(line)) return true;
    }
  }
  return false;
}
```

### Pattern 2: Derived State for Mode Detection (Follows uploadMode Pattern)
**What:** The current `uploadMode` is a `useMemo` that derives mode from `uploadedFile`, `lessonText`, and `existingPptFile`. Scripted mode detection should follow the same pattern -- a derived value that recomputes when `lessonText` changes.
**When to use:** For the scripted mode suggestion state.
**Example:**
```typescript
// Follows the existing uploadMode useMemo at App.tsx:403
const hasScriptedMarkers = useMemo(() => {
  if (!lessonText.trim()) return false;
  return detectScriptedMarkers(lessonText);
}, [lessonText]);

// User can override: starts as "suggested" by detection, toggled by banner switch
const [scriptedModeOverride, setScriptedModeOverride] = useState<boolean | null>(null);

// Effective mode: override wins, else detection result
const isScriptedMode = scriptedModeOverride ?? hasScriptedMarkers;
```

### Pattern 3: Day Selection State with Reactive Stats
**What:** Track selected day numbers as a `Set<number>`, compute stats reactively from the parse result filtered to selected days.
**When to use:** When building the day picker and stats line.
**Example:**
```typescript
const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
const [parseResult, setParseResult] = useState<ScriptedParseResult | null>(null);

// Initialize selectedDays when parseResult changes (all days selected by default)
useEffect(() => {
  if (parseResult) {
    setSelectedDays(new Set(parseResult.days.map(d => d.dayNumber)));
  }
}, [parseResult]);

// Reactive stats from selected days
const importStats = useMemo(() => {
  if (!parseResult) return null;
  const selected = parseResult.days.filter(d => selectedDays.has(d.dayNumber));
  const sectionCount = selected.reduce((sum, day) =>
    sum + day.blocks.filter(b => b.type === 'section-heading').length, 0);
  const blockCount = selected.reduce((sum, day) =>
    sum + day.blocks.filter(b => b.type !== 'section-heading').length, 0);
  return {
    days: selected.length,
    sections: sectionCount,
    blocks: blockCount,
  };
}, [parseResult, selectedDays]);
```

### Pattern 4: Extended UploadMode with Scripted
**What:** The existing `UploadMode` type is `'fresh' | 'refine' | 'blend' | 'none'`. When scripted mode is active, the effective `GenerationMode` should be `'scripted'` instead of what `uploadMode` would normally derive.
**When to use:** When constructing `GenerationInput` in `handleGenerate`.
**Example:**
```typescript
// In handleGenerate, override mode when scripted is active
const effectiveMode: GenerationMode = isScriptedMode ? 'scripted' : uploadMode as GenerationMode;

const generationInput: GenerationInput = {
  lessonText: lessonText,
  // ... existing fields
  mode: effectiveMode,
  selectedDays: isScriptedMode && parseResult && parseResult.totalDays > 1
    ? Array.from(selectedDays) : undefined,
};
```

### Pattern 5: Pipeline Day Filtering
**What:** The pipeline at `generationPipeline.ts:180-181` currently flattens all days. Replace with selected-day filtering.
**When to use:** In the scripted mode branch of `runGenerationPipeline`.
**Example:**
```typescript
// Replace line 181 in generationPipeline.ts
const selectedDayNumbers = input.selectedDays
  ? new Set(input.selectedDays)
  : null; // null means all days

const filteredDays = selectedDayNumbers
  ? parseResult.days.filter(d => selectedDayNumbers.has(d.dayNumber))
  : parseResult.days;

const allBlocks = filteredDays.flatMap(day => day.blocks);
```

### Pattern 6: Multi-Format File Upload (DOCX + TXT + PDF)
**What:** Extend the lesson plan file input to accept `.docx`, `.txt`, and `.pdf`. Route each format to the appropriate text extractor.
**When to use:** For MODE-02 (DOCX, PDF, and plain text uploads).
**Example:**
```typescript
// Extend file input accept attribute
accept=".pdf,.docx,.txt"

// In handleFileChange, route by file type
const ext = file.name.split('.').pop()?.toLowerCase();
if (ext === 'pdf') {
  await processPdf(file, setIsProcessingFile, (text, images) => {
    setLessonText(text);
    setPageImages(images);
  }, setError);
} else if (ext === 'docx') {
  setIsProcessingFile(true);
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    setLessonText(result.value);
    setPageImages([]); // DOCX has no page images
  } catch (err) {
    setError('Failed to read DOCX file');
  } finally {
    setIsProcessingFile(false);
  }
} else if (ext === 'txt') {
  setIsProcessingFile(true);
  try {
    const text = await file.text();
    setLessonText(text);
    setPageImages([]);
  } catch (err) {
    setError('Failed to read text file');
  } finally {
    setIsProcessingFile(false);
  }
}
```

### Anti-Patterns to Avoid
- **Running full parse on every keystroke:** `detectScriptedMarkers()` is cheap but `parseScriptedLessonPlan()` parses the full text. Only call the full parse when entering scripted mode or when the generate button is pressed -- NOT reactively on every text change. Use the lightweight detection for banner display.
- **Storing parse result in pipeline options:** The parse result belongs to the UI state (for stats/day picking). The pipeline should do its own parse from text (it already does at line 179). Pass `selectedDays` as data, not the parse result object.
- **Making day picker a separate route/modal:** CONTEXT.md explicitly says "inline step on the landing page below the upload area (no modal)." Keep it as a conditional section within the existing landing page card.
- **Blocking generation when not all days selected:** CONTEXT.md says "informational only -- does not block generation, no extra confirmation step." The amber warning should never prevent the generate button from being clickable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scripted marker detection | Custom regex engine | Reuse `MARKER_PATTERNS` from `scriptedParser.ts` | Already tested, ordered correctly, handles edge cases |
| DOCX text extraction | Custom XML parser | `mammoth.extractRawText()` (already in deps) | Handles complex OOXML, production-tested |
| Day/section/block counting | Custom counter logic | Derive from `ScriptedParseResult.days[].blocks[]` | Parser already groups by day and tags block types |
| Text file reading | FileReader API | `File.text()` (modern API, returns Promise) | Simpler, no callback mess, wide browser support |

**Key insight:** The scripted parser already returns all the data structures needed for the day picker UI. The parser's `DaySection` has `dayNumber`, `title`, and `blocks[]`. The parser's `ParseStats` has all aggregate counts. No new data processing logic is needed -- just UI to render existing data.

## Common Pitfalls

### Pitfall 1: Stale Parse Result After Text Edits
**What goes wrong:** User uploads a file, sees day picker, then edits text in textarea. The parse result becomes stale but the day picker still shows old data.
**Why it happens:** Parse result is computed once at upload time but `lessonText` can change via the textarea.
**How to avoid:** Either (a) re-run lightweight parse when `lessonText` changes significantly and scripted mode is active, or (b) clear the parse result / day picker when `lessonText` is manually edited. Option (b) is simpler and safer -- if they're editing the text, they should re-trigger detection.
**Warning signs:** Day picker shows "3 days, 8 sections" but text was changed and now has different structure.

### Pitfall 2: Mode Override Not Resetting on New Upload
**What goes wrong:** User uploads file A (has markers), toggles OFF scripted mode, then uploads file B (also has markers). The toggle-off override persists and they don't see the scripted suggestion.
**Why it happens:** `scriptedModeOverride` state is not reset when a new file is uploaded.
**How to avoid:** Reset `scriptedModeOverride` to `null` (auto-detect) whenever `uploadedFile` or `lessonText` changes from empty to non-empty.
**Warning signs:** User uploads scripted content but no banner appears.

### Pitfall 3: PDF-Only Upload Restriction
**What goes wrong:** The current lesson plan upload zone says "Lesson Plan PDF" and has `accept=".pdf"` with a `file.type !== 'application/pdf'` check.
**Why it happens:** Phase 72 requires DOCX and TXT support but the upload zone is hardcoded for PDF only.
**How to avoid:** Update the accept attribute to `.pdf,.docx,.txt`, update the type check to validate against all three extensions, and update the zone label from "Lesson Plan PDF" to "Lesson Plan" with updated helper text.
**Warning signs:** Users can't upload DOCX or TXT files.

### Pitfall 4: Day Number Gaps
**What goes wrong:** A lesson plan might have Day 1, Day 3, Day 5 (skipping numbers). The day picker needs to handle non-sequential day numbers.
**Why it happens:** The parser preserves the day number from the source text, which might not be sequential.
**How to avoid:** Use `dayNumber` as the identity key, not array index. The `Set<number>` approach with `dayNumber` as values handles gaps naturally.
**Warning signs:** Day cards show correct numbers but selection logic breaks on gaps.

### Pitfall 5: Generate Button Label Conflict
**What goes wrong:** In scripted mode, the generate button should show a different label, but the current `uploadMode` logic determines the button text independently.
**Why it happens:** The button text logic at line 2484 checks `uploadMode` values but doesn't account for scripted mode.
**How to avoid:** Add scripted mode check before the existing uploadMode checks: `isScriptedMode ? 'Import Scripted Lesson' : uploadMode === 'refine' ? ...`
**Warning signs:** Button says "Generate Slideshow" when in scripted mode.

## Code Examples

### Day Card Component (Inline)
```typescript
// Inline within App.tsx landing page section
// Day card within the grid (matches existing card style from UploadPanel resource cards)
{parseResult && parseResult.totalDays >= 2 && isScriptedMode && (
  <div className="mb-6">
    {/* Select All / Deselect All */}
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Select Days to Import
      </p>
      <button
        onClick={() => {
          if (selectedDays.size === parseResult.totalDays) {
            setSelectedDays(new Set());
          } else {
            setSelectedDays(new Set(parseResult.days.map(d => d.dayNumber)));
          }
        }}
        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        {selectedDays.size === parseResult.totalDays ? 'Deselect All' : 'Select All'}
      </button>
    </div>

    {/* Day Cards Grid */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {parseResult.days.map(day => {
        const isSelected = selectedDays.has(day.dayNumber);
        const sectionCount = day.blocks.filter(b => b.type === 'section-heading').length;
        const blockCount = day.blocks.filter(b => b.type !== 'section-heading').length;
        return (
          <button
            key={day.dayNumber}
            onClick={() => toggleDaySelection(day.dayNumber)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              isSelected
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60'
            }`}
          >
            <p className="font-bold text-sm text-slate-800 dark:text-white">
              Day {day.dayNumber}
            </p>
            {day.title && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {day.title}
              </p>
            )}
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded font-medium">
                {sectionCount} sections
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded font-medium">
                {blockCount} blocks
              </span>
            </div>
          </button>
        );
      })}
    </div>

    {/* Cross-day reference warning (DAY-05) */}
    {selectedDays.size < parseResult.totalDays && selectedDays.size > 0 && (
      <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-300">
        Some days may reference content from unselected days
      </div>
    )}
  </div>
)}
```

### Scripted Mode Banner
```typescript
// Appears below the mode indicator section, before verbosity selector
{hasScriptedMarkers && uploadMode === 'fresh' && (
  <div className="mb-6 p-4 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
          {/* Script/document icon */}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-sm text-amber-700 dark:text-amber-300">
            Scripted markers detected
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Your lesson plan contains Say:, Ask:, and other scripted markers
          </p>
        </div>
      </div>
      {/* Toggle switch */}
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isScriptedMode}
          onChange={() => setScriptedModeOverride(prev => prev === null ? !hasScriptedMarkers : !prev)}
        />
        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
      </label>
    </div>
  </div>
)}
```

### Import Stats Line
```typescript
// Compact stats line above the generate button
{isScriptedMode && importStats && (
  <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">
    {importStats.days} {importStats.days === 1 ? 'day' : 'days'} &middot;{' '}
    {importStats.sections} {importStats.sections === 1 ? 'section' : 'sections'} &middot;{' '}
    {importStats.blocks} script {importStats.blocks === 1 ? 'block' : 'blocks'}
  </p>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PDF-only upload for lesson plans | Multi-format upload (PDF, DOCX, TXT) | Phase 72 (this phase) | Teachers can upload lesson plans from any source format |
| Manual mode selection | Auto-detection of scripted markers | Phase 72 (this phase) | Smart defaults reduce friction |
| All days flattened unconditionally | Day selection with preview stats | Phase 72 (this phase) | Teachers control what gets imported |

**Deprecated/outdated:**
- None. All existing code paths remain valid. Scripted mode additions are additive.

## Open Questions

1. **Parse timing: when to run full parse vs. lightweight detection?**
   - What we know: `detectScriptedMarkers()` is cheap (stops at first match). `parseScriptedLessonPlan()` processes entire text.
   - What's unclear: Should full parse happen eagerly (on mode toggle) or lazily (on generate)?
   - Recommendation: Run full parse eagerly when scripted mode is activated (or detected). The parse is pure and fast (~1ms for typical lesson plans). This gives us day counts and stats for the UI immediately. The pipeline will re-parse anyway (idempotent), so there's no double-work concern -- just a negligible cost for responsive UI.

2. **Textarea editing after upload: should it invalidate the day picker?**
   - What we know: Users can upload a file AND edit the textarea. The textarea is the source of truth (`lessonText`).
   - What's unclear: Should we re-run detection/parsing on every textarea change?
   - Recommendation: Re-run detection (not full parse) on `lessonText` changes via `useMemo`. Re-run full parse only when entering scripted mode or when text changes while already in scripted mode (debounced). This keeps the day picker accurate without excessive re-parsing.

3. **Existing `uploadMode` + scripted interaction**
   - What we know: `uploadMode` derives from uploaded file presence. Scripted mode overlays on top of `uploadMode === 'fresh'`.
   - What's unclear: Can scripted mode work with refine/blend modes?
   - Recommendation: Scripted mode only applies when `uploadMode === 'fresh'` (lesson plan uploaded, no existing presentation). This matches CONTEXT.md: the banner only appears when markers are detected in the lesson plan text. If both lesson plan + existing PPT are uploaded, blend mode takes priority and scripted is not offered.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `services/scriptedParser/scriptedParser.ts` -- full parser implementation, `MARKER_PATTERNS` array
- Codebase analysis: `services/scriptedParser/types.ts` -- `ScriptedParseResult`, `DaySection`, `ParseStats`, `SUPPORTED_MARKERS`
- Codebase analysis: `services/scriptedParser/scriptedMapper.ts` -- block-to-slide mapping
- Codebase analysis: `services/generationPipeline.ts` -- scripted mode branch (lines 170-224), placeholder comment at line 180
- Codebase analysis: `services/aiProvider.ts` -- `GenerationMode` type, `GenerationInput` interface
- Codebase analysis: `App.tsx` -- landing page layout (lines 2196-2498), `uploadMode` derivation (lines 401-411), `handleGenerate` (lines 557-612), `handleFileChange` (lines 513-533), `processPdf` (lines 467-511)
- Codebase analysis: `services/documentProcessors/docxProcessor.ts` -- mammoth DOCX extraction pattern
- Codebase analysis: `services/uploadService.ts` -- multi-format upload validation patterns
- Codebase analysis: `types.ts` -- `Slide`, `GenerationMode`, `UploadedResource`
- Codebase analysis: `package.json` -- confirmed mammoth 1.11.0 already in dependencies

### Secondary (MEDIUM confidence)
- None required -- this is a pure UI phase using only existing project infrastructure

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all libraries already in project
- Architecture: HIGH -- clear integration points identified with line numbers, existing patterns to follow
- Pitfalls: HIGH -- based on direct codebase analysis of current data flow and state management

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable -- no external dependency changes expected)
