# Phase 30: Elaborate Slide Insertion - Research

**Researched:** 2026-01-25
**Domain:** AI-powered slide generation for deeper pedagogical content
**Confidence:** HIGH

## Summary

This phase adds an "Elaborate" option to the slide insertion menu, generating AI-powered depth content that expands on the current slide with examples, analogies, and application focus. The research confirms **zero new dependencies required** - all implementation builds on existing patterns from Exemplar slide insertion (Phase 9), AI provider abstraction, and Phase 29's context-aware regeneration.

The core technical approach mirrors `handleInsertExemplarSlide` in App.tsx: create temp slide, call AI provider method, replace temp with generated content, auto-generate image if enabled. The key difference is prompt engineering - Elaborate content focuses on depth (paragraphs with examples/analogies) rather than worked examples.

**Primary recommendation:** Extend `AIProviderInterface` with `generateElaborateSlide()` method following the exact pattern of `generateExemplarSlide()`, using `buildSlideContext()` for full presentation awareness rather than just prevSlide.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.2.0 | UI component framework | Already in use, no change needed |
| @google/genai | 1.30.0 | Gemini AI generation | Existing provider, extend only |
| Claude API | 2023-06-01 | Claude AI generation | Existing provider, extend only |
| TypeScript | 5.x | Type safety | Existing codebase standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | CDN | Styling | Elaborate slide badge styling |
| BroadcastChannel | Native | Sync to student view | Already syncs slides automatically |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Paragraphs in content[] | New paragraph layout type | Added complexity; test with existing 'split' layout first |
| slideType field | Title prefix convention | Field is cleaner for filtering/badges; defer if not needed |
| Full context (buildSlideContext) | Just prevSlide | Context prevents generic/repetitive content; worth the token cost |

**Installation:**
```bash
# No new installations required
# All features use existing dependencies
```

## Architecture Patterns

### Recommended Project Structure
```
services/
├── aiProvider.ts           # Add generateElaborateSlide to interface
├── geminiService.ts        # Add generateElaborateSlide implementation
├── providers/
│   ├── geminiProvider.ts   # Add method passthrough
│   └── claudeProvider.ts   # Add Claude implementation
components/
└── App.tsx                 # Extend InsertPoint menu + add handler
types.ts                    # Optional: add slideType field
```

### Pattern 1: Slide Insertion Pattern (from Exemplar)
**What:** Create temp placeholder slide → call AI provider → replace with generated content → auto-image
**When to use:** Any AI-generated slide insertion
**Example:**
```typescript
// Source: App.tsx lines 412-453 (handleInsertExemplarSlide)
const handleInsertElaborateSlide = async (index: number) => {
  if (!provider) {
    setErrorModal({ title: 'AI Not Configured', message: 'Please configure your AI provider in Settings.' });
    return;
  }

  const tempId = `temp-elab-${Date.now()}`;
  const tempSlide: Slide = {
    id: tempId,
    title: "Elaborating...",
    content: ["Expanding on the concept...", "Adding depth and examples..."],
    speakerNotes: "",
    imagePrompt: "",
    isGeneratingImage: true,
    layout: 'split'
  };

  // Insert temp slide
  const newSlides = [...slides];
  newSlides.splice(index + 1, 0, tempSlide);
  setSlides(newSlides);
  setActiveSlideIndex(index + 1);

  try {
    const sourceSlide = slides[index];  // Slide ABOVE the + button
    const elaborate = await provider.generateElaborateSlide(lessonTitle, sourceSlide, slides);
    setSlides(curr => curr.map(s => s.id === tempId ? { ...elaborate, id: tempId, isGeneratingImage: autoGenerateImages } : s));

    if (autoGenerateImages) {
      const img = await provider.generateSlideImage(elaborate.imagePrompt, elaborate.layout);
      setSlides(curr => curr.map(s => s.id === tempId ? { ...s, imageUrl: img, isGeneratingImage: false } : s));
    }
  } catch (err) {
    // Fallback to blank if elaborate fails
    setSlides(curr => curr.map(s => s.id === tempId ? { ...tempSlide, title: "New Slide", isGeneratingImage: false } : s));
    if (err instanceof AIProviderError) {
      setErrorModal({ title: 'Elaborate Generation Failed', message: err.userMessage });
    }
  }
};
```

### Pattern 2: AI Provider Interface Extension
**What:** Add method to interface + implement in both providers
**When to use:** Any new AI generation capability
**Example:**
```typescript
// Source: services/aiProvider.ts (following generateExemplarSlide pattern)
interface AIProviderInterface {
  // ... existing methods ...
  generateElaborateSlide(
    lessonTopic: string,
    sourceSlide: Slide,
    allSlides: Slide[]  // Full context for coherence
  ): Promise<Slide>;
}
```

### Pattern 3: Context-Aware Prompts (from Phase 29)
**What:** Include surrounding slides in AI prompt for coherent output
**When to use:** Any generation that should fit naturally in presentation flow
**Example:**
```typescript
// Source: services/geminiService.ts lines 878-894
// Build context from all slides for presentation coherence
const allSlidesContext = allSlides
  .map((s, i) => `Slide ${i + 1}: "${s.title}" - ${s.content.slice(0, 2).join('; ')}`)
  .join('\n');

const systemInstruction = `
You are creating an "Elaborate" slide to provide deeper understanding of: "${sourceSlide.title}"

PRESENTATION CONTEXT (maintain coherence):
${allSlidesContext}

SOURCE SLIDE TO ELABORATE ON:
Title: ${sourceSlide.title}
Content: ${sourceSlide.content.join('\n')}
`;
```

### Pattern 4: Teleprompter Script Generation
**What:** Use existing TELEPROMPTER_RULES for verbosity-aware scripts
**When to use:** Any slide generation that includes speakerNotes
**Example:**
```typescript
// Source: services/geminiService.ts lines 6-26 (TELEPROMPTER_RULES constant)
// Use verbosity level from current presentation state (standard by default)
const teleprompterInstruction = `
${TELEPROMPTER_RULES}

For Elaborate slides specifically:
- Intro segment sets context for why we're going deeper
- Each content segment explains the example/analogy without repeating slide text
- Include pacing cues: "[Pause for effect]", "[Let this sink in]"
`;
```

### Anti-Patterns to Avoid
- **Only passing prevSlide to AI:** Causes generic content that may repeat earlier slides or contradict upcoming ones. Always use buildSlideContext or pass allSlides.
- **Creating new Slide interface variants:** Cue uses flat Slide type everywhere. Add optional fields, don't create ElaborateSlide type.
- **Regenerating on every navigation:** Elaborate content is expensive; generate once, cache in slide state like other slides.
- **Mixing prose and bullets randomly:** Maintain structure - opening context as prose, then examples as bullets or cards (per CONTEXT.md decision).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide insertion | Custom array manipulation | Copy handleInsertExemplarSlide pattern | Already handles temp slides, error recovery |
| AI generation | New API wrapper | Extend AIProviderInterface | Consistent error handling, retry logic |
| Teleprompter scripts | Custom prompt | TELEPROMPTER_RULES constant | Tested, verbosity-aware, segment formatting |
| Slide context | Manual string building | buildSlideContext() from aiProvider.ts | Already handles cumulative content formatting |
| JSON parsing | Manual JSON.parse | extractJSON() in claudeProvider.ts | Handles Claude's markdown code blocks |
| Error handling | Try-catch with alerts | AIProviderError + error modal pattern | Consistent UX across all AI features |

**Key insight:** Phase 30 is primarily prompt engineering + menu extension. The infrastructure (insertion, generation, caching) already exists from Exemplar slides and Phase 29.

## Common Pitfalls

### Pitfall 1: AI Context Degradation
**What goes wrong:** Passing only sourceSlide causes AI to generate generic content that repeats earlier slides or contradicts upcoming content.
**Why it happens:** Exemplar pattern uses only prevSlide for context, but Elaborate needs broader lesson arc awareness.
**How to avoid:** Pass full presentation context using allSlides array or buildSlideContext() pattern.
**Warning signs:** Generated content starts with "In this lesson we'll learn..." on slide 8, or repeats examples already covered.

### Pitfall 2: Content Homogenization on Retry
**What goes wrong:** Teacher regenerates Elaborate slide multiple times, output converges to bland generic content.
**Why it happens:** Using previous generation as context creates feedback loop.
**How to avoid:** Always regenerate from original sourceSlide, not the current elaborate content. Make generation stateless.
**Warning signs:** Multiple regenerations produce increasingly similar, generic explanations.

### Pitfall 3: Teleprompter Segment Count Mismatch
**What goes wrong:** AI generates 3 content bullets but only 2 teleprompter segments, causing display errors.
**Why it happens:** Elaborate content may have different structure than standard slides.
**How to avoid:** Include explicit segment count rule in prompt: "You MUST provide exactly (Number of content points + 1) segments separated by '👉'".
**Warning signs:** Teleprompter shows "undefined" or blank for some bullets.

### Pitfall 4: Paragraph vs Bullet Layout Confusion
**What goes wrong:** Elaborate content renders poorly because it uses full paragraphs but 'split' layout expects bullets.
**Why it happens:** CONTEXT.md says "Mixed content format: opening context as prose, then examples as bullets or cards".
**How to avoid:** For MVP, keep content as bullets but longer/more descriptive. Test with 'split' and 'grid' layouts. Defer paragraph layout type if needed.
**Warning signs:** Content text gets truncated or overflow hidden in presentation view.

### Pitfall 5: InsertPoint Menu Gets Too Crowded
**What goes wrong:** Adding third option makes horizontal menu cramped or hard to tap.
**Why it happens:** Current InsertPoint uses horizontal flex layout for 2 buttons.
**How to avoid:** For 3 options, consider vertical dropdown or pill-shaped stacked layout. Test on narrow thumbnails.
**Warning signs:** Buttons overlap or text gets truncated on smaller sidebar widths.

## Code Examples

Verified patterns from official sources:

### InsertPoint Menu Extension
```typescript
// Source: App.tsx lines 29-66 (current InsertPoint component)
// Extend with third "Elaborate" button following same pattern

const InsertPoint = ({
  onClickBlank,
  onClickExemplar,
  onClickElaborate  // NEW
}: {
  onClickBlank: () => void,
  onClickExemplar: () => void,
  onClickElaborate: () => void  // NEW
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="group/insert py-1 flex items-center justify-center relative -my-1 min-h-[1.5rem]"
            onMouseLeave={() => setIsOpen(false)}
        >
            {/* ... existing + button ... */}

            {isOpen && (
                <div className="z-20 flex flex-col gap-1 animate-fade-in bg-white dark:bg-slate-800 border border-indigo-100 dark:border-amber-500/30 rounded-xl p-2 shadow-xl ring-4 ring-indigo-50 dark:ring-amber-500/10">
                    <button onClick={(e) => { e.stopPropagation(); onClickBlank(); setIsOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-lg transition-colors">
                        <span className="text-[10px] font-bold uppercase tracking-wider">📄 Blank</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onClickExemplar(); setIsOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 dark:bg-amber-500 hover:bg-indigo-700 dark:hover:bg-amber-400 text-white dark:text-slate-900 rounded-lg transition-colors shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider">💡 Exemplar</span>
                    </button>
                    {/* NEW: Elaborate button */}
                    <button onClick={(e) => { e.stopPropagation(); onClickElaborate(); setIsOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider">📖 Elaborate</span>
                    </button>
                </div>
            )}
        </div>
    );
};
```

### AI Provider Interface Extension
```typescript
// Source: services/aiProvider.ts (following existing patterns)
export interface AIProviderInterface {
  // ... existing methods ...

  // NEW: Generate elaborate slide expanding on source
  generateElaborateSlide(
    lessonTopic: string,
    sourceSlide: Slide,
    allSlides: Slide[]
  ): Promise<Slide>;
}
```

### Gemini Service Implementation
```typescript
// Source: services/geminiService.ts (following generateExemplarSlide pattern at lines 453-495)
export const generateElaborateSlide = async (
  apiKey: string,
  lessonTopic: string,
  sourceSlide: Slide,
  allSlides: Slide[]
): Promise<Slide> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  // Build full presentation context
  const presentationContext = allSlides
    .map((s, i) => `Slide ${i + 1}: "${s.title}" - ${s.content.slice(0, 2).join('; ')}`)
    .join('\n');

  const systemInstruction = `
You are an educational designer creating "Elaborate" slides for Year 6 (10-11 year olds).
Topic: ${lessonTopic}
You are expanding on: "${sourceSlide.title}"
Source content: ${sourceSlide.content.join('; ')}

PRESENTATION CONTEXT (maintain coherence, don't repeat):
${presentationContext}

TASK: Create a deeper-dive slide that helps students truly understand and apply this concept.

CONTENT REQUIREMENTS:
1. Title should reference the source (e.g., "More on [Topic]" or "[Topic]: Going Deeper")
2. ALWAYS include at least one analogy ("Think of it like...")
3. Focus on APPLICATION - show HOW to use the concept in practice
4. Match the tone of the source slide
5. Provide 3-5 content points mixing prose context with concrete examples

FORMAT:
- Opening point: Context prose (1-2 sentences setting up why this matters)
- Middle points: Concrete examples or application steps (bullets)
- Final point: "Think of it like..." analogy

${TELEPROMPTER_RULES}

You MUST provide exactly (Number of Bullets + 1) speaker note segments.
`;

  const response = await ai.models.generateContent({
    model,
    contents: `Generate an Elaborate slide for: "${sourceSlide.title}"`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Reference source topic" },
          content: { type: Type.ARRAY, items: { type: Type.STRING } },
          speakerNotes: { type: Type.STRING, description: "Must follow 👉 format" },
          imagePrompt: { type: Type.STRING },
          layout: { type: Type.STRING, enum: ['split', 'full-image', 'flowchart', 'grid', 'tile-overlap'] }
        },
        required: ['title', 'content', 'speakerNotes', 'imagePrompt']
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return { ...data, id: `elaborate-${Date.now()}`, isGeneratingImage: false };
};
```

### Optional: Slide Type Indicator
```typescript
// Source: types.ts (extend Slide interface if visual badge needed)
export interface Slide {
  // ... existing fields ...
  slideType?: 'standard' | 'elaborate' | 'work-together' | 'class-challenge';
}

// Usage in SlideCard for subtle badge
{slide.slideType === 'elaborate' && (
  <span className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
    Elaborate
  </span>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| prevSlide only context | Full presentation context | Phase 29 / Phase 30 | Coherent content that doesn't repeat |
| Generic depth content | Application-focused + analogies | CONTEXT.md decision | More pedagogically effective |
| Single verbosity script | Respects current verbosity level | Phase 27-28 | Consistent teleprompter experience |
| Horizontal InsertPoint | Vertical dropdown (3+ options) | Phase 30 | Scalable for future slide types |

**Deprecated/outdated:**
- Using only prevSlide for context: Causes generic content, use allSlides instead
- Forcing detailed teleprompter on elaborate: Should follow current verbosity level

## Open Questions

Things that couldn't be fully resolved:

1. **Paragraph layout vs bullets**
   - What we know: CONTEXT.md specifies "Mixed content format: opening context as prose, then examples as bullets"
   - What's unclear: Whether existing 'split' layout handles longer text gracefully
   - Recommendation: Start with 'split' layout using longer bullets. If overflow issues arise, defer to post-MVP layout refinement.

2. **Multi-slide elaborate content**
   - What we know: CONTEXT.md says "Claude decides based on content length (may split across 2-3 slides if substantial)"
   - What's unclear: API should return Slide[] instead of Slide? Or single slide with guidance to add more manually?
   - Recommendation: Start with single Slide return. If AI consistently generates too much content, add note in title like "[Topic]: Part 1 of 2" as manual split guidance.

3. **slideType field persistence**
   - What we know: Research suggests optional slideType field for badges/filtering
   - What's unclear: Should this bump CURRENT_FILE_VERSION to 3? Or keep optional with undefined default?
   - Recommendation: Keep optional, no version bump. slideType is purely for UI hints, not data integrity.

## Sources

### Primary (HIGH confidence)
- App.tsx lines 29-66: InsertPoint component structure
- App.tsx lines 412-453: handleInsertExemplarSlide pattern
- services/aiProvider.ts lines 169-213: AIProviderInterface definition
- services/geminiService.ts lines 453-495: generateExemplarSlide implementation
- services/geminiService.ts lines 6-65: TELEPROMPTER_RULES constants
- services/providers/claudeProvider.ts lines 474-514: Claude generateExemplarSlide
- types.ts lines 1-21: Slide interface definition

### Secondary (MEDIUM confidence)
- .planning/research/SUMMARY.md: v3.2 research with elaboration recommendations
- .planning/phases/29-single-teleprompter-regeneration/29-01-PLAN.md: Context-aware regeneration pattern
- .planning/phases/27-verbosity-ui-generation/27-01-PLAN.md: Verbosity system implementation

### Tertiary (LOW confidence)
- None - all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zero new dependencies, all existing patterns
- Architecture: HIGH - Direct extension of Exemplar pattern
- Pitfalls: HIGH - Based on v3.1 verbosity learnings and Phase 29 context pattern
- Code examples: HIGH - Derived from actual codebase patterns

**Research date:** 2026-01-25
**Valid until:** 2026-02-24 (30 days - stable patterns, no fast-moving dependencies)
