# Architecture Patterns: v5.0 Smart Generation Pipeline

**Domain:** Multi-pass AI generation with auto gap analysis, resource integration, and lesson phase detection
**Researched:** 2026-02-14
**Overall confidence:** HIGH (existing codebase patterns well-understood; AI pipeline patterns verified)

## Recommended Architecture

### Current Flow (v4.x)

```
LandingPage upload PDF
    -> parsePdf extracts text/images
    -> provider.generateLessonSlides(GenerationInput)
    -> slides stored in App.tsx state
    -> [optional] provider.regenerateTeleprompter() per slide (if non-standard verbosity)
    -> PresentationView renders

Gap analysis is SEPARATE:
    Editor -> DeckTools button -> upload SECOND PDF -> provider.analyzeGaps()
    -> GapAnalysisPanel shows gaps -> user clicks "Add Slide" per gap
    -> provider.generateSlideFromGap() -> inserted one at a time

Resource enhancement is SEPARATE:
    Editor -> ResourceHub panel -> UploadPanel -> processUploadedFile()
    -> provider.analyzeDocument() -> provider.enhanceDocument() -> export as PDF
```

### Proposed Flow (v5.0)

The core insight: collapse the current three-step manual workflow (generate -> separately analyze gaps -> separately upload resources) into a single orchestrated pipeline that runs automatically after generation.

```
LandingPage
  |-- Upload lesson plan PDF (existing)
  |-- Upload resource files (NEW: alongside lesson plan, not in ResourceHub)
  |-- Click "Generate"
  |
  v
GenerationPipeline (new orchestration layer)
  |
  |-- Pass 1: Generate Slides (existing provider.generateLessonSlides)
  |      Returns: Slide[] (same as today)
  |
  |-- Pass 2: Detect Lesson Phases (NEW)
  |      Input: generated slides + lesson plan text
  |      Returns: slides with lessonPhase field populated
  |      (runs as post-processing, NOT separate AI call)
  |
  |-- Pass 3: Auto Gap Analysis (reuses existing provider.analyzeGaps)
  |      Input: slides from Pass 1 + original lesson plan
  |      Returns: GapAnalysisResult
  |
  |-- Pass 4: Auto Gap Fill (reuses existing provider.generateSlideFromGap)
  |      Input: critical + recommended gaps (auto-skip nice-to-have)
  |      Returns: additional Slide[] inserted at suggested positions
  |
  |-- Pass 5: Resource Integration (NEW)
  |      Input: uploaded resources + final slide deck
  |      Returns: slides with resourceRef fields linking to relevant resources
  |
  v
Final Slide[] with phases + gap fills + resource links -> App.tsx state
```

## Component Boundaries

### New Components

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `GenerationPipeline` (service) | Orchestrates multi-pass generation with progress reporting | AIProviderInterface, App.tsx via callbacks |
| `ResourceUploadZone` (component) | Accepts resource files on landing page alongside lesson plan | App.tsx state, uploadService |
| `GenerationProgressOverlay` (component) | Shows multi-phase progress (replaces current simple spinner) | GenerationPipeline progress callbacks |
| `LessonPhaseIndicator` (component) | Badge on slide cards showing phase (I Do, We Do, etc.) | Slide.lessonPhase field |

### Modified Components

| Component | What Changes | Why |
|-----------|-------------|-----|
| `App.tsx` handleGenerate | Calls GenerationPipeline instead of directly calling provider.generateLessonSlides | Pipeline orchestration |
| `App.tsx` state | New: `uploadedResourceFiles: File[]`, expanded `generationProgress` type | Landing page resource upload + multi-phase progress |
| `types.ts` Slide interface | New field: `lessonPhase?: LessonPhase` | Phase detection output |
| `types.ts` Slide interface | New field: `resourceRefs?: string[]` | Resource linking |
| `types.ts` new type | `LessonPhase` union type | Phase classification |
| `types.ts` new type | `GenerationPipelineProgress` | Multi-phase progress tracking |
| Landing page (in App.tsx) | Third upload zone or attachment area for resource files | Resource upload at generation time |
| `GapAnalysisPanel` | Add "auto-filled" badge for gaps that were already resolved | Distinguish auto-filled vs manual |
| `SlideCard.tsx` | Show lesson phase badge | Visual phase indicator |
| `CueFileContent` | New field: `resourceFiles?: ResourceFileRef[]` | Persist resource references |

### Unchanged Components

| Component | Why Unchanged |
|-----------|--------------|
| `AIProviderInterface` | All needed methods already exist (generateLessonSlides, analyzeGaps, generateSlideFromGap) |
| `GeminiProvider` / `ClaudeProvider` | No new AI methods needed for Passes 1-4; Pass 5 uses existing patterns |
| `ResourceHub` | Remains as post-generation enhancement tool; new pipeline is pre-generation |
| `PresentationView` | Slides render the same regardless of how they were generated |
| `saveService` / `loadService` | Just need to serialize new fields (lessonPhase, resourceRefs) |

## Data Model Changes

### New Types (add to `types.ts`)

```typescript
// Lesson phase classification (Gradual Release of Responsibility model)
export type LessonPhase =
  | 'hook'           // Opening/engagement activity
  | 'i-do'           // Direct instruction / teacher modeling
  | 'we-do'          // Guided practice / teacher + students together
  | 'you-do'         // Independent practice
  | 'review'         // Plenary / assessment / closing
  | 'differentiation' // Support/extension/intervention content
  | 'success-criteria'; // Learning objectives / success criteria

// Reference to an uploaded resource file
export interface ResourceFileRef {
  id: string;              // crypto.randomUUID()
  filename: string;
  type: 'pdf' | 'image' | 'docx';
  sizeBytes: number;
  // Content extracted during upload (reuse existing parsePdf/mammoth)
  extractedText?: string;
  thumbnail?: string;      // Base64 data URL
}

// Generation pipeline progress (replaces simple 'slides' | 'teleprompter')
export interface GenerationPipelineProgress {
  phase: 'slides' | 'teleprompter' | 'phase-detection' | 'gap-analysis' | 'gap-fill' | 'resource-linking';
  current: number;
  total: number;
  label: string;           // Human-readable description for UI
}

// Pipeline configuration (user preferences)
export interface PipelineOptions {
  autoGapAnalysis: boolean;     // Default: true
  autoGapFill: boolean;         // Default: true (only critical + recommended)
  gapFillSeverityThreshold: GapSeverity; // Default: 'recommended' (fills critical + recommended, skips nice-to-have)
  detectLessonPhases: boolean;  // Default: true
  resourceFiles: File[];        // Resources to integrate
}

// Pipeline result (returned to App.tsx)
export interface GenerationPipelineResult {
  slides: Slide[];
  gapAnalysis: GapAnalysisResult | null;  // Null if auto-analysis disabled
  gapsAutoFilled: IdentifiedGap[];        // Gaps that were auto-resolved
  gapsRemaining: IdentifiedGap[];         // Gaps left for manual review (nice-to-have)
  resourceRefs: ResourceFileRef[];
}
```

### Slide Interface Changes

```typescript
export interface Slide {
  // ... existing fields unchanged ...

  // NEW: Lesson phase classification (v5.0)
  lessonPhase?: LessonPhase;

  // NEW: Resource file references (v5.0)
  // IDs of ResourceFileRef objects that are relevant to this slide
  resourceRefs?: string[];

  // NEW: Whether this slide was auto-generated from gap analysis (v5.0)
  gapSource?: {
    gapId: string;         // Original gap ID
    severity: GapSeverity;
    autoFilled: boolean;   // true = pipeline auto-filled, false = user manually added
  };
}
```

### CueFile Changes

```typescript
export interface CueFileContent {
  slides: Slide[];
  studentNames: string[];
  lessonText: string;
  studentGrades?: StudentWithGrade[];
  enhancedResources?: EnhancedResourceState[];
  // NEW v5
  resourceFiles?: ResourceFileRef[];  // Uploaded resource metadata (not the file content itself)
  lastGapAnalysis?: GapAnalysisResult; // Persist gap analysis results for re-analysis
}

// Bump: CURRENT_FILE_VERSION = 5
```

## Patterns to Follow

### Pattern 1: Pipeline Orchestrator (Service Layer)

The pipeline should be a pure service function (not a React hook), matching the existing pattern where `geminiService.ts` exports standalone async functions that the provider classes delegate to.

**What:** A single `runGenerationPipeline()` function that sequentially calls existing provider methods, with progress callbacks for UI updates.

**When:** Called from `handleGenerate` in App.tsx instead of directly calling `provider.generateLessonSlides()`.

**Why service, not hook:** The existing codebase uses services for AI operations and hooks for UI state. The pipeline is orchestration logic, not UI state management. It takes a provider and returns results.

```typescript
// services/generationPipeline.ts

import { AIProviderInterface, GapAnalysisResult, IdentifiedGap, GenerationInput } from './aiProvider';
import { Slide } from '../types';

export interface PipelineCallbacks {
  onProgress: (progress: GenerationPipelineProgress) => void;
  onSlidesGenerated: (slides: Slide[]) => void; // Early preview
}

export async function runGenerationPipeline(
  provider: AIProviderInterface,
  input: GenerationInput,
  options: PipelineOptions,
  callbacks: PipelineCallbacks,
  signal?: AbortSignal  // Cancellation support
): Promise<GenerationPipelineResult> {

  // Pass 1: Generate Slides (existing)
  callbacks.onProgress({ phase: 'slides', current: 0, total: 0, label: 'Generating slides...' });
  let slides = await provider.generateLessonSlides(input);

  // Early preview: show slides immediately while pipeline continues
  callbacks.onSlidesGenerated(slides);

  // Pass 1b: Teleprompter regeneration (existing pattern, if non-standard verbosity)
  if (input.verbosity && input.verbosity !== 'standard') {
    for (let i = 0; i < slides.length; i++) {
      callbacks.onProgress({
        phase: 'teleprompter',
        current: i + 1,
        total: slides.length,
        label: `Refining teleprompter: ${i + 1}/${slides.length}`
      });
      // ... existing regeneration logic ...
    }
  }

  // Pass 2: Lesson Phase Detection (post-processing, no AI call)
  if (options.detectLessonPhases) {
    callbacks.onProgress({ phase: 'phase-detection', current: 0, total: 0, label: 'Detecting lesson phases...' });
    slides = detectLessonPhases(slides, input.lessonText);
  }

  // Pass 3: Auto Gap Analysis (reuse existing provider method)
  let gapResult: GapAnalysisResult | null = null;
  let autoFilledGaps: IdentifiedGap[] = [];
  let remainingGaps: IdentifiedGap[] = [];

  if (options.autoGapAnalysis && input.lessonText) {
    callbacks.onProgress({ phase: 'gap-analysis', current: 0, total: 0, label: 'Checking for gaps...' });
    const rawImages = (input.lessonImages || []).map(img =>
      img.replace(/^data:image\/[a-z]+;base64,/, '')
    );
    gapResult = await provider.analyzeGaps(
      slides, input.lessonText, rawImages, input.gradeLevel || 'Year 6 (10-11 years old)'
    );

    // Pass 4: Auto Gap Fill (critical + recommended only)
    if (options.autoGapFill && gapResult.gaps.length > 0) {
      const gapsToFill = gapResult.gaps.filter(g =>
        g.severity === 'critical' ||
        (options.gapFillSeverityThreshold !== 'critical' && g.severity === 'recommended')
      );
      remainingGaps = gapResult.gaps.filter(g => !gapsToFill.includes(g));

      for (let i = 0; i < gapsToFill.length; i++) {
        if (signal?.aborted) break;

        callbacks.onProgress({
          phase: 'gap-fill',
          current: i + 1,
          total: gapsToFill.length,
          label: `Filling gap ${i + 1}/${gapsToFill.length}: ${gapsToFill[i].topic}`
        });

        const gapSlide = await provider.generateSlideFromGap(
          gapsToFill[i],
          slides,
          slides[0]?.title || 'Lesson',
          input.verbosity || 'standard'
        );

        // Insert at suggested position
        const insertIdx = Math.min(gapsToFill[i].suggestedPosition, slides.length);
        gapSlide.gapSource = {
          gapId: gapsToFill[i].id,
          severity: gapsToFill[i].severity,
          autoFilled: true
        };
        slides = [...slides.slice(0, insertIdx), gapSlide, ...slides.slice(insertIdx)];
        autoFilledGaps.push(gapsToFill[i]);
      }
    }
  }

  // Pass 5: Resource Linking (if resources uploaded)
  // ... resource integration logic ...

  return {
    slides,
    gapAnalysis: gapResult,
    gapsAutoFilled: autoFilledGaps,
    gapsRemaining: remainingGaps,
    resourceRefs: []
  };
}
```

### Pattern 2: Lesson Phase Detection as Post-Processing (No AI Call)

**What:** Detect lesson phases from slide titles, content keywords, and ordering heuristics -- NOT a separate AI call.

**When:** After slide generation, before gap analysis.

**Why NOT an AI call:** (1) The generation prompt already tells the AI to "Preserve the pedagogical structure: 'Hook', 'I Do', 'We Do', 'You Do'" -- so the AI is already structuring slides this way. (2) Detection from the output is a classification problem solvable with keyword matching and position heuristics. (3) Saves an API call and 2-4 seconds of latency. (4) Avoids provider-specific prompt differences.

**Why NOT in the generation prompt:** Adding `lessonPhase` to the Gemini responseSchema would work technically, but it couples phase detection to the generation model's judgment during a complex task. Post-processing is more reliable because it can use the full slide sequence context and is independent of the AI model's generation focus.

```typescript
// services/lessonPhaseDetector.ts

import { Slide, LessonPhase } from '../types';

// Keyword patterns for each phase (order matters: checked top-to-bottom)
const PHASE_PATTERNS: Array<{ phase: LessonPhase; titlePatterns: RegExp[]; contentPatterns: RegExp[] }> = [
  {
    phase: 'hook',
    titlePatterns: [/hook/i, /warm.?up/i, /starter/i, /do now/i, /opener/i, /engage/i, /activat/i],
    contentPatterns: [/discuss with your partner/i, /what do you already know/i, /think about/i]
  },
  {
    phase: 'success-criteria',
    titlePatterns: [/success\s*criteria/i, /learning\s*(objective|intention|goal)/i, /walt/i, /wilf/i, /tib/i],
    contentPatterns: [/i can/i, /i will/i, /by the end of/i, /we are learning to/i]
  },
  {
    phase: 'i-do',
    titlePatterns: [/i\s*do/i, /model/i, /demonstrat/i, /direct\s*instruct/i, /teacher\s*model/i, /explanation/i, /input/i],
    contentPatterns: [/watch how/i, /let me show/i, /notice how/i]
  },
  {
    phase: 'we-do',
    titlePatterns: [/we\s*do/i, /guided\s*practice/i, /together/i, /shared/i, /let'?s\s*try/i],
    contentPatterns: [/work together/i, /let's try/i, /with your partner/i, /as a class/i]
  },
  {
    phase: 'you-do',
    titlePatterns: [/you\s*do/i, /independent/i, /your\s*turn/i, /practice/i, /task/i, /activity/i],
    contentPatterns: [/on your own/i, /independently/i, /complete the/i, /your turn/i]
  },
  {
    phase: 'differentiation',
    titlePatterns: [/differentiat/i, /support/i, /extension/i, /intervent/i, /scaffold/i, /challenge/i],
    contentPatterns: [/grade [a-e]/i, /support.*extension/i, /lower ability/i, /higher ability/i]
  },
  {
    phase: 'review',
    titlePatterns: [/review/i, /plenar/i, /reflect/i, /summar/i, /closing/i, /wrap.?up/i, /exit\s*ticket/i, /assessment/i],
    contentPatterns: [/what did we learn/i, /key takeaway/i, /remember that/i, /today we/i]
  },
];

export function detectLessonPhases(slides: Slide[], lessonText: string): Slide[] {
  return slides.map((slide, index) => {
    // Skip slides that already have a manually-set phase
    if (slide.lessonPhase) return slide;

    const phase = classifySlide(slide, index, slides.length);
    return phase ? { ...slide, lessonPhase: phase } : slide;
  });
}

function classifySlide(slide: Slide, index: number, total: number): LessonPhase | null {
  const title = slide.title || '';
  const contentText = slide.content.join(' ');

  // 1. Try keyword matching on title (highest confidence)
  for (const pattern of PHASE_PATTERNS) {
    if (pattern.titlePatterns.some(re => re.test(title))) {
      return pattern.phase;
    }
  }

  // 2. Try keyword matching on content
  for (const pattern of PHASE_PATTERNS) {
    if (pattern.contentPatterns.some(re => re.test(contentText))) {
      return pattern.phase;
    }
  }

  // 3. Positional heuristics (fallback)
  const position = index / Math.max(total - 1, 1);
  if (index === 0) return 'hook';
  if (position > 0.85) return 'review';

  // 4. No confident classification
  return null;
}
```

### Pattern 3: Early Preview with Background Pipeline

**What:** Show generated slides immediately after Pass 1, then continue pipeline passes in the background. User can start editing while gap analysis and resource linking run.

**When:** After initial slide generation completes.

**Why:** The current flow blocks UI until all generation is done. With 4-5 passes, that could take 30-60 seconds. Showing slides after Pass 1 (5-10 seconds) and continuing in background respects the teacher's time.

```typescript
// In App.tsx handleGenerate:

const result = await runGenerationPipeline(
  provider,
  generationInput,
  pipelineOptions,
  {
    onProgress: setGenerationProgress,
    onSlidesGenerated: (earlySlides) => {
      // Show slides immediately -- user can start reviewing
      setSlides(earlySlides);
      setAppState(AppState.EDITING);
    }
  }
);

// Pipeline complete -- update with final slides (includes gap fills, phases)
setSlides(result.slides);

// Show remaining gaps for manual review
if (result.gapsRemaining.length > 0) {
  setGapResult({
    gaps: result.gapsRemaining,
    summary: `Auto-filled ${result.gapsAutoFilled.length} gaps. ${result.gapsRemaining.length} optional gaps remain.`,
    coveragePercentage: result.gapAnalysis?.coveragePercentage || 100
  });
}
```

### Pattern 4: Resource Upload on Landing Page

**What:** Add a third upload zone (or attachment area) on the landing page for resource files, separate from the lesson plan and existing presentation uploads.

**When:** User uploads resources alongside lesson plan, before generation.

**Why:** Resources uploaded at generation time can inform the AI about what supplementary materials exist, enabling the pipeline to: (1) avoid generating content that duplicates uploaded worksheets, (2) reference resources in teleprompter scripts ("Hand out the vocabulary sheet now"), (3) detect which slides align with which resources.

**Design decision:** This does NOT replace ResourceHub. ResourceHub remains as the post-generation tool for detailed resource enhancement (differentiation, answer keys, slide alignment). The landing page upload is lightweight: just capture files and extract minimal metadata.

```
Landing Page Layout (v5.0):

+--------------------------------------------------+
|  [Lesson Plan PDF]    |   [Existing Presentation] |
|  (green zone)         |   (purple zone)            |
+--------------------------------------------------+
|  [Supplementary Resources] (optional)             |
|  (blue zone - drag/drop multiple files)           |
+--------------------------------------------------+
|  [Text area for lesson notes]                     |
+--------------------------------------------------+
|                  [Generate]                        |
+--------------------------------------------------+
```

### Pattern 5: Resource Linking (Post-Generation)

**What:** After slides are generated and gap-filled, link uploaded resources to relevant slides based on content similarity.

**When:** Final pass of the pipeline.

**Why:** This is a lightweight operation that does not require a separate AI call. Use keyword overlap between resource extracted text and slide content. If more sophisticated matching is needed, a single AI call could match all resources to all slides at once (batch, not per-resource).

```typescript
// services/resourceLinker.ts

export function linkResourcesToSlides(
  slides: Slide[],
  resources: ResourceFileRef[]
): Slide[] {
  if (resources.length === 0) return slides;

  return slides.map(slide => {
    const slideText = `${slide.title} ${slide.content.join(' ')}`.toLowerCase();
    const matchedResources = resources.filter(r => {
      if (!r.extractedText) return false;
      // Simple keyword overlap score
      const resourceWords = new Set(r.extractedText.toLowerCase().split(/\W+/).filter(w => w.length > 3));
      const slideWords = slideText.split(/\W+/).filter(w => w.length > 3);
      const overlap = slideWords.filter(w => resourceWords.has(w)).length;
      return overlap >= 3; // At least 3 shared meaningful words
    });

    if (matchedResources.length > 0) {
      return { ...slide, resourceRefs: matchedResources.map(r => r.id) };
    }
    return slide;
  });
}
```

For high-quality resource linking, consider a single AI call that receives ALL resources and ALL slides and returns the mapping. This is more reliable than keyword matching but adds latency and cost.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate AI Call for Phase Detection

**What:** Making a dedicated `provider.detectPhases(slides)` AI call.

**Why bad:** Adds 3-5 seconds latency and an API call cost for a classification task that can be done client-side with high accuracy. The AI already structures slides according to the gradual release of responsibility model (the prompt explicitly instructs this). Post-processing just labels what the AI already organized.

**Instead:** Use `detectLessonPhases()` post-processing function with keyword matching and positional heuristics. Fall back to null (no phase) rather than guessing.

### Anti-Pattern 2: Adding lessonPhase to Generation Schema

**What:** Adding `lessonPhase` to the Gemini responseSchema or Claude tool schema.

**Why bad:** (1) Gemini's structured JSON mode already struggles with complex schemas (verbosity in speakerNotes is ignored in JSON mode -- see the existing `regenerateTeleprompter` workaround). Adding another field increases schema complexity. (2) Couples phase classification to the generation model's multitasking ability. (3) The AI may assign phases inconsistently across providers.

**Instead:** Post-process the generated slides. The AI focuses on content quality; classification is done separately.

### Anti-Pattern 3: Running All Passes Sequentially and Blocking UI

**What:** Waiting for all 5 passes before showing any results.

**Why bad:** Teachers are used to the current 5-10 second generation time. Adding gap analysis + gap fill + resource linking could push this to 30-60 seconds with no visible progress.

**Instead:** Use the Early Preview pattern (Pattern 3). Show slides after Pass 1, continue pipeline in background. The generationProgress state already supports phase tracking.

### Anti-Pattern 4: Making Pipeline a Hook

**What:** Creating `useGenerationPipeline()` hook.

**Why bad:** The existing codebase separates concerns: services handle AI/async operations, hooks handle UI state. A pipeline hook would mix orchestration logic with React lifecycle. It would also be harder to test.

**Instead:** Make it a pure async service function (`runGenerationPipeline`). Call it from `handleGenerate` in App.tsx, which already manages the UI state transitions. This matches how `analyzeUploadedDocument()` in `documentAnalysisService.ts` works.

### Anti-Pattern 5: Replacing ResourceHub with Landing Page Upload

**What:** Moving all resource functionality to the landing page.

**Why bad:** ResourceHub serves a different purpose: detailed post-generation enhancement with differentiation, answer keys, and slide alignment. The landing page upload is lightweight pre-generation context.

**Instead:** Two paths to resources: (1) Landing page: upload before generation for pipeline integration. (2) ResourceHub: detailed enhancement after generation. If resources were uploaded on landing page, ResourceHub should auto-populate them.

## Data Flow

### Generation Pipeline Flow

```
User clicks "Generate"
    |
    v
App.tsx handleGenerate()
    |
    |-- Reads: lessonText, pageImages, existingPptImages, existingPptText,
    |          uploadMode, deckVerbosity, resourceFiles (NEW)
    |-- Builds: GenerationInput (existing) + PipelineOptions (NEW)
    |
    v
runGenerationPipeline(provider, input, options, callbacks)
    |
    |-- Pass 1: provider.generateLessonSlides(input)
    |      -> callbacks.onSlidesGenerated(slides)  // Early preview
    |
    |-- Pass 1b: provider.regenerateTeleprompter() per slide (conditional)
    |
    |-- Pass 2: detectLessonPhases(slides, lessonText)  // Client-side
    |      -> slides[i].lessonPhase = 'hook' | 'i-do' | etc.
    |
    |-- Pass 3: provider.analyzeGaps(slides, lessonText, images, gradeLevel)
    |      -> GapAnalysisResult
    |
    |-- Pass 4: For each critical/recommended gap:
    |      provider.generateSlideFromGap(gap, slides, topic, verbosity)
    |      -> Insert new slide at gap.suggestedPosition
    |      -> Mark slide.gapSource = { autoFilled: true }
    |
    |-- Pass 5: linkResourcesToSlides(slides, resourceRefs)
    |      -> slides[i].resourceRefs = ['resource-id-1']
    |
    v
GenerationPipelineResult
    |
    v
App.tsx
    |-- setSlides(result.slides)
    |-- setGapResult({ gaps: result.gapsRemaining, ... })  // Show remaining gaps
    |-- Store resourceRefs for ResourceHub integration
```

### Resource Data Flow

```
Landing Page:
  Resource files dropped in upload zone
    -> processUploadedFile() (existing uploadService.ts)
    -> UploadedResource objects stored in App.tsx state
    -> Extracted text available for pipeline Pass 5

Generation Pipeline:
  Pass 5 receives UploadedResource[]
    -> Keyword matching links resources to slides
    -> slide.resourceRefs populated

Editor View:
  SlideCard shows resource badge if slide.resourceRefs.length > 0
  Teleprompter can reference resource: "Hand out [resource.filename]"

ResourceHub:
  Pre-populated with resources from landing page upload
  Teacher can run full enhancement flow (differentiation, answer keys)
  Enhancement results stored in enhancedResourceStates (existing)
```

### Lesson Phase Data Flow

```
Generation Pipeline Pass 2:
  detectLessonPhases(slides, lessonText)
    -> For each slide:
         1. Title keyword match against PHASE_PATTERNS
         2. Content keyword match against PHASE_PATTERNS
         3. Positional heuristic (first slide = hook, last = review)
         4. If no match: lessonPhase = undefined (no badge shown)
    -> Returns Slide[] with lessonPhase populated

Editor View:
  SlideCard renders LessonPhaseIndicator component
    -> Small badge: "I Do", "We Do", "You Do", etc.
    -> Phase can be manually overridden by clicking badge (dropdown)

Presentation View:
  Teacher view shows current phase in teleprompter header
  Helps teacher track where they are in the lesson structure
```

## Integration Points with Existing Code

### 1. App.tsx handleGenerate (MODIFY)

Current `handleGenerate` (lines 530-617) directly calls `provider.generateLessonSlides()` and handles verbosity regeneration. This is replaced with a call to `runGenerationPipeline()`.

**Key change:** The early preview callback allows the existing `setAppState(AppState.EDITING)` to happen after Pass 1, while the pipeline continues. The remaining passes update slides in-place.

### 2. App.tsx State (MODIFY)

- Replace `generationProgress` type: `{ phase: 'slides' | 'teleprompter'; ... }` becomes `GenerationPipelineProgress | null`
- Add: `resourceFiles: File[]` state (or reuse `uploadedResources` from ResourceHub if lifted up)
- Existing `gapResult`, `gapLessonPlanText`, `gapLessonPlanImages` state can be pre-populated by the pipeline (no new state needed)

### 3. Landing Page Upload Area (MODIFY)

Add a third upload zone below the existing dual upload zones. This zone accepts multiple files (.pdf, .docx, images) -- reuse `processUploadedFile` from `uploadService.ts`.

### 4. GapAnalysisPanel (MODIFY)

Add visual distinction for auto-filled gaps vs. remaining gaps. When pipeline auto-fills gaps, GapAnalysisPanel should show:
- "Auto-filled" count summary at top
- Only remaining (nice-to-have) gaps in the list
- User can still manually add slides for remaining gaps

### 5. SlideCard (MODIFY)

Add `LessonPhaseIndicator` badge component. Small, non-intrusive pill badge showing phase name. Clicking opens dropdown to override.

### 6. CueFile Serialization (MODIFY)

- `saveService.ts`: Include `lessonPhase`, `resourceRefs`, `gapSource` in serialized slides
- `loadService.ts`: Parse these new optional fields (backward compatible -- old files just won't have them)
- Bump `CURRENT_FILE_VERSION` to 5

### 7. ResourceHub Pre-Population (NEW CONNECTION)

If resources were uploaded on the landing page, ResourceHub should receive them as initial `uploadedResources`. This avoids re-uploading.

```typescript
// In App.tsx, when opening ResourceHub:
<ResourceHub
  // ... existing props ...
  initialUploadedResources={landingPageResources}  // NEW
/>
```

## Suggested Build Order (Based on Dependencies)

### Phase 1: Data Model + Pipeline Shell (no UI changes)
1. Add new types to `types.ts` (LessonPhase, ResourceFileRef, GenerationPipelineProgress, PipelineOptions, GenerationPipelineResult)
2. Create `services/generationPipeline.ts` with `runGenerationPipeline()` function
3. Pipeline initially just wraps existing `generateLessonSlides` + verbosity regeneration (same behavior as today)
4. Update `handleGenerate` to call pipeline instead of direct provider calls
5. Verify: existing generation flow works identically through the new pipeline

**Why first:** Foundation that everything else builds on. Zero UI changes, zero behavior changes. Pure refactor.

### Phase 2: Lesson Phase Detection
1. Create `services/lessonPhaseDetector.ts` with keyword patterns and heuristics
2. Add `lessonPhase` field to Slide interface
3. Pipeline Pass 2 calls `detectLessonPhases()` after generation
4. Add `LessonPhaseIndicator` component (badge on SlideCard)
5. Add phase override dropdown on badge click
6. Update save/load to persist `lessonPhase`

**Why second:** Self-contained feature. No AI calls, no new API methods. Client-side only. Quick win that validates pipeline architecture.

### Phase 3: Auto Gap Analysis + Fill
1. Pipeline Pass 3: call existing `provider.analyzeGaps()` with lesson plan text/images
2. Pipeline Pass 4: call existing `provider.generateSlideFromGap()` for critical + recommended gaps
3. Update `generationProgress` UI to show multi-phase progress
4. Create `GenerationProgressOverlay` component (replaces simple spinner)
5. Implement early preview: show slides after Pass 1, continue pipeline
6. Show "auto-filled" summary when pipeline completes
7. Pre-populate `gapResult` state with remaining nice-to-have gaps

**Why third:** Reuses existing AI methods. Main complexity is UI progress reporting and the early preview pattern.

### Phase 4: Resource Upload Integration
1. Add resource upload zone to landing page
2. Store `resourceFiles` in App.tsx state
3. Pipeline Pass 5: `linkResourcesToSlides()` keyword matching
4. Add resource badge to SlideCard
5. Pre-populate ResourceHub with landing page resources
6. Update CueFile serialization for resource references

**Why last:** Builds on all previous phases. Needs landing page UI changes, pipeline integration, and ResourceHub connection.

## Scalability Considerations

| Concern | Current (1 pass) | v5.0 (5 passes) | Mitigation |
|---------|-------------------|------------------|------------|
| API call count | 1 (+ N for verbosity) | 1 + 1 (gap analysis) + N (gap fill) + N (verbosity) | Gap fill only for critical/recommended gaps. Typically 0-3 gaps. |
| Latency | 5-10s generation | 15-40s total pipeline | Early preview after Pass 1. User sees slides in 5-10s, pipeline continues. |
| Token usage | ~2K input + ~4K output | +~2K for gap analysis, +~1K per gap fill | Gap analysis is input-heavy (deck + lesson plan) but output-light. |
| Error handling | Single try/catch | Per-pass error isolation | Each pass can fail independently. Pass 1 failure = no slides. Pass 3 failure = no gap analysis (slides still valid). |
| Cancellation | Not needed (fast) | AbortController for pipeline | User can cancel during long pipeline. Slides from completed passes are preserved. |

## Sources

- Existing codebase analysis: `aiProvider.ts`, `geminiService.ts`, `gapAnalysisPrompts.ts`, `condensationPrompts.ts`, `App.tsx` generation flow (HIGH confidence -- direct code reading)
- Gemini structured output: [Structured outputs | Gemini API](https://ai.google.dev/gemini-api/docs/structured-output) (HIGH confidence)
- Gradual Release of Responsibility model: [GRR Framework | Old Dominion University](https://www.odu.edu/facultydevelopment/teaching-toolkit/gradual-release-responsibility-framework) (HIGH confidence -- established pedagogical framework)
- Multi-pass AI pipeline patterns: [AI Architectures in 2026 | Medium](https://medium.com/@angelosorte1/ai-architectures-in-2026-components-patterns-and-practical-code-1df838dab854) (MEDIUM confidence -- general pattern validation)
- Pipeline optimization: [Practical Strategies for Optimizing Gemini API Calls](https://irwinbilling.com/optimizing-gemini-api-calls/) (MEDIUM confidence)
