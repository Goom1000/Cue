# Phase 68: Phase-Aware UI + Resource Injection - Research

**Researched:** 2026-02-15
**Domain:** React UI (phase badges, balance indicator, dropdown), prompt engineering (resource injection), multi-provider parity
**Confidence:** HIGH

## Summary

Phase 68 is the final phase of v5.0. It layers UI visibility and teacher interaction onto foundations built in Phases 65-67: the `LessonPhase` type and phase detection module (Phase 65), resource upload/capping infrastructure (Phase 66), and the multi-pass generation pipeline (Phase 67). The work divides cleanly into three domains:

1. **Phase-Aware UI** (PHASE-03, PHASE-04, PHASE-05): Color-coded badges on sidebar slide thumbnails, a phase balance indicator showing distribution, and a dropdown to override phase labels. All data already exists on `Slide.lessonPhase` -- this is purely UI/state work with zero AI involvement.

2. **Resource Injection into Generation** (RES-04, RES-06): Supplementary resources uploaded on the landing page must pre-populate ResourceHub (currently they are stored in app state but not passed to ResourceHub), and the AI must weave resource content into generated slides with callout references. This requires extending `GenerationInput` to carry resource text, modifying the prompt in both providers, and wiring the landing-page resources into ResourceHub on the editor screen.

3. **Provider Parity** (PROV-01, PROV-02): All new features must produce identical behavior on both Gemini and Claude. The existing codebase already follows a strict pattern where both providers receive the same system prompt text and user prompt structure -- resource injection must follow this same pattern.

**Primary recommendation:** Split into 3-4 plans: (1) Phase badges + balance indicator on sidebar, (2) Phase override dropdown, (3) Resource injection into generation pipeline + ResourceHub pre-population, (4) Provider parity verification. Plans 1-3 are independent and can proceed in parallel.

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Already in use; all components are React FC with hooks |
| TypeScript | 5.x | Type safety | All files are `.ts`/`.tsx` |
| Tailwind CSS (inline) | 3.x | Styling | All UI uses utility classes directly in JSX; no separate CSS files |
| @google/genai | latest | Gemini provider | Already in use for generation |
| Anthropic API (fetch) | Direct REST | Claude provider | Already in use; custom fetch wrapper |

### No New Dependencies Required

Phase 68 requires NO new libraries. Everything needed is already in the project:
- `LessonPhase` type and `PHASE_DISPLAY_LABELS` exist in `services/phaseDetection/phasePatterns.ts`
- `Slide.lessonPhase` field exists on the Slide interface
- `UploadedResource` type and `supplementaryResources` state exist in `App.tsx`
- `capResourceContent()` utility exists in `utils/resourceCapping.ts`
- Both provider implementations follow identical prompt structures

## Architecture Patterns

### Existing Codebase Patterns (MUST follow)

This codebase has strong, consistent patterns. Phase 68 must follow them exactly.

#### Pattern 1: Sidebar Slide Thumbnail Structure
**Location:** `App.tsx` lines 2762-2811
**What:** Each slide in the sidebar is a `<button>` with slide number badge, title, content preview, thumbnail bar, and question flag toggle.
**How to extend:** Phase badges should be added as a small colored pill next to the slide number or below the title text, following the same inline Tailwind pattern. The question flag toggle at `top-1 right-1` shows the pattern for interactive overlays on thumbnails.

```tsx
// Existing pattern for badges on sidebar thumbnails:
<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white">{idx + 1}</span>

// Phase badge follows same pattern:
<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${phaseColorMap[slide.lessonPhase]}`}>
  {PHASE_DISPLAY_LABELS[slide.lessonPhase]}
</span>
```

#### Pattern 2: Slide State Updates via onUpdate Callback
**Location:** `App.tsx` `handleUpdateSlide` function
**What:** All slide mutations use `onUpdate(slideId, { field: newValue })` which triggers `setSlides(curr => curr.map(...))`.
**For phase override:** Use the same pattern: `handleUpdateSlide(slide.id, { lessonPhase: newPhase })`.

#### Pattern 3: Provider Prompt Parallelism
**Location:** `services/geminiService.ts` lines 131-249, `services/providers/claudeProvider.ts` lines 401-686
**What:** Both providers have identical `getSystemInstructionForMode()` / `getSystemPromptForMode()` functions that build the same prompt text. Content is injected via `contents[]` (Gemini) or `contentParts[]` (Claude) arrays.
**For resource injection:** Add resource text to the user prompt (not system prompt) in both providers identically. Resource text should be appended after the lesson text with a clear section header.

#### Pattern 4: Pure Utility Functions for Computation
**Location:** `utils/resourceCapping.ts`, `utils/gapSlideInsertion.ts`
**What:** Computation logic lives in pure functions in `utils/`. No side effects, returns new data.
**For phase balance:** Create a pure function `computePhaseDistribution(slides: Slide[]): PhaseDistribution` in a utility file.

#### Pattern 5: Landing Page State -> Editor State Flow
**Location:** `App.tsx` lines 342, 2418 (supplementaryResources state)
**What:** State is set on the landing page and persisted across the app lifecycle. The `supplementaryResources` state already exists but is NOT passed to ResourceHub.
**For RES-06:** Pass `supplementaryResources` as a new prop to `ResourceHub` and merge them into its initial `uploadedResources` state.

### Recommended Project Structure

No new directories needed. New files fit existing structure:

```
utils/
  phaseDistribution.ts    # NEW: computePhaseDistribution() pure function
  resourceCapping.ts      # EXISTING: capResourceContent() - reuse as-is

services/
  phaseDetection/
    phasePatterns.ts       # EXISTING: PHASE_DISPLAY_LABELS, PHASE_COLORS (add color map)
    phaseDetector.ts       # EXISTING: no changes needed

components/
  App.tsx                  # MODIFY: wire phase badges, balance indicator, resource flow
  SlideCard.tsx            # MODIFY: possibly add phase badge to workspace header
  ResourceHub.tsx          # MODIFY: accept supplementaryResources prop, merge on mount

services/
  geminiService.ts         # MODIFY: append resource text to generation prompt
  providers/
    claudeProvider.ts      # MODIFY: append resource text to generation prompt (identical)
  aiProvider.ts            # MODIFY: add supplementaryResourceText to GenerationInput
  generationPipeline.ts    # MODIFY: pass resource text through to provider
```

### Anti-Patterns to Avoid
- **Do NOT add resource text to the system prompt.** System prompts define behavior rules; resource content is user data and belongs in the user message alongside the lesson text.
- **Do NOT create separate phase badge component files.** The sidebar thumbnails are inline JSX in App.tsx and are too simple to warrant extraction. Follow existing patterns.
- **Do NOT hand-roll a dropdown component.** Use a native `<select>` element styled with Tailwind, matching the existing layout dropdown pattern in SlideCard.tsx (line 94-104).
- **Do NOT mutate the supplementaryResources array.** ResourceHub should COPY the data into its local state on mount, not reference-share with App.tsx.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phase color mapping | Custom CSS logic | Static `Record<LessonPhase, string>` in phasePatterns.ts | 6 phases, 6 colors. A map is simpler than any logic |
| Phase balance calculation | Complex distribution algorithm | Simple `reduce()` over slides counting each phase | Array.reduce is the standard pattern for this |
| Dropdown UI | Custom dropdown component | Native `<select>` with Tailwind styling | Already used in SlideCard.tsx for layout selector |
| Resource text formatting | Custom templating | String concatenation with section headers | The prompt is just text; keep it simple |
| Content capping for prompts | New capping logic | Existing `capResourceContent()` from `utils/resourceCapping.ts` | Already built in Phase 66, tested, handles per-resource and total caps |

**Key insight:** This phase is primarily UI wiring and prompt text modification. All the complex infrastructure (phase detection, resource processing, generation pipeline, provider abstraction) was built in Phases 65-67.

## Common Pitfalls

### Pitfall 1: Forgetting to Re-run Phase Assignment After Manual Override
**What goes wrong:** Teacher clicks phase badge to override phase on slide 3. Later, pipeline re-generates or gap-fills, and `assignPhasesToSlides` overwrites the manual label.
**Why it happens:** `assignPhasesToSlides` only skips slides with existing `lessonPhase`, but after re-generation, new slides replace old ones and the override is lost.
**How to avoid:** The override should modify `Slide.lessonPhase` via `handleUpdateSlide`. Re-generation creates entirely new slides, so overrides are inherently lost (acceptable). For gap-filling, existing slides keep their phases because `assignPhasesToSlides` already respects existing `lessonPhase` values (line 216-218 of phaseDetector.ts).
**Warning signs:** If you see phase labels flickering or reverting during gap analysis.

### Pitfall 2: Resource Content Double-Injection
**What goes wrong:** Resource text gets injected into both the generation prompt AND the gap analysis prompt, causing token overflow or confused AI output.
**Why it happens:** The generation pipeline runs Pass 1 (generate), Pass 2 (gap analysis), Pass 3 (fill gaps). If resource text is added at the pipeline level rather than Pass 1 only, it bleeds into all passes.
**How to avoid:** Inject resource text into `GenerationInput` and handle it in Pass 1 (the `generateLessonSlides` call). The pipeline orchestrator should NOT add it to gap analysis -- gap analysis already has its own prompt structure.
**Warning signs:** Gap analysis results mentioning "case study" or resource titles when they shouldn't.

### Pitfall 3: ResourceHub State Collision on Mount
**What goes wrong:** ResourceHub's `useEffect` on mount restores `enhancedResourceStates` (existing behavior) AND now also needs to merge in `supplementaryResources`. The two sources may have overlapping resource IDs if the same file was uploaded both on landing page and in ResourceHub.
**Why it happens:** `supplementaryResources` are uploaded on the landing page BEFORE generation. `uploadedResources` in ResourceHub are uploaded AFTER generation. They are different arrays with different lifecycles.
**How to avoid:** On mount, if `supplementaryResources` prop is provided, pre-populate `uploadedResources` state with them. Deduplicate by resource ID. The existing `enhancedResourceStates` restore logic (lines 67-88 of ResourceHub.tsx) already handles the enhancement flow -- supplementary resources are a separate, additive source.
**Warning signs:** Duplicate resource thumbnails in ResourceHub sidebar.

### Pitfall 4: Phase Badge Colors Not Accessible
**What goes wrong:** Color-coded badges are meaningless to colorblind users (8% of males).
**Why it happens:** Relying on color alone for phase identification.
**How to avoid:** Always show the phase TEXT label alongside the color. The existing `PHASE_DISPLAY_LABELS` map provides short labels like "Hook", "I Do", etc. Combine color + text.
**Warning signs:** If you can't tell phases apart in grayscale, neither can some users.

### Pitfall 5: Prompt Token Overflow with Resources
**What goes wrong:** Adding 6000 chars of resource text to the generation prompt pushes total tokens past the model limit, causing generation failures.
**Why it happens:** The existing prompt already includes lesson text (potentially 10K+ chars), system instruction (~2K chars), and page images.
**How to avoid:** Use the existing `capResourceContent()` utility (PER_RESOURCE_CAP = 2000, TOTAL_RESOURCE_CAP = 6000). Add a clear section delimiter so the AI knows where lesson text ends and resource text begins. Total resource injection should be well within limits -- 6000 chars is roughly 1500 tokens.
**Warning signs:** Generation failures with "context length exceeded" errors only when resources are attached.

### Pitfall 6: Provider Parity Drift
**What goes wrong:** Resource injection works on Gemini but not Claude (or vice versa) because prompt formatting differs.
**Why it happens:** Modifying one provider's generation function and forgetting to mirror the change exactly in the other.
**How to avoid:** Extract the resource prompt section into a shared function (e.g., `buildResourceInjectionText(resources)`) that both providers call. The existing codebase already has the `getDetectionSource()` pattern shared between providers.
**Warning signs:** Running the same lesson + resources on both providers and getting callout references on one but not the other.

## Code Examples

### Phase Color Map (add to phasePatterns.ts)
```typescript
// Source: Existing PHASE_DISPLAY_LABELS pattern in phasePatterns.ts
export const PHASE_COLORS: Record<LessonPhase, { bg: string; text: string; darkBg: string; darkText: string }> = {
  'hook':            { bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-900/40', darkText: 'dark:text-emerald-400' },
  'i-do':            { bg: 'bg-blue-100',    text: 'text-blue-700',    darkBg: 'dark:bg-blue-900/40',    darkText: 'dark:text-blue-400' },
  'we-do':           { bg: 'bg-violet-100',  text: 'text-violet-700',  darkBg: 'dark:bg-violet-900/40',  darkText: 'dark:text-violet-400' },
  'we-do-together':  { bg: 'bg-purple-100',  text: 'text-purple-700',  darkBg: 'dark:bg-purple-900/40',  darkText: 'dark:text-purple-400' },
  'you-do':          { bg: 'bg-amber-100',   text: 'text-amber-700',   darkBg: 'dark:bg-amber-900/40',   darkText: 'dark:text-amber-400' },
  'plenary':         { bg: 'bg-rose-100',    text: 'text-rose-700',    darkBg: 'dark:bg-rose-900/40',    darkText: 'dark:text-rose-400' },
};
```

### Phase Badge in Sidebar Thumbnail
```tsx
// Source: Existing sidebar button pattern in App.tsx ~line 2790
{slide.lessonPhase && (
  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${PHASE_COLORS[slide.lessonPhase].bg} ${PHASE_COLORS[slide.lessonPhase].text} ${PHASE_COLORS[slide.lessonPhase].darkBg} ${PHASE_COLORS[slide.lessonPhase].darkText}`}>
    {PHASE_DISPLAY_LABELS[slide.lessonPhase]}
  </span>
)}
```

### Phase Override Dropdown
```tsx
// Source: Existing layout selector pattern in SlideCard.tsx ~line 94
<select
  value={slide.lessonPhase || ''}
  onChange={(e) => onUpdate(slide.id, { lessonPhase: (e.target.value || undefined) as LessonPhase | undefined })}
  className="text-[9px] font-bold uppercase tracking-widest bg-white dark:bg-slate-900 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-amber-500/50 focus:outline-none"
  onClick={(e) => e.stopPropagation()}
>
  <option value="">No Phase</option>
  {Object.entries(PHASE_DISPLAY_LABELS).map(([key, label]) => (
    <option key={key} value={key}>{label}</option>
  ))}
</select>
```

### Phase Distribution Utility
```typescript
// Source: Pattern from gapSlideInsertion.ts (pure utility function)
import { LessonPhase, Slide } from '../types';

export interface PhaseDistribution {
  counts: Record<LessonPhase, number>;
  percentages: Record<LessonPhase, number>;
  total: number;
  missingPhases: LessonPhase[];
  unassigned: number;
}

const ALL_PHASES: LessonPhase[] = ['hook', 'i-do', 'we-do', 'we-do-together', 'you-do', 'plenary'];

export function computePhaseDistribution(slides: Slide[]): PhaseDistribution {
  const counts = {} as Record<LessonPhase, number>;
  ALL_PHASES.forEach(p => counts[p] = 0);
  let unassigned = 0;

  for (const slide of slides) {
    if (slide.lessonPhase) {
      counts[slide.lessonPhase]++;
    } else {
      unassigned++;
    }
  }

  const total = slides.length;
  const percentages = {} as Record<LessonPhase, number>;
  ALL_PHASES.forEach(p => {
    percentages[p] = total > 0 ? Math.round((counts[p] / total) * 100) : 0;
  });

  const missingPhases = ALL_PHASES.filter(p => counts[p] === 0);

  return { counts, percentages, total, missingPhases, unassigned };
}
```

### Resource Injection Prompt Text
```typescript
// Source: Pattern from capResourceContent in utils/resourceCapping.ts
import { capResourceContent } from '../utils/resourceCapping';
import { UploadedResource } from '../types';

export function buildResourceInjectionText(resources: UploadedResource[]): string {
  if (!resources || resources.length === 0) return '';

  const capped = capResourceContent(resources);
  if (capped.size === 0) return '';

  let text = '\n\n---\nSUPPLEMENTARY RESOURCES (weave into relevant slides with callout references like "[See: Resource Title]"):\n\n';

  for (const resource of resources) {
    const cappedText = capped.get(resource.id);
    if (cappedText) {
      text += `### ${resource.filename}\n${cappedText}\n\n`;
    }
  }

  return text;
}
```

### GenerationInput Extension
```typescript
// Source: Existing GenerationInput in services/aiProvider.ts
export interface GenerationInput {
  lessonText: string;
  lessonImages?: string[];
  presentationText?: string;
  presentationImages?: string[];
  mode: GenerationMode;
  verbosity?: VerbosityLevel;
  gradeLevel?: string;
  supplementaryResourceText?: string;  // NEW: capped resource text for injection
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No phase labels | `Slide.lessonPhase` field exists, populated by pipeline | Phase 65 (v5.0) | Phase data is AVAILABLE but not VISIBLE in UI |
| Resources uploaded in ResourceHub only | Landing page supplementary upload + ResourceHub upload | Phase 66 (v5.0) | Two upload locations, but landing-page resources are NOT passed to ResourceHub |
| Single-pass generation | Three-pass pipeline (generate/analyze/fill) | Phase 67 (v5.0) | Resource injection hooks into Pass 1 of the pipeline |

**Current state of landing-page resources:**
- `supplementaryResources` state exists in App.tsx (line 342)
- Stored in .cue files (v5 format, line 500 of types.ts)
- Uploaded via UploadPanel on landing page (line 2417-2426 of App.tsx)
- NOT passed to generation pipeline (GenerationInput lacks resource field)
- NOT passed to ResourceHub component (ResourceHub doesn't receive them as prop)

**Current state of phase badges:**
- `Slide.lessonPhase?: LessonPhase` field exists (types.ts line 41)
- Phase detection runs in pipeline and assigns phases (generationPipeline.ts line 313-314)
- `PHASE_DISPLAY_LABELS` map exists (phasePatterns.ts line 140-147)
- NO visual representation in the editor UI whatsoever

## Open Questions

1. **Phase badge click behavior -- badge vs. separate dropdown?**
   - What we know: Requirement says "click the badge to override via dropdown". This could mean (a) clicking the badge itself opens an inline dropdown, or (b) clicking shows a native `<select>`.
   - What's unclear: Whether teachers expect the badge itself to be interactive (tap to cycle) or to open a full dropdown.
   - Recommendation: Use a `<select>` element styled to LOOK like a badge (colored background matching the phase). This is simplest and matches the existing layout dropdown pattern in SlideCard.tsx. The select element IS the badge.

2. **Balance indicator placement -- toolbar area or sidebar header?**
   - What we know: There's an editor toolbar area (above the workspace) that already shows "Check for Gaps" and "Condense Deck" buttons. The sidebar has a "Lesson Flow" header.
   - What's unclear: Where the balance indicator best fits without cluttering the UI.
   - Recommendation: Place it in the sidebar, between the "Lesson Flow" header and the slide thumbnails. It's a small horizontal bar chart or set of colored segments showing distribution. This keeps it visible without consuming toolbar space.

3. **Callout reference format for resource injection**
   - What we know: Requirement says `[See: Case Study]` format.
   - What's unclear: Whether the callout should appear in slide content bullets, speaker notes, or both.
   - Recommendation: Instruct the AI to place callout references in slide content bullets (visible to students on screen) where the resource is most relevant. Speaker notes can reference the resource more naturally in prose.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** - types.ts, phaseDetector.ts, phasePatterns.ts, resourceCapping.ts, generationPipeline.ts, App.tsx, SlideCard.tsx, ResourceHub.tsx, geminiService.ts, claudeProvider.ts
- All findings verified by direct code reading of the actual files in the repository

### Secondary (MEDIUM confidence)
- Pattern extrapolation from Phase 65-67 planning docs and implementation patterns

### Tertiary (LOW confidence)
- None. All findings based on direct code inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing libraries verified by reading package.json and imports
- Architecture: HIGH - all patterns extracted from actual codebase files, not hypothesized
- Pitfalls: HIGH - identified from concrete code paths (e.g., assignPhasesToSlides never-overwrite logic, pipeline pass structure, ResourceHub mount behavior)
- UI patterns: HIGH - extracted from existing sidebar thumbnail code and SlideCard dropdown

**Research date:** 2026-02-15
**Valid until:** Indefinite (codebase-specific research, not dependent on external library updates)
