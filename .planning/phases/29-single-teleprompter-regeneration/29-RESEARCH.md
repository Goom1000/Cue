# Phase 29: Single Teleprompter Regeneration - Research

**Researched:** 2026-01-25
**Domain:** Teleprompter script regeneration, per-slide AI generation, verbosity caching
**Confidence:** HIGH

## Summary

Phase 29 adds a "Regenerate Script" button to the teleprompter panel that allows teachers to regenerate the speaker notes for a single slide after manually editing its content. This extends the v3.1 verbosity system by exposing an explicit regeneration trigger (distinct from switching verbosity levels) with enhanced context awareness using surrounding slides.

The implementation is straightforward because:
1. The `regenerateTeleprompter()` method already exists in both AI providers (added in Phase 27)
2. The verbosity caching system (Phase 28) already handles cache updates via `onUpdateSlide`
3. The teleprompter panel UI (lines 1296-1316 in PresentationView.tsx) has an established pattern for verbosity controls that the regenerate button can follow
4. Cache invalidation logic already exists in `handleUpdateSlide` (App.tsx lines 317-336)

**Primary recommendation:** Add a "Regen" button to the verbosity selector row in the teleprompter panel. On click, call the existing `provider.regenerateTeleprompter()` method with current slide and verbosity level, but extend the method signature to accept surrounding slides (prev/next) for context coherence (REGEN-03). Update the cache at the current verbosity level only.

## Existing Architecture Analysis

### Current Verbosity Handling

**File:** `/components/PresentationView.tsx`
**Lines:** 902-952

```typescript
const handleVerbosityChange = async (newLevel: VerbosityLevel) => {
    if (newLevel === verbosityLevel) return;
    setVerbosityLevel(newLevel);

    // Standard uses speakerNotes directly - no cache needed
    if (newLevel === 'standard') {
        setRegeneratedScript(null);
        return;
    }

    // Check cache for instant switch
    const cached = currentSlide.verbosityCache?.[newLevel];
    if (cached) {
        setRegeneratedScript(cached);
        return;  // Instant switch from cache
    }

    // No cache - need to regenerate
    setIsRegenerating(true);
    try {
        const newScript = await provider.regenerateTeleprompter(currentSlide, newLevel);
        setRegeneratedScript(newScript);
        // Persist to slide cache
        onUpdateSlide(currentSlide.id, {
            verbosityCache: {
                ...currentSlide.verbosityCache,
                [newLevel]: newScript,
            },
        });
    } catch (error) {
        // ... error handling
    } finally {
        setIsRegenerating(false);
    }
};
```

**Key insight:** The verbosity change handler ONLY regenerates when cache is missing. For REGEN-01, we need a NEW function that ALWAYS regenerates (ignoring cache) to handle post-edit scenarios.

### Current regenerateTeleprompter Signature

**File:** `/services/aiProvider.ts`
**Lines:** 206-210

```typescript
regenerateTeleprompter(
    slide: Slide,
    verbosity: VerbosityLevel
): Promise<string>;
```

**File:** `/services/geminiService.ts`
**Lines:** 861-907

```typescript
export const regenerateTeleprompter = async (
    apiKey: string,
    slide: Slide,
    verbosity: VerbosityLevel
): Promise<string> => {
    // ... only uses single slide content
    const prompt = `
Slide Title: ${slide.title}
Slide Content:
${slide.content.map((b, i) => `${i + 1}. ${b}`).join('\n')}
`;
```

**Gap for REGEN-03:** Current implementation lacks surrounding slide context. Regeneration produces generic scripts that may not flow coherently with previous/next slides. Need to extend signature and prompt.

### Verbosity Selector UI Location

**File:** `/components/PresentationView.tsx`
**Lines:** 1296-1316

```typescript
{/* Verbosity Selector */}
<div className="flex justify-center items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-800/30">
    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mr-2">Script Style</span>
    {(['concise', 'standard', 'detailed'] as const).map(level => (
        <button
            key={level}
            onClick={() => handleVerbosityChange(level)}
            disabled={isRegenerating || (!isAIAvailable && level !== 'standard')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg ...`}
        >
            {level}
        </button>
    ))}
    {isRegenerating && (
        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin ml-2" />
    )}
</div>
```

**Regenerate button position:** Add after the verbosity buttons, before the spinner. Use similar styling but with distinct color (slate/neutral) to differentiate from verbosity selection.

### Cache Invalidation in handleUpdateSlide

**File:** `/App.tsx`
**Lines:** 317-336

```typescript
const handleUpdateSlide = useCallback((id: string, updates: Partial<Slide>) => {
    setSlides(prev => prev.map(s => {
        if (s.id !== id) return s;

        // Detect if content changed (invalidates verbosity cache)
        const contentChanged = updates.content !== undefined || updates.title !== undefined;

        // Special case: if only updating verbosityCache, preserve it
        const isOnlyCacheUpdate = Object.keys(updates).length === 1 && updates.verbosityCache !== undefined;

        return {
            ...s,
            ...updates,
            verbosityCache: contentChanged && !isOnlyCacheUpdate
                ? undefined
                : (updates.verbosityCache ?? s.verbosityCache),
        };
    }));
}, []);
```

**Key insight:** When teacher edits slide content (title/bullets), the verbosity cache is ALREADY auto-cleared. The regenerate button handles the case where teacher wants to regenerate AFTER manual edits with the current content.

## Architecture Patterns

### Recommended Regenerate Handler

```typescript
// In PresentationView.tsx - new function, separate from handleVerbosityChange

const handleRegenerateScript = async () => {
    if (!provider) {
        onRequestAI('regenerate teleprompter script');
        return;
    }

    setIsRegenerating(true);

    try {
        // Get surrounding slides for context (REGEN-03)
        const prevSlide = currentIndex > 0 ? slides[currentIndex - 1] : undefined;
        const nextSlide = currentIndex < slides.length - 1 ? slides[currentIndex + 1] : undefined;

        // Always regenerate, ignoring cache
        const newScript = await provider.regenerateTeleprompter(
            currentSlide,
            verbosityLevel,
            prevSlide,  // NEW: context for coherence
            nextSlide   // NEW: context for coherence
        );

        setRegeneratedScript(verbosityLevel === 'standard' ? null : newScript);

        // Update slide data - different behavior based on verbosity level
        if (verbosityLevel === 'standard') {
            // Standard regeneration updates speakerNotes directly, clears all cache
            onUpdateSlide(currentSlide.id, {
                speakerNotes: newScript,
                verbosityCache: undefined,  // Clear all cached versions
            });
        } else {
            // Non-standard regeneration updates cache only
            onUpdateSlide(currentSlide.id, {
                verbosityCache: {
                    ...currentSlide.verbosityCache,
                    [verbosityLevel]: newScript,
                },
            });
        }
    } catch (error) {
        console.error('Failed to regenerate teleprompter:', error);
        if (error instanceof AIProviderError) {
            onError('Regeneration Failed', error.userMessage);
        } else {
            onError('Error', 'Could not regenerate script. Please try again.');
        }
    } finally {
        setIsRegenerating(false);
    }
};
```

### Extended regenerateTeleprompter Signature

**New interface in `/services/aiProvider.ts`:**

```typescript
regenerateTeleprompter(
    slide: Slide,
    verbosity: VerbosityLevel,
    prevSlide?: Slide,   // NEW: for context coherence
    nextSlide?: Slide    // NEW: for context coherence
): Promise<string>;
```

**Updated prompt in `/services/geminiService.ts`:**

```typescript
export const regenerateTeleprompter = async (
    apiKey: string,
    slide: Slide,
    verbosity: VerbosityLevel,
    prevSlide?: Slide,
    nextSlide?: Slide
): Promise<string> => {
    // ... rules selection unchanged

    const contextSection = prevSlide || nextSlide ? `
CONTEXT FOR COHERENT FLOW:
${prevSlide ? `- Previous slide: "${prevSlide.title}" covered: ${prevSlide.content.slice(0, 2).join('; ')}` : '- This is the first slide.'}
${nextSlide ? `- Next slide: "${nextSlide.title}" will cover: ${nextSlide.content.slice(0, 2).join('; ')}` : '- This is the last slide.'}
Ensure your script transitions naturally from what came before and sets up what comes next.
` : '';

    const systemInstruction = `
You are regenerating teleprompter notes for an existing slide.
The slide has ${slide.content.length} bullet points.

${rules}

${contextSection}

CRITICAL: Output ONLY the speaker notes text. No JSON, no markdown code blocks, no explanations.
`;
    // ... rest unchanged
};
```

### Recommended UI Button

```typescript
{/* Regenerate Button - add after verbosity buttons */}
<button
    onClick={handleRegenerateScript}
    disabled={isRegenerating || !isAIAvailable}
    className={`ml-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
        isRegenerating || !isAIAvailable
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
    }`}
    title={!isAIAvailable ? 'Add API key in Settings to enable' : 'Regenerate script for this slide'}
>
    Regen
</button>
```

**Alternative icon-based design:**

```typescript
<button
    onClick={handleRegenerateScript}
    disabled={isRegenerating || !isAIAvailable}
    className={`ml-2 p-1.5 rounded-lg transition-all ${
        isRegenerating || !isAIAvailable
            ? 'text-slate-500 cursor-not-allowed'
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
    }`}
    title="Regenerate script"
>
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
</button>
```

## Standard Stack

The established libraries/tools for this phase:

### Core (No Changes)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | UI framework | Existing stack |
| @google/genai | ^1.30.0 | Gemini AI SDK | Existing provider |
| TypeScript | ~5.8.2 | Type checking | Existing stack |

### Supporting (No Changes)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| AIProviderInterface | existing | Provider abstraction | Method extension only |
| VerbosityLevel type | existing | Type for concise/standard/detailed | Reuse |
| useCallback/useState | React | State management | Existing patterns |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Button in panel | SlideCard edit button | Panel is visible during presentation (better UX) |
| Always clear cache | Selective cache clear | Clearing all is simpler; teachers rarely need to preserve non-current verbosity |

**Installation:** No new dependencies required.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI provider abstraction | Direct Gemini/Claude calls | Existing `AIProviderInterface` | Already handles both providers |
| Cache management | Custom cache layer | Existing `verbosityCache` + `handleUpdateSlide` | Already integrated with auto-save |
| Loading state UI | Custom spinner | Existing `isRegenerating` + spinner pattern | Lines 1313-1315 already use this |
| Error handling | Generic try/catch | Existing `AIProviderError` + `onError` prop | Consistent with verbosity handler |

**Key insight:** Phase 29 is primarily a UI wire-up. All the backend capability exists; we're just exposing it with a button and adding context parameters.

## Common Pitfalls

### Pitfall 1: Confusing Regenerate with Verbosity Switch

**What goes wrong:** Clicking "Regen" while at Standard overwrites speakerNotes; clicking while at Concise/Detailed only updates cache
**Why it happens:** Two different behaviors for one button
**How to avoid:** Document clearly; consider showing confirmation for Standard regeneration ("This will overwrite the original script")
**Warning signs:** Teachers losing their original speaker notes unexpectedly

### Pitfall 2: Not Passing Surrounding Slides

**What goes wrong:** Regenerated script doesn't flow with lesson narrative
**Why it happens:** Using existing single-slide regenerate method without extending it
**How to avoid:** Extend method signature to accept prevSlide/nextSlide (REGEN-03)
**Warning signs:** Regenerated intro says "Let's start by..." on slide 8

### Pitfall 3: Cache Not Cleared on Standard Regeneration

**What goes wrong:** Switching to Concise after Standard regeneration shows stale content
**Why it happens:** Only updating speakerNotes, not clearing verbosityCache
**How to avoid:** When regenerating at Standard, set `verbosityCache: undefined` in update
**Warning signs:** Old Concise/Detailed versions appear after content changed

### Pitfall 4: Regenerating with Empty Content

**What goes wrong:** AI generates placeholder text for slides with no bullets
**Why it happens:** Teacher clears content before regenerating
**How to avoid:** Disable Regen button if `currentSlide.content.length === 0`
**Warning signs:** "Add bullet points to generate a script"

### Pitfall 5: isRegenerating State Shared with Verbosity Switch

**What goes wrong:** Changing verbosity while regenerating causes race condition
**Why it happens:** Both operations use same `isRegenerating` state
**How to avoid:** Same state is actually correct (buttons should disable together); ensure both handlers check state before proceeding
**Warning signs:** Multiple concurrent regenerations

## Code Examples

Verified patterns from existing codebase:

### Regenerate Handler (Complete)

```typescript
// In PresentationView.tsx - add after handleVerbosityChange

const handleRegenerateScript = async () => {
    if (!provider) {
        onRequestAI('regenerate teleprompter script');
        return;
    }

    // Prevent regeneration on empty slides
    if (currentSlide.content.length === 0) {
        onError('Cannot Regenerate', 'Add bullet points to the slide before regenerating.');
        return;
    }

    setIsRegenerating(true);

    try {
        // Context for coherence (REGEN-03)
        const prevSlide = currentIndex > 0 ? slides[currentIndex - 1] : undefined;
        const nextSlide = currentIndex < slides.length - 1 ? slides[currentIndex + 1] : undefined;

        const newScript = await provider.regenerateTeleprompter(
            currentSlide,
            verbosityLevel,
            prevSlide,
            nextSlide
        );

        // Update display state
        if (verbosityLevel === 'standard') {
            setRegeneratedScript(null);  // Standard uses speakerNotes directly
        } else {
            setRegeneratedScript(newScript);
        }

        // Update slide data
        if (verbosityLevel === 'standard') {
            // Standard: update speakerNotes, clear cache (content effectively changed)
            onUpdateSlide(currentSlide.id, {
                speakerNotes: newScript,
                verbosityCache: undefined,
            });
        } else {
            // Concise/Detailed: update cache only
            onUpdateSlide(currentSlide.id, {
                verbosityCache: {
                    ...currentSlide.verbosityCache,
                    [verbosityLevel]: newScript,
                },
            });
        }
    } catch (error) {
        console.error('Failed to regenerate teleprompter:', error);
        if (error instanceof AIProviderError) {
            onError('Regeneration Failed', error.userMessage);
        } else {
            onError('Error', 'Could not regenerate script. Please try again.');
        }
    } finally {
        setIsRegenerating(false);
    }
};
```

### Extended Service Function

```typescript
// In services/geminiService.ts - replace existing regenerateTeleprompter

export const regenerateTeleprompter = async (
    apiKey: string,
    slide: Slide,
    verbosity: VerbosityLevel,
    prevSlide?: Slide,
    nextSlide?: Slide
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const rules = verbosity === 'concise'
        ? TELEPROMPTER_RULES_CONCISE
        : verbosity === 'detailed'
        ? TELEPROMPTER_RULES_DETAILED
        : TELEPROMPTER_RULES;

    // Build context section for surrounding slides
    const contextLines: string[] = [];
    if (prevSlide) {
        contextLines.push(`- Previous slide: "${prevSlide.title}" covered: ${prevSlide.content.slice(0, 2).join('; ')}`);
    } else {
        contextLines.push('- This is the first slide in the presentation.');
    }
    if (nextSlide) {
        contextLines.push(`- Next slide: "${nextSlide.title}" will cover: ${nextSlide.content.slice(0, 2).join('; ')}`);
    } else {
        contextLines.push('- This is the last slide in the presentation.');
    }

    const contextSection = `
CONTEXT FOR COHERENT FLOW:
${contextLines.join('\n')}
Ensure your script transitions naturally from what came before and sets up what comes next.
`;

    const systemInstruction = `
You are regenerating teleprompter notes for an existing slide.
The slide has ${slide.content.length} bullet points.

${rules}

${contextSection}

CRITICAL: Output ONLY the speaker notes text. No JSON, no markdown code blocks, no explanations.
`;

    const prompt = `
Slide Title: ${slide.title}
Slide Content:
${slide.content.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Generate speaker notes in ${verbosity} style.
`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "text/plain"
            }
        });

        return response.text?.trim() || "";
    } catch (error) {
        console.error("Teleprompter Regeneration Error:", error);
        throw new AIProviderError(USER_ERROR_MESSAGES.NETWORK_ERROR, 'NETWORK_ERROR', error);
    }
};
```

### UI Button Integration

```typescript
// In PresentationView.tsx - modify verbosity selector section (lines 1296-1316)

{/* Verbosity Selector with Regenerate Button */}
<div className="flex justify-center items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-800/30">
    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mr-2">Script Style</span>
    {(['concise', 'standard', 'detailed'] as const).map(level => (
        <button
            key={level}
            onClick={() => handleVerbosityChange(level)}
            disabled={isRegenerating || (!isAIAvailable && level !== 'standard')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                verbosityLevel === level
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600'
            } ${(isRegenerating || (!isAIAvailable && level !== 'standard')) && verbosityLevel !== level ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {level}
        </button>
    ))}

    {/* Divider */}
    <div className="w-px h-5 bg-slate-600 mx-1" />

    {/* Regenerate Button */}
    <button
        onClick={handleRegenerateScript}
        disabled={isRegenerating || !isAIAvailable || currentSlide.content.length === 0}
        className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${
            isRegenerating || !isAIAvailable || currentSlide.content.length === 0
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 text-slate-300 hover:bg-amber-600 hover:text-white'
        }`}
        title={!isAIAvailable ? 'Add API key in Settings' : currentSlide.content.length === 0 ? 'Add slide content first' : 'Regenerate script for this slide'}
    >
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
        Regen
    </button>

    {isRegenerating && (
        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin ml-2" />
    )}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No single-slide regeneration | "Regenerate All" only | Pre-v3.2 | Teachers lose manual edits on all slides |
| No context awareness | Single slide prompt | v3.1 | Scripts may not flow with lesson |
| Verbosity-only regeneration | Explicit regenerate button | v3.2 | Teachers control when to refresh script |

**Deprecated/outdated:**
- None - this is a new feature extending existing capability

## Integration Points

### Files to Modify

1. **`/services/aiProvider.ts`**
   - Extend `regenerateTeleprompter` signature to include `prevSlide?: Slide, nextSlide?: Slide`
   - Update interface documentation

2. **`/services/geminiService.ts`**
   - Extend `regenerateTeleprompter` function to accept and use surrounding slides
   - Add context section to system instruction

3. **`/services/providers/geminiProvider.ts`**
   - Update method signature to pass through new parameters

4. **`/services/providers/claudeProvider.ts`**
   - Update method signature and implementation to use surrounding slides

5. **`/components/PresentationView.tsx`**
   - Add `handleRegenerateScript` function
   - Add regenerate button UI to verbosity selector section
   - Add `slides` to props if not already accessible (it is - passed as prop)

### Files NOT to Modify

- `/types.ts` - Slide interface unchanged (verbosityCache already exists)
- `/App.tsx` - handleUpdateSlide already handles cache correctly
- `/services/loadService.ts` - No file format changes
- `/hooks/useAutoSave.ts` - Auto-save already handles slide updates

### Wire-Up Summary

| Component | Connects To | Via | Pattern |
|-----------|-------------|-----|---------|
| Regen button | handleRegenerateScript | onClick | Direct handler call |
| handleRegenerateScript | provider.regenerateTeleprompter | async call | Existing provider pattern |
| handleRegenerateScript | onUpdateSlide | callback prop | Existing update pattern |
| onUpdateSlide | slides state | setSlides | Existing App.tsx pattern |

## Open Questions

**Resolved during research:**

1. **Should Standard regeneration update speakerNotes or cache?**
   - Resolution: Update speakerNotes directly AND clear cache (Standard IS speakerNotes)

2. **Should regeneration use surrounding slides?**
   - Resolution: Yes (REGEN-03 requires context coherence)

3. **Where to place the button?**
   - Resolution: In verbosity selector row, after buttons, with divider

**Minor implementation decisions (Claude's discretion):**

1. **Button label:** "Regen" vs "Refresh" vs icon-only
   - Recommendation: "Regen" with refresh icon (matches existing UI density)

2. **Confirmation dialog for Standard regeneration:**
   - Recommendation: No dialog; the action is reversible (teacher can re-edit content and regenerate again)

3. **Should regenerating at Standard also regenerate Concise/Detailed?**
   - Recommendation: No; only regenerate current level (faster, simpler). Research SUMMARY.md suggests extending to all three post-MVP if teachers request it.

## Sources

### Primary (HIGH confidence)

- `/components/PresentationView.tsx` - Direct code analysis of verbosity UI (lines 1296-1316), handleVerbosityChange (lines 902-952)
- `/services/geminiService.ts` - Direct code analysis of regenerateTeleprompter (lines 861-907)
- `/services/aiProvider.ts` - Direct code analysis of AIProviderInterface (lines 206-210)
- `/App.tsx` - Direct code analysis of handleUpdateSlide cache invalidation (lines 317-336)
- `/.planning/phases/28-caching-backward-compatibility/28-RESEARCH.md` - Phase 28 caching patterns
- `/.planning/phases/27-verbosity-ui-generation/27-RESEARCH.md` - Phase 27 verbosity implementation

### Secondary (MEDIUM confidence)

- `/.planning/research/ARCHITECTURE.md` - Single regeneration architecture patterns (lines 457-650)
- `/.planning/research/FEATURES-v3.2-pedagogical-slides.md` - Feature requirements (lines 91-114)
- `/.planning/research/SUMMARY.md` - Stack recommendations and pitfalls

### Tertiary (LOW confidence)

- None - all patterns verified in codebase

## Metadata

**Confidence breakdown:**
- UI button placement: HIGH - Existing verbosity selector provides clear template
- Handler implementation: HIGH - Follows handleVerbosityChange pattern exactly
- Service extension: HIGH - Adding optional parameters is backward compatible
- Cache behavior: HIGH - Existing handleUpdateSlide handles this correctly

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (stable codebase, additive changes only)
