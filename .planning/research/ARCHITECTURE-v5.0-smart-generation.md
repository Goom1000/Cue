# Architecture Patterns: Smart Generation Pipeline (v5.0)

**Domain:** Multi-pass AI slide generation with resource integration and lesson phase detection
**Researched:** 2026-02-14
**Confidence:** HIGH -- builds on proven patterns already in codebase

## Recommended Architecture

### Overview

The v5.0 architecture introduces a **Generation Pipeline** service layer between `App.tsx` and the AI providers. This pipeline orchestrates multi-pass generation while keeping the existing `AIProviderInterface` methods unchanged.

```
App.tsx (handleGenerate)
  |
  v
GenerationPipeline.execute()         <-- NEW orchestrator
  |
  |-- Pass 1: provider.generateLessonSlides()    [existing]
  |-- Pass 2: provider.analyzeGaps()             [existing]
  |-- Pass 3: provider.generateSlideFromGap() x N [existing]
  |-- Phase assignment (from detection results)
  |
  v
PipelineResult { slides, gaps, coverage, phases }
  |
  v
App.tsx (setSlides, show review UI)
```

### Key Design Principle: Orchestration, Not Modification

v5.0 does NOT change any existing AI provider methods. The pipeline calls them in sequence. This means:
- Zero risk to existing generation quality
- Each pass can be tested independently (already tested)
- Pipeline failures at any pass are recoverable (return partial results)

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `GenerationPipeline` | Orchestrates multi-pass flow, manages progress, merges results | AIProviderInterface, PhaseDetector |
| `PhaseDetector` | Regex-based lesson phase boundary detection from plan text | GenerationPipeline (called before Pass 1) |
| `PptxProcessor` | Extracts text + images from PPTX files via JSZip | UploadService (plugs into existing processor routing) |
| `ResourceContextBuilder` | Formats uploaded resource content for injection into prompts | GenerationPipeline (called before Pass 1) |
| Landing Page (INPUT state) | Supplementary resource upload UI | UploadService, App.tsx state |
| Editor (EDITING state) | Phase badges, coverage score, gap review panel | Slide data with lessonPhase field |

## Data Flow

### Multi-Pass Generation Flow

```
1. Teacher uploads lesson plan PDF + optional supplementary resources
2. Teacher clicks "Generate"
3. App.tsx calls generationPipeline.execute(config)

4. PIPELINE PASS 1: Generate
   a. PhaseDetector scans lesson plan text for phase boundaries
   b. ResourceContextBuilder formats supplementary resource content
   c. Builds enhanced GenerationInput with:
      - lessonText + lessonImages (existing)
      - supplementaryContext (new: formatted resource content)
      - detectedPhases (new: phase boundary info for prompt)
   d. Calls provider.generateLessonSlides(enhancedInput)
   e. Returns Slide[] with lessonPhase assigned per slide

5. PIPELINE PASS 2: Evaluate
   a. Calls provider.analyzeGaps(slides, lessonPlanText, lessonPlanImages, gradeLevel)
   b. Returns GapAnalysisResult { gaps[], coveragePercentage, summary }
   c. Filters gaps: only 'critical' and 'recommended' severity

6. PIPELINE PASS 3: Fill (per accepted gap)
   a. For each gap, calls provider.generateSlideFromGap(gap, slides, topic, verbosity)
   b. Inserts generated slide at gap.suggestedPosition
   c. Reports progress: "Filling gap 2/3..."

7. Pipeline returns PipelineResult to App.tsx
8. App.tsx shows slides in EDITING state with:
   - Phase badges on each slide
   - Coverage score badge
   - Gap suggestions panel (for 'nice-to-have' gaps not auto-filled)
```

### Resource Upload Flow

```
1. INPUT state: Teacher drags PDF/DOCX/PPTX/image into supplementary resources zone
2. uploadService.processUploadedFile(file) routes to appropriate processor
3. For PPTX: new pptxProcessor extracts text from XML + images from media/
4. For existing types: existing processors handle extraction
5. Extracted content stored in component state as ProcessedResource[]
6. On "Generate", ProcessedResource[] passed to pipeline
7. Pipeline formats resource content and injects into generation prompt
```

### Phase Detection Flow

```
1. PhaseDetector receives lesson plan text
2. Scans for phase marker patterns (regex):
   - Line-level: "I Do:", "We Do:", "You Do:", etc.
   - Section-level: "## Modelling", "### Independent Practice"
   - Implicit: Activity descriptions containing GRR keywords
3. Returns PhaseMap: { [charPosition]: LessonPhase }
4. Pipeline passes PhaseMap to generation prompt:
   "The lesson plan has these phases:
    - I Do starts at 'Teacher models...' (paragraph 3)
    - We Do starts at 'Students work together...' (paragraph 7)
    - You Do starts at 'Independent practice...' (paragraph 11)"
5. AI assigns lessonPhase to each generated slide based on this map
6. Fallback: If no phases detected, AI assigns phases based on pedagogical heuristics
```

## Patterns to Follow

### Pattern 1: Pipeline State Machine (mirrors EnhancementState)

**What:** Discriminated union for pipeline progress tracking.
**When:** Multi-step async operations that need UI feedback.
**Why:** The codebase already uses this exact pattern in `documentEnhancementService.ts`.

```typescript
export type PipelineState =
  | { status: 'idle' }
  | { status: 'generating'; progress: number }     // Pass 1
  | { status: 'analyzing'; progress: number }       // Pass 2
  | { status: 'filling'; current: number; total: number }  // Pass 3
  | { status: 'complete'; result: PipelineResult }
  | { status: 'error'; error: string; partialResult?: PipelineResult }
  | { status: 'cancelled' };
```

### Pattern 2: Partial Result Recovery

**What:** If a later pass fails, return whatever succeeded from earlier passes.
**When:** Any multi-step pipeline where earlier results have independent value.
**Why:** If gap analysis fails, the teacher still has their generated slides. If gap filling fails for one gap, other filled gaps are still valid.

```typescript
// In pipeline execute():
try {
  const slides = await pass1Generate(...);
  try {
    const gaps = await pass2Analyze(slides, ...);
    try {
      const filledSlides = await pass3Fill(slides, gaps, ...);
      return { slides: filledSlides, gaps, coverage: gaps.coveragePercentage };
    } catch {
      // Pass 3 failed: return slides + gap info without filled slides
      return { slides, gaps, coverage: gaps.coveragePercentage };
    }
  } catch {
    // Pass 2 failed: return slides only, no gap info
    return { slides, gaps: null, coverage: null };
  }
} catch {
  // Pass 1 failed: fatal, re-throw
  throw error;
}
```

### Pattern 3: Context Budget Management

**What:** Cap the amount of text injected from supplementary resources to stay within token limits.
**When:** Any feature that adds variable-length content to AI prompts.
**Why:** A 20-page PDF could produce 40K chars of extracted text, blowing past context windows.

```typescript
const MAX_RESOURCE_CHARS = 2000; // Per resource
const MAX_TOTAL_RESOURCE_CHARS = 6000; // All resources combined

function buildResourceContext(resources: ProcessedResource[]): string {
  let totalChars = 0;
  return resources.map(r => {
    const text = r.extractedText.slice(0, MAX_RESOURCE_CHARS);
    totalChars += text.length;
    if (totalChars > MAX_TOTAL_RESOURCE_CHARS) return ''; // Skip overflow
    return `Resource: "${r.filename}" (${r.type})\n${text}`;
  }).filter(Boolean).join('\n\n---\n\n');
}
```

### Pattern 4: Prompt Extension via Section Injection

**What:** Add new context sections to existing prompts without rewriting them.
**When:** Extending generation capabilities without breaking existing prompt structure.
**Why:** The existing system prompts are complex and tested. Rewriting them risks regressions.

```
// Existing prompt structure (preserved):
SYSTEM: You are an elite Primary Education Consultant...
USER: Transform this formal lesson plan...

// New sections appended AFTER existing content:
=== SUPPLEMENTARY RESOURCES ===
[resource context]

=== LESSON PHASE BOUNDARIES ===
[detected phases from PhaseDetector]

=== ADDITIONAL INSTRUCTIONS ===
- Tag each slide with lessonPhase from: hook, i-do, we-do, you-do, plenary
- Incorporate relevant resource content into appropriate slides
- Add "[See: ResourceName]" callout when referencing uploaded material
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Modifying Existing Provider Methods

**What:** Changing the signature or behavior of existing `AIProviderInterface` methods to support pipeline features.
**Why bad:** Breaks all 20+ existing callers. Forces simultaneous changes across Gemini and Claude providers. Violates open-closed principle.
**Instead:** Keep existing methods unchanged. Add new optional fields to `GenerationInput` that existing callers ignore.

### Anti-Pattern 2: Pipeline as App.tsx Logic

**What:** Putting the multi-pass orchestration directly in `App.tsx handleGenerate()`.
**Why bad:** `App.tsx` is already 2600+ lines. Adding pipeline logic would make it even harder to maintain. Also makes the pipeline untestable in isolation.
**Instead:** Create `services/generationPipeline.ts` as a standalone service. `handleGenerate()` delegates to it.

### Anti-Pattern 3: Synchronous Gap Slide Insertion

**What:** Inserting each gap slide into the array as it's generated, causing index shifts.
**Why bad:** Gap `suggestedPosition` values are calculated against the ORIGINAL deck. Inserting slide A at position 3 shifts all positions after 3, making slide B's `suggestedPosition: 5` now incorrect.
**Instead:** Collect all gap slides first, then insert them all at once using offset-adjusted positions. Sort gap inserts by position descending to avoid index shifting.

### Anti-Pattern 4: AI-Only Phase Detection

**What:** Using an AI call to detect lesson phases instead of regex.
**Why bad:** Adds ~3 seconds and API cost for something regex handles in 0ms. Phase labels are a finite, known vocabulary.
**Instead:** Use regex detection (like existing `contentPreservation/detector.ts`). Pass results TO the AI as context, not FROM the AI.

## New Type Definitions

```typescript
// types.ts additions
export type LessonPhase = 'hook' | 'i-do' | 'we-do' | 'we-do-together' | 'you-do' | 'plenary';

// Slide interface addition (non-breaking)
export interface Slide {
  // ... existing fields ...
  lessonPhase?: LessonPhase;
}

// services/generationPipeline.ts
export interface ProcessedResource {
  filename: string;
  type: 'pdf' | 'image' | 'docx' | 'pptx';
  extractedText: string;
  extractedImages?: string[];  // Base64, for multimodal prompts
  pageCount: number;
}

export interface PipelineConfig {
  provider: AIProviderInterface;
  lessonInput: GenerationInput;
  resources?: ProcessedResource[];
  enableAutoGapFilling: boolean;  // Default true
  gapSeverityThreshold: GapSeverity;  // Default 'recommended' (fills critical + recommended)
  onProgress: (state: PipelineState) => void;
  signal?: AbortSignal;  // For cancellation
}

export interface PipelineResult {
  slides: Slide[];                          // Final deck with gap slides inserted
  gapAnalysis: GapAnalysisResult | null;    // Null if Pass 2 failed
  filledGapCount: number;                    // How many gaps were auto-filled
  remainingGaps: IdentifiedGap[];           // Unfilled gaps (nice-to-have or failed)
  coveragePercentage: number | null;         // From gap analysis
  phaseDistribution: Record<LessonPhase, number>;  // Slide count per phase
}

// services/phaseDetection/phaseDetector.ts
export interface DetectedPhase {
  phase: LessonPhase;
  startPosition: number;  // Character offset in lesson plan text
  endPosition: number;
  keyword: string;        // The matched keyword (e.g., "I Do", "Guided Practice")
  confidence: 'high' | 'medium';  // High = exact match, Medium = equivalent term
}

export interface PhaseDetectionResult {
  phases: DetectedPhase[];
  hasExplicitPhases: boolean;  // True if lesson plan uses explicit GRR labels
}
```

## File Structure

```
services/
  generationPipeline.ts              # NEW: Multi-pass orchestrator
  documentProcessors/
    pdfProcessor.ts                  # EXISTING (unchanged)
    imageProcessor.ts                # EXISTING (unchanged)
    docxProcessor.ts                 # EXISTING (unchanged)
    pptxProcessor.ts                 # NEW: PPTX text/image extraction
  phaseDetection/
    phaseDetector.ts                 # NEW: Regex-based phase boundary detection
    phasePatterns.ts                 # NEW: Phase label dictionaries
  prompts/
    pipelinePrompts.ts              # NEW: Resource context + phase context builders
    gapAnalysisPrompts.ts           # MODIFY: Accept resource summaries
  aiProvider.ts                      # MODIFY: Extend GenerationInput
  uploadService.ts                   # MODIFY: Add PPTX type support

types.ts                             # MODIFY: Add LessonPhase, ProcessedResource

components/
  SupplementaryUpload.tsx           # NEW: Resource upload panel for INPUT state
  PhaseBadge.tsx                    # NEW: Phase label badge component
```

## Scalability Considerations

| Concern | Current (v4.x) | After v5.0 | At Scale |
|---------|-----------------|------------|----------|
| Generation time | ~10-15s (1 pass) | ~25-40s (3 passes) | Acceptable -- teacher expects "thinking" time. Progress UI prevents perceived hang. |
| API cost per generation | 1 API call | 3-5 API calls (generate + gaps + 1-3 fills) | ~3-5x cost increase. Acceptable for teacher tools (low volume per user). |
| Context window usage | ~12K chars | ~20K chars (with resources) | Well within Gemini 1M and Claude 200K limits |
| Memory (browser) | Slide[] in state | Slide[] + PipelineResult in state | Negligible increase. PipelineResult is <10KB. |
| File size (.cue) | ~50-200KB | +lessonPhase field per slide (~15 bytes each) | Negligible. |

## Sources

- Codebase architecture: `.planning/codebase/ARCHITECTURE.md`
- Enhancement pipeline pattern: `services/documentEnhancement/documentEnhancementService.ts`
- Gap analysis implementation: `services/prompts/gapAnalysisPrompts.ts`, `services/providers/geminiProvider.ts`
- Generation flow: `App.tsx` lines 530-617, `services/geminiService.ts` lines 251-350
- [Self-Refine paper](https://selfrefine.info/) -- Generate-evaluate-refine pipeline pattern
- Upload infrastructure: `services/uploadService.ts`, `services/documentProcessors/`
