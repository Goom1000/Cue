# Phase 27: Verbosity UI & Generation - Research

**Researched:** 2026-01-24
**Domain:** Teleprompter UI, AI prompt engineering for verbosity levels
**Confidence:** HIGH

## Summary

Phase 27 adds a verbosity toggle to the teleprompter panel allowing teachers to switch between Concise, Standard, and Detailed teleprompter scripts. This research documents the existing teleprompter infrastructure, identifies the exact code locations for modifications, and provides specific patterns for implementing the verbosity system.

The implementation is straightforward because:
1. The teleprompter panel exists in `PresentationView.tsx` with well-structured JSX
2. AI generation uses a shared `TELEPROMPTER_RULES` constant that can be extended with verbosity variants
3. State management follows established patterns (useState for local, props for presentation-level)

**Primary recommendation:** Add a three-button selector in the teleprompter panel header, store verbosity level in PresentationView state, and create verbosity-specific system instructions in geminiService.ts.

## Existing Architecture Analysis

### Teleprompter Panel Location

**File:** `/components/PresentationView.tsx`
**Lines:** ~1208-1500 (teleprompter panel JSX)

```
Panel Structure:
├── Header (line ~1209-1223)
│   ├── "Presenter Console" label
│   ├── "Full Script" toggle button
│   └── Progress dots (bullet indicators)
├── Content Area (line ~1225-1241)
│   ├── Question Focus banner (conditional)
│   └── Script segment display (<MarkdownText>)
├── Action Area (line ~1243-1500)
│   ├── "Reveal Point" / "Next Slide" button
│   ├── Manual/Targeted mode toggle
│   └── Question generation buttons (A-E grades)
```

**Verbosity selector position:** Below header (line ~1223), above content area. This matches VERB-02 requirement.

### Current Script Generation

**Script segmentation logic:** Lines 935-969
```typescript
const currentScriptSegment = useMemo(() => {
    const rawScript = currentSlide.speakerNotes || "";
    const segments = rawScript.split('👉');

    if (showFullScript) return rawScript || "No notes available.";

    // INTRO when visibleBullets === 0
    // BULLET POINT elaboration for visibleBullets > 0
    ...
}, [currentSlide.speakerNotes, visibleBullets, ...]);
```

**Key insight:** The display logic already handles the `👉`-delimited format. Verbosity changes only affect the AI-generated content in `speakerNotes`, not the display logic.

### AI Generation - Teleprompter Rules

**File:** `/services/geminiService.ts`
**Lines:** 7-26

```typescript
const TELEPROMPTER_RULES = `
STRICT SPEAKER NOTE RULES (TELEPROMPTER LOGIC):
The app uses a "Progressive Disclosure" system.
1. The visual bullet point appears.
2. The Student reads the bullet.
3. The Teacher (Teleprompter) adds insight.

Therefore:
- **NEVER** repeat the text that is on the slide in the speaker notes.
- **NEVER** re-summarize a point that was just made in the previous bullet.
- Each note must **ADD VALUE**: provide a concrete example, an analogy, or a "Why this matters" explanation.
- Ensure a continuous narrative flow. Note 2 must naturally follow Note 1.

FORMATTING:
The speaker notes must use "👉" as a delimiter.
- Segment 0 (Intro): Set the scene before bullet 1 appears.
- Segment 1 (for Bullet 1): Elaborate on Bullet 1.
- Segment 2 (for Bullet 2): Elaborate on Bullet 2 (Do not repeat Segment 1).
- The number of "👉" segments MUST be exactly (Number of Bullets + 1).
`;
```

**Key insight:** Current rules produce "Standard" verbosity. Need to create Concise and Detailed variants.

### Slide Type Definition

**File:** `/types.ts`
**Lines:** 3-15

```typescript
export interface Slide {
  id: string;
  title: string;
  content: string[]; // Bullet points
  speakerNotes: string;  // <-- Current single verbosity
  imagePrompt: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  layout?: 'split' | 'full-image' | 'center-text' | 'flowchart' | 'grid' | 'tile-overlap';
  theme?: 'default' | 'purple' | 'blue' | 'green' | 'warm';
  backgroundColor?: string;
  hasQuestionFlag?: boolean;
}
```

**For Phase 27 (no caching):** No type changes needed - verbosity regenerates on-demand.
**For Phase 28 (caching):** Add `speakerNotesCache?: { concise?: string; standard?: string; detailed?: string; }`

## Architecture Patterns

### Recommended State Management

```typescript
// In PresentationView.tsx - new state
type VerbosityLevel = 'concise' | 'standard' | 'detailed';

const [verbosityLevel, setVerbosityLevel] = useState<VerbosityLevel>('standard');
const [isRegenerating, setIsRegenerating] = useState(false);
```

**Why local state in PresentationView:**
- Verbosity is presentation-mode only (editing mode uses standard)
- Follows existing pattern (e.g., `showFullScript`, `isTargetedMode`)
- Phase 28 will elevate to slide state for caching; Phase 27 keeps it simple

### Recommended UI Structure

```tsx
{/* Verbosity Selector - below header, above content */}
<div className="flex justify-center gap-2 p-2 border-b border-slate-700">
    {(['concise', 'standard', 'detailed'] as const).map(level => (
        <button
            key={level}
            onClick={() => handleVerbosityChange(level)}
            disabled={isRegenerating}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${
                verbosityLevel === level
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
        >
            {level}
        </button>
    ))}
</div>
```

**Pattern matches:** Mode toggle (Manual/Targeted) at line 1253-1273

### Recommended Regeneration Flow

```typescript
const handleVerbosityChange = async (newLevel: VerbosityLevel) => {
    if (newLevel === verbosityLevel) return;
    if (newLevel === 'standard') {
        // Standard is already stored in speakerNotes - no regeneration needed
        setVerbosityLevel('standard');
        return;
    }

    setIsRegenerating(true);
    setVerbosityLevel(newLevel);

    try {
        const regenerated = await provider.regenerateTeleprompter(
            currentSlide,
            newLevel
        );
        // Update speakerNotes or display regenerated content
    } finally {
        setIsRegenerating(false);
    }
};
```

## Verbosity System Instructions

### Concise Mode

```typescript
const TELEPROMPTER_RULES_CONCISE = `
CONCISE SPEAKER NOTES (BULLET-POINT STYLE):
The teacher wants MINIMAL guidance - just key prompts to jog memory.

RULES:
- Output 2-3 short phrases per segment (not full sentences)
- Use comma-separated points, not prose
- Focus on: key term, quick example, one action
- NO transitions, NO elaborate explanations

FORMATTING:
Use "👉" as delimiter. Segments = Bullets + 1.
- Segment 0: One-liner setup (5-8 words)
- Segment N: 2-3 comma-separated prompts

EXAMPLE OUTPUT:
"Quick review of fractions 👉 denominator = parts total, numerator = parts we have 👉 example: 3/4 pizza, draw on board 👉 check: ask which is bigger, 1/2 or 1/4"
`;
```

### Standard Mode (Existing)

```typescript
const TELEPROMPTER_RULES_STANDARD = TELEPROMPTER_RULES; // Current behavior, unchanged
```

### Detailed Mode

```typescript
const TELEPROMPTER_RULES_DETAILED = `
DETAILED SPEAKER NOTES (SCRIPT STYLE):
The teacher wants a FULL SCRIPT they can read verbatim for confident delivery.

RULES:
- Write complete sentences in conversational tone
- Include transition phrases: "Now let's look at...", "As you can see...", "So what does this mean?"
- Add prompts for student interaction: "[PAUSE for questions]", "[Wait for responses]"
- Include teacher actions: "[Point to diagram]", "[Write on board]"
- Each segment should be 3-5 sentences

FORMATTING:
Use "👉" as delimiter. Segments = Bullets + 1.
- Segment 0: Full introduction with hook and preview
- Segment N: Complete teaching script with examples and checks

EXAMPLE OUTPUT:
"Alright everyone, today we're going to explore something really interesting - fractions! [PAUSE] Has anyone ever shared a pizza with friends? That's exactly what fractions help us understand. 👉 So when we look at this first point, the denominator - that's the number on the bottom - tells us how many equal parts we've divided something into. Think of it like cutting a cake into slices. If we cut it into 4 pieces, our denominator is 4. [Point to example on board] Does that make sense so far? 👉 ..."
`;
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Button styling | Custom CSS | Existing pattern from mode toggle | Consistency with UI |
| Loading indicator | Custom spinner | Existing `animate-pulse` + spinner pattern | Already used in `isGeneratingQuestion` |
| State management | Complex context | Local useState | Phase 27 scope is simple; Phase 28 adds caching |

## Common Pitfalls

### Pitfall 1: Over-Engineering State

**What goes wrong:** Creating complex context/reducer for verbosity when simple useState suffices
**Why it happens:** Anticipating Phase 28 caching requirements
**How to avoid:** Phase 27 explicitly excludes caching (VERB-09/10/11/12 are Phase 28). Keep state local.
**Warning signs:** Creating new context, modifying Slide type, touching save/load logic

### Pitfall 2: Modifying Standard Mode

**What goes wrong:** Changing the existing `TELEPROMPTER_RULES` behavior
**Why it happens:** Refactoring to support all three modes
**How to avoid:** Standard = existing behavior unchanged. Create new constants for Concise/Detailed.
**Warning signs:** VERB-06 requires "existing behavior, default" - any change breaks this

### Pitfall 3: Regenerating All Slides

**What goes wrong:** Regenerating teleprompter for all slides when verbosity changes
**Why it happens:** Not scoping regeneration to current slide
**How to avoid:** Only regenerate `currentSlide.speakerNotes` on-demand
**Warning signs:** API calls multiply, loading takes too long

### Pitfall 4: Forgetting Loading State UI

**What goes wrong:** User clicks verbosity, nothing visible happens during regeneration
**Why it happens:** Missing loading indicator
**How to avoid:** VERB-04 requires loading indicator. Follow `isGeneratingQuestion` pattern.
**Warning signs:** No visual feedback during API call

## Code Examples

### Verbosity Selector Component

```tsx
// Inline in PresentationView.tsx, positioned after header
{/* Verbosity Selector */}
<div className="flex justify-center items-center gap-2 p-2 border-b border-slate-700 bg-slate-800/30">
    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mr-2">Script Style</span>
    {(['concise', 'standard', 'detailed'] as const).map(level => (
        <button
            key={level}
            onClick={() => handleVerbosityChange(level)}
            disabled={isRegenerating || !isAIAvailable}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                verbosityLevel === level
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600'
            } ${(isRegenerating || !isAIAvailable) && verbosityLevel !== level ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {level}
        </button>
    ))}
    {isRegenerating && (
        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin ml-2" />
    )}
</div>
```

### AI Provider Interface Extension

```typescript
// In services/aiProvider.ts - add to AIProviderInterface
regenerateTeleprompter(
    slide: Slide,
    verbosity: 'concise' | 'standard' | 'detailed'
): Promise<string>;
```

### Regeneration Service Function

```typescript
// In services/geminiService.ts
export const regenerateTeleprompter = async (
    apiKey: string,
    slide: Slide,
    verbosity: 'concise' | 'standard' | 'detailed'
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const rules = verbosity === 'concise'
        ? TELEPROMPTER_RULES_CONCISE
        : verbosity === 'detailed'
        ? TELEPROMPTER_RULES_DETAILED
        : TELEPROMPTER_RULES; // standard

    const systemInstruction = `
You are regenerating teleprompter notes for an existing slide.
The slide has ${slide.content.length} bullet points.

${rules}
`;

    const prompt = `
Slide Title: ${slide.title}
Slide Content:
${slide.content.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Generate speaker notes in ${verbosity} style.
`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "text/plain"
        }
    });

    return response.text || "";
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single verbosity level | No change needed | N/A | Standard continues to work |
| No teleprompter customization | Adding 3-level toggle | v3.1 | Teacher control over script detail |

## Integration Points

### Files to Modify

1. **`/components/PresentationView.tsx`**
   - Add `VerbosityLevel` type and `verbosityLevel` state
   - Add `isRegenerating` state
   - Add verbosity selector UI after header
   - Add `handleVerbosityChange` handler
   - Conditionally display regenerated content or current script

2. **`/services/geminiService.ts`**
   - Add `TELEPROMPTER_RULES_CONCISE` constant
   - Add `TELEPROMPTER_RULES_DETAILED` constant
   - Add `regenerateTeleprompter` function

3. **`/services/aiProvider.ts`**
   - Add `regenerateTeleprompter` to `AIProviderInterface`

4. **`/services/providers/geminiProvider.ts`**
   - Implement `regenerateTeleprompter` method

5. **`/services/providers/claudeProvider.ts`**
   - Implement `regenerateTeleprompter` method

### Files NOT to Modify (Phase 27)

- `/types.ts` - No Slide type changes until Phase 28
- Save/load services - No persistence changes until Phase 28
- `/App.tsx` - No parent state needed; PresentationView is self-contained

## Open Questions

None - all requirements are well-defined and the existing codebase provides clear patterns to follow.

## Sources

### Primary (HIGH confidence)
- `/components/PresentationView.tsx` - Direct code analysis
- `/services/geminiService.ts` - Direct code analysis
- `/services/aiProvider.ts` - Direct code analysis
- `/types.ts` - Direct code analysis
- `/.planning/REQUIREMENTS.md` - Requirements VERB-01 through VERB-08
- `/.planning/ROADMAP.md` - Phase 27 scope definition

### Secondary (MEDIUM confidence)
- Existing UI patterns in PresentationView (mode toggle, question buttons)

## Metadata

**Confidence breakdown:**
- Teleprompter location: HIGH - Direct code analysis
- AI generation patterns: HIGH - Direct code analysis, well-documented
- UI patterns: HIGH - Multiple existing examples to follow
- Verbosity prompts: MEDIUM - Prompt engineering is iterative; examples are starting points

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (stable codebase, no expected breaking changes)
