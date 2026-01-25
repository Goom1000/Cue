# Phase 33: Upfront Verbosity Selection - Research

**Researched:** 2026-01-25
**Domain:** Landing page UI, AI generation parameters, state management
**Confidence:** HIGH

## Summary

Phase 33 adds a verbosity selector to the landing page so teachers can choose their preferred teleprompter verbosity level (Concise/Standard/Detailed) before generating slides. This research documents the existing landing page structure, the AI generation pipeline, and the established verbosity patterns from v3.1.

The implementation is straightforward because:
1. The landing page already has a well-organized settings section (auto-generate images toggle) providing a UI pattern
2. v3.1 established the `VerbosityLevel` type and regeneration prompts that can be reused
3. The `generateLessonSlides` function in `geminiService.ts` already accepts a `GenerationInput` object that can be extended
4. State flows cleanly from App.tsx to the AI provider

**Primary recommendation:** Add a verbosity selector row below the Mode Indicator section on the landing page, using the existing toggle pattern. Store selection in App.tsx state. Extend `GenerationInput` with an optional `verbosity` field. Modify AI generation system instructions to use the appropriate `TELEPROMPTER_RULES_*` variant based on selection. Default to 'standard' when no selection made.

## Existing Architecture Analysis

### Landing Page Structure

**File:** `/App.tsx`
**Lines:** 1083-1296 (INPUT state rendering)

```
Landing Page Structure:
├── Logo + Title Section (lines 1087-1105)
├── Upload Card (lines 1107-1294)
│   ├── Dual Upload Zones (lines 1109-1190)
│   │   ├── Lesson Plan PDF (green theme)
│   │   └── Existing Presentation PDF (blue theme)
│   ├── Mode Indicator (lines 1192-1227)  <-- VERBOSITY GOES AFTER THIS
│   ├── "Or paste text below" divider (lines 1229-1232)
│   ├── Textarea (lines 1234-1239)
│   ├── Auto-generate AI Visuals toggle (lines 1241-1260)
│   ├── Error display (line 1262)
│   └── Action buttons (lines 1264-1293)
```

**Recommended position:** After Mode Indicator, before the "Or paste text below" divider. This keeps all "AI generation options" grouped together (mode, verbosity, auto-images).

### Mode Indicator Pattern (to Follow)

**Lines:** 1192-1227 - The Mode Indicator provides the exact UI pattern to follow:

```tsx
{uploadMode !== 'none' && (
  <div className={`mb-6 p-4 rounded-xl border ${
    uploadMode === 'fresh' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' :
    // ... more styles
  }`}>
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${...}`}>
        {/* icon */}
      </div>
      <div>
        <p className="font-bold text-sm">{/* Label */}</p>
        <p className="text-xs text-slate-600 dark:text-slate-400">{/* Description */}</p>
      </div>
    </div>
  </div>
)}
```

### Auto-Generate Images Toggle Pattern (Alternative)

**Lines:** 1241-1260 - The toggle pattern provides another viable approach:

```tsx
<div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-8">
    <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm ${/* icon styles */}`}>
            {/* emoji or icon */}
        </div>
        <div>
            <p className="font-bold text-slate-700 dark:text-slate-300">Label</p>
            <p className="text-xs text-slate-500 dark:text-slate-500">Description</p>
        </div>
    </div>
    {/* Toggle or buttons on right side */}
</div>
```

**Recommended:** Use a hybrid - the container style from auto-images toggle, but with three-button selector (like v3.1 teleprompter verbosity selector) instead of a toggle.

### Existing VerbosityLevel Type

**File:** `/services/geminiService.ts`
**Line:** 1080

```typescript
export type VerbosityLevel = 'concise' | 'standard' | 'detailed';
```

**Re-exported from:** `/services/aiProvider.ts` line 7

This type is already shared across the codebase. Import it in App.tsx.

### Existing Verbosity Rules (Standard)

**File:** `/services/geminiService.ts`
**Lines:** 6-26 (TELEPROMPTER_RULES)
**Lines:** 28-45 (TELEPROMPTER_RULES_CONCISE)
**Lines:** 47-65 (TELEPROMPTER_RULES_DETAILED)

All three verbosity instruction sets already exist and are used by `regenerateTeleprompter`. For upfront generation, we need to inject the appropriate rules into `generateLessonSlides` based on selected verbosity.

### Current Generation Pipeline

**File:** `/services/geminiService.ts`

```typescript
// generateLessonSlides signature (line 137)
export const generateLessonSlides = async (
  apiKey: string,
  inputOrText: GenerationInput | string,
  pageImages: string[] = []
): Promise<Slide[]>

// GenerationInput interface (from aiProvider.ts, lines 12-18)
export interface GenerationInput {
  lessonText: string;
  lessonImages?: string[];
  presentationText?: string;
  presentationImages?: string[];
  mode: GenerationMode;
}
```

**Key insight:** The `generateLessonSlides` function already uses `TELEPROMPTER_RULES` in its system instructions. To support upfront verbosity, we need to:
1. Extend `GenerationInput` with `verbosity?: VerbosityLevel`
2. Select the appropriate rules based on `input.verbosity || 'standard'`

### Current System Instruction Pattern

**File:** `/services/geminiService.ts`
**Lines:** 70-135 (getSystemInstructionForMode function)

Each generation mode (fresh/refine/blend) includes `${TELEPROMPTER_RULES}` in its system instruction. This is the injection point:

```typescript
function getSystemInstructionForMode(mode: GenerationMode): string {
  switch (mode) {
    case 'fresh':
      return `
// ...
${TELEPROMPTER_RULES}  // <-- Replace with dynamic verbosity rules
// ...
`;
```

### State Management Location

**File:** `/App.tsx`
**Lines:** 190-230 (existing state declarations)

```typescript
const [appState, setAppState] = useState<AppState>(AppState.INPUT);
const [uploadedFile, setUploadedFile] = useState<File | null>(null);
// ...
const [autoGenerateImages, setAutoGenerateImages] = useState(true);
```

**New state:** Add `const [upfrontVerbosity, setUpfrontVerbosity] = useState<VerbosityLevel>('standard');`

### Generation Call Site

**File:** `/App.tsx`
**Lines:** 328-374 (handleGenerate function)

```typescript
const handleGenerate = async () => {
  // ...
  const generationInput: GenerationInput = {
    lessonText,
    lessonImages: pageImages.length > 0 ? pageImages : undefined,
    presentationText: existingPptText || undefined,
    presentationImages: existingPptImages.length > 0 ? existingPptImages : undefined,
    mode: uploadMode as GenerationMode,
  };

  const generatedSlides = await provider.generateLessonSlides(generationInput);
  // ...
};
```

**Modification needed:** Add `verbosity: upfrontVerbosity` to the `generationInput` object.

## Architecture Patterns

### Recommended State Management

```typescript
// In App.tsx - add near other state declarations
import { VerbosityLevel } from './services/aiProvider';

const [upfrontVerbosity, setUpfrontVerbosity] = useState<VerbosityLevel>('standard');
```

**Why App.tsx state (not a hook or context):**
- Follows existing pattern for landing page options (autoGenerateImages)
- Only used during generation phase, then "forgotten" (no persistence needed)
- Simple single-consumer pattern

### Recommended GenerationInput Extension

```typescript
// In services/aiProvider.ts - extend GenerationInput
export interface GenerationInput {
  lessonText: string;
  lessonImages?: string[];
  presentationText?: string;
  presentationImages?: string[];
  mode: GenerationMode;
  verbosity?: VerbosityLevel;  // NEW: Optional, defaults to 'standard'
}
```

**Why optional:** Backward compatibility with any existing callers, and default behavior matches current (Standard).

### Recommended System Instruction Modification

```typescript
// In services/geminiService.ts

// Helper function to get verbosity rules
function getTeleprompterRulesForVerbosity(verbosity: VerbosityLevel = 'standard'): string {
  switch (verbosity) {
    case 'concise':
      return TELEPROMPTER_RULES_CONCISE;
    case 'detailed':
      return TELEPROMPTER_RULES_DETAILED;
    default:
      return TELEPROMPTER_RULES;
  }
}

// Modify getSystemInstructionForMode to accept verbosity
function getSystemInstructionForMode(mode: GenerationMode, verbosity: VerbosityLevel = 'standard'): string {
  const teleprompterRules = getTeleprompterRulesForVerbosity(verbosity);

  switch (mode) {
    case 'fresh':
      return `
// ... existing preamble ...
${teleprompterRules}  // Dynamic verbosity rules
// ... rest of instruction ...
`;
    // ... similar for 'refine' and 'blend'
  }
}
```

### Recommended UI Structure

```tsx
{/* Verbosity Selection - after Mode Indicator, before divider */}
{uploadMode !== 'none' && (
  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-xl shadow-sm">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </div>
      <div>
        <p className="font-bold text-slate-700 dark:text-slate-300">Teleprompter Style</p>
        <p className="text-xs text-slate-500 dark:text-slate-500">
          {upfrontVerbosity === 'concise' && 'Brief prompts for experienced teachers'}
          {upfrontVerbosity === 'standard' && 'Balanced guidance with examples'}
          {upfrontVerbosity === 'detailed' && 'Full script you can read verbatim'}
        </p>
      </div>
    </div>
    <div className="flex gap-1">
      {(['concise', 'standard', 'detailed'] as const).map(level => (
        <button
          key={level}
          onClick={() => setUpfrontVerbosity(level)}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            upfrontVerbosity === level
              ? 'bg-indigo-600 dark:bg-amber-500 text-white shadow-lg'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
          }`}
        >
          {level}
        </button>
      ))}
    </div>
  </div>
)}
```

**Note:** Selector only shows when `uploadMode !== 'none'` - no point selecting verbosity if nothing will be generated.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | Current | UI state management | Already in use |
| TypeScript | Current | Type safety | Already in use |

### Supporting

No additional libraries needed. This feature uses existing patterns:
- `useState` for verbosity selection
- Existing `VerbosityLevel` type
- Existing `TELEPROMPTER_RULES_*` constants
- Existing UI patterns from landing page

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verbosity type | New type definition | `VerbosityLevel` from aiProvider.ts | Already exists and is shared |
| UI selector styling | Custom component | Inline JSX following existing toggle pattern | Consistency with landing page |
| Rules selection | Complex mapping | Simple switch statement | Direct, readable |
| State persistence | localStorage | useState (ephemeral) | Only needed during generation |

**Key insight:** This phase builds on existing v3.1 verbosity infrastructure. Reuse everything.

## Common Pitfalls

### Pitfall 1: Not Conditionally Showing Selector

**What goes wrong:** Verbosity selector appears even when no files uploaded
**Why it happens:** Forgetting to check `uploadMode !== 'none'`
**How to avoid:** Wrap selector in same conditional as Mode Indicator
**Warning signs:** Empty upload zones but verbosity buttons visible

### Pitfall 2: Not Passing Verbosity to Generation

**What goes wrong:** Selection made but all slides generate with Standard verbosity
**Why it happens:** Forgetting to add `verbosity` field to GenerationInput
**How to avoid:** Trace the data flow: App.tsx state -> GenerationInput -> getSystemInstructionForMode
**Warning signs:** Concise selected but detailed teleprompter scripts generated

### Pitfall 3: Duplicating Verbosity Rules

**What goes wrong:** Creating new TELEPROMPTER_RULES variants instead of reusing existing
**Why it happens:** Not knowing v3.1 already defined them
**How to avoid:** Use `TELEPROMPTER_RULES`, `TELEPROMPTER_RULES_CONCISE`, `TELEPROMPTER_RULES_DETAILED` from geminiService.ts
**Warning signs:** New constants that look similar to existing ones

### Pitfall 4: Breaking Backward Compatibility

**What goes wrong:** Existing callers of generateLessonSlides break
**Why it happens:** Making `verbosity` a required field
**How to avoid:** Make `verbosity?: VerbosityLevel` (optional) and default to 'standard'
**Warning signs:** Type errors in existing code, runtime failures

### Pitfall 5: Forgetting Claude Provider

**What goes wrong:** Gemini uses verbosity but Claude doesn't
**Why it happens:** Only modifying geminiService.ts
**How to avoid:** Modify claudeProvider.ts with same pattern
**Warning signs:** Different teleprompter styles depending on provider

## Code Examples

### App.tsx State Addition

```typescript
// Near line 230, after existing state declarations
import { VerbosityLevel } from './services/aiProvider';

// Inside component
const [upfrontVerbosity, setUpfrontVerbosity] = useState<VerbosityLevel>('standard');
```

### GenerationInput Extension

```typescript
// In services/aiProvider.ts
export interface GenerationInput {
  lessonText: string;
  lessonImages?: string[];
  presentationText?: string;
  presentationImages?: string[];
  mode: GenerationMode;
  verbosity?: VerbosityLevel;  // NEW
}
```

### handleGenerate Modification

```typescript
// In App.tsx handleGenerate function (around line 345)
const generationInput: GenerationInput = {
  lessonText,
  lessonImages: pageImages.length > 0 ? pageImages : undefined,
  presentationText: existingPptText || undefined,
  presentationImages: existingPptImages.length > 0 ? existingPptImages : undefined,
  mode: uploadMode as GenerationMode,
  verbosity: upfrontVerbosity,  // NEW
};
```

### geminiService.ts Modification

```typescript
// Add helper function before generateLessonSlides
function getTeleprompterRulesForVerbosity(verbosity: VerbosityLevel = 'standard'): string {
  switch (verbosity) {
    case 'concise':
      return TELEPROMPTER_RULES_CONCISE;
    case 'detailed':
      return TELEPROMPTER_RULES_DETAILED;
    default:
      return TELEPROMPTER_RULES;
  }
}

// Modify getSystemInstructionForMode signature and body
function getSystemInstructionForMode(mode: GenerationMode, verbosity: VerbosityLevel = 'standard'): string {
  const teleprompterRules = getTeleprompterRulesForVerbosity(verbosity);

  switch (mode) {
    case 'fresh':
      return `
You are an elite Primary Education Consultant.
// ... existing content ...
${teleprompterRules}
// ... existing content ...
`;
    case 'refine':
      return `
You are an elite Primary Education Consultant.
// ... existing content ...
${teleprompterRules}
// ... existing content ...
`;
    case 'blend':
      return `
You are an elite Primary Education Consultant.
// ... existing content ...
${teleprompterRules}
// ... existing content ...
`;
  }
}

// Modify generateLessonSlides to pass verbosity
export const generateLessonSlides = async (
  apiKey: string,
  inputOrText: GenerationInput | string,
  pageImages: string[] = []
): Promise<Slide[]> => {
  const input: GenerationInput = typeof inputOrText === 'string'
    ? { lessonText: inputOrText, lessonImages: pageImages, mode: 'fresh' }
    : inputOrText;

  // ...existing code...

  const systemInstruction = getSystemInstructionForMode(input.mode, input.verbosity);  // MODIFIED

  // ...rest of function unchanged...
};
```

### Landing Page UI

```tsx
{/* Verbosity Selector - after Mode Indicator (around line 1227), before divider */}
{uploadMode !== 'none' && (
  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shadow-sm">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </div>
      <div>
        <p className="font-bold text-slate-700 dark:text-slate-300">Teleprompter Style</p>
        <p className="text-xs text-slate-500 dark:text-slate-500">
          {upfrontVerbosity === 'concise' && 'Brief prompts for experienced teachers'}
          {upfrontVerbosity === 'standard' && 'Balanced guidance with examples'}
          {upfrontVerbosity === 'detailed' && 'Full script you can read verbatim'}
        </p>
      </div>
    </div>
    <div className="flex gap-1">
      {(['concise', 'standard', 'detailed'] as const).map(level => (
        <button
          key={level}
          onClick={() => setUpfrontVerbosity(level)}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            upfrontVerbosity === level
              ? 'bg-indigo-600 dark:bg-amber-500 text-white shadow-lg'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
          }`}
        >
          {level}
        </button>
      ))}
    </div>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single verbosity (Standard) at generation | Upfront verbosity selection | Phase 33 (v3.3) | Initial teleprompter matches preference |
| Post-generation verbosity only | Pre-generation + post-generation | Phase 33 (v3.3) | Fewer regeneration API calls |

**Deprecated/outdated:**
- Nothing deprecated. This extends existing functionality.

## Integration Points

### Files to Modify

1. **`/services/aiProvider.ts`**
   - Add `verbosity?: VerbosityLevel` to `GenerationInput` interface

2. **`/services/geminiService.ts`**
   - Add `getTeleprompterRulesForVerbosity` helper function
   - Modify `getSystemInstructionForMode` to accept verbosity parameter
   - Modify `generateLessonSlides` to pass `input.verbosity` to system instruction

3. **`/services/providers/claudeProvider.ts`**
   - Apply same modifications as geminiService.ts for consistency

4. **`/App.tsx`**
   - Add `upfrontVerbosity` state
   - Add verbosity selector UI in landing page
   - Modify `handleGenerate` to include verbosity in GenerationInput

### Files NOT to Modify

- `/types.ts` - No type changes needed (VerbosityLevel exists in geminiService.ts)
- `/components/PresentationView.tsx` - Post-generation verbosity unchanged
- `/services/loadService.ts` - No file format changes (verbosityCache handles per-slide caching)
- `/services/saveService.ts` - No save format changes

## Open Questions

None. All requirements are clear:

1. **UPFR-01**: UI selector on landing page (defined above)
2. **UPFR-02**: Pass to AI generation (GenerationInput.verbosity)
3. **UPFR-03**: Default to Standard (useState default + optional field default)

## Sources

### Primary (HIGH confidence)
- `/App.tsx` - Direct code analysis of landing page structure, handleGenerate, state patterns
- `/services/geminiService.ts` - Direct code analysis of generation pipeline and verbosity rules
- `/services/aiProvider.ts` - Direct code analysis of GenerationInput interface
- `/.planning/REQUIREMENTS.md` - Requirements UPFR-01, UPFR-02, UPFR-03
- `/.planning/phases/27-verbosity-ui-generation/27-RESEARCH.md` - Established verbosity patterns

### Secondary (MEDIUM confidence)
- `/.planning/phases/28-caching-backward-compatibility/28-RESEARCH.md` - Verbosity caching patterns
- `/components/PresentationView.tsx` - Existing verbosity selector UI reference

## Metadata

**Confidence breakdown:**
- Landing page structure: HIGH - Direct code analysis
- Generation pipeline: HIGH - Direct code analysis, well-documented
- Verbosity rules: HIGH - Already exist and are used in v3.1
- UI patterns: HIGH - Multiple existing examples to follow

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (stable codebase, additive changes only)
