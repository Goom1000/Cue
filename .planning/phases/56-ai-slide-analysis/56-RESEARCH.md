# Phase 56: AI Slide Analysis - Research

**Researched:** 2026-02-07
**Domain:** AI Vision/Multimodal APIs for Image-to-Text and Slide Content Transformation
**Confidence:** HIGH

## Summary

Phase 56 adds AI-powered analysis to pasted slides, automatically transforming PowerPoint image content into Cue-style slides with proper layouts and teleprompter notes. The app already has multimodal AI capabilities (Gemini/Claude vision) built in Phase 44 for document analysis - we reuse those proven patterns.

**Current State (Phase 55):**
- PowerPoint slides paste as images (browser limitation)
- Image is displayed in "full-image" layout
- No AI processing occurs

**Phase 56 Adds:**
- AI text extraction from pasted slide images using vision APIs
- AI transformation of extracted content into Cue layouts (title/bullets, two-column, etc.)
- AI-generated teleprompter notes for the slide
- Before/after diff UI showing original paste vs AI-improved version
- Optional: User can skip AI improvement and keep raw image

**Key Architecture Insight:** This phase is essentially "document analysis for single-image slides" - the same pattern Phase 44 uses for PDF/DOCX resources, but optimized for single slide images. The existing `analyzeDocument()` and structured output patterns are directly applicable.

**Primary recommendation:** Extend existing `AIProviderInterface` with `analyzePastedSlide()` method that takes base64 image, returns structured Slide object. Follow Phase 44's vision API patterns for both Gemini and Claude. Use react-diff-viewer-continued (already installed) for before/after comparison.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @google/genai | ^1.30.0 | Gemini API with vision | Already installed; native multimodal architecture excels at image understanding; supports responseSchema for structured output |
| Anthropic Claude API | (direct fetch) | Claude vision via Messages API | Already integrated; excellent for text extraction from images; uses tool_choice for structured responses |
| react-diff-viewer-continued | ^3.4.0 | Before/after slide comparison | Already installed and used in EnhancementPanel (Phase 46); proven UI pattern for showing AI changes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pdf.js | 3.11.174 (CDN) | Image rendering utilities | Already available; reuse canvas utilities if needed for image preprocessing |
| React 19 | ^19.2.0 | Async state management | Built-in useTransition for loading states; already in use throughout app |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `analyzePastedSlide()` method | Reuse `analyzeDocument()` directly | analyzePastedSlide is semantically clearer and can optimize for single-image case; analyzeDocument expects multi-page documents |
| Inline prompts | Separate prompts file | Single-slide analysis is simple enough for inline prompts; separate file if prompts exceed ~50 lines |
| Custom diff component | react-diff-viewer-continued | react-diff-viewer is already installed, tested, and working in Phase 46; no need to build custom |

**Installation:**
```bash
# No new dependencies needed - all libraries already installed
```

## Architecture Patterns

### Existing Pattern: Vision API Usage (from Phase 44)

**Codebase Location:** `services/documentAnalysis/documentAnalysisService.ts`, `services/providers/geminiProvider.ts`, `services/providers/claudeProvider.ts`

The app already implements vision API calls for document analysis. Phase 56 reuses this pattern:

**Gemini Vision Pattern (from geminiProvider.ts line 301-340):**
```typescript
// Build multimodal content parts
const parts: any[] = [
  { text: buildAnalysisUserPrompt(...) }
];

// Add images (base64, no data URL prefix)
for (const img of documentImages) {
  parts.push({
    inlineData: { mimeType: 'image/jpeg', data: img }
  });
}

// Call with responseSchema for structured output
const result = await ai.generateContent({
  systemInstruction: SYSTEM_PROMPT,
  contents: [{ role: 'user', parts }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: ANALYSIS_SCHEMA
  }
});
```

**Claude Vision Pattern (from claudeProvider.ts line 1591-1630):**
```typescript
// Build message content with text and images
const content: any[] = [
  { type: 'text', text: buildAnalysisUserPrompt(...) }
];

// Add images (base64 in image blocks)
for (const img of documentImages) {
  content.push({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data: img }
  });
}

// Call API with structured output via tool use
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': this.apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    model: this.modelName,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: 'analyze_document' }
  })
});
```

### Pattern 1: Async Slide Processing Flow

**What:** Multi-stage async flow for paste → image → AI analysis → improved slide

**When to use:** Any user-initiated paste that needs AI processing

**Flow Stages:**
1. **Immediate**: Create placeholder slide with loading indicator
2. **Image Available**: Convert imageBlob to base64, show raw image
3. **AI Processing**: Call vision API, show "Analyzing..." state
4. **Complete**: Replace with AI-improved slide, offer diff view

**Example (extending App.tsx handlePasteSlide):**
```typescript
// Source: Phase 55 implementation in App.tsx line 896-960
const handlePasteSlide = useCallback(async (result: PasteResult) => {
  // Stage 1: Immediate placeholder
  const tempSlide: Slide = {
    id: `paste-${Date.now()}`,
    title: "Pasting...",
    content: ["Processing clipboard content..."],
    speakerNotes: "",
    imagePrompt: "",
    isGeneratingImage: true, // Loading indicator
    layout: 'split',
    source: { type: 'pasted', pastedAt: new Date().toISOString() },
  };

  // Insert and show immediately
  const newSlides = [...slides];
  newSlides.splice(insertIndex + 1, 0, tempSlide);
  setSlides(newSlides);

  try {
    // Stage 2: Process image blob
    if (result.imageBlob) {
      const base64 = await blobToBase64(result.imageBlob);
      const rawImageUrl = `data:image/png;base64,${base64}`;

      // Stage 3: AI analysis (Phase 56 adds this)
      const aiSlide = await provider.analyzePastedSlide(
        base64.split(',')[1], // Remove data URL prefix
        settings.verbosity
      );

      // Stage 4: Replace with AI result
      const finalSlide: Slide = {
        ...aiSlide,
        id: tempSlide.id,
        source: { type: 'pasted', pastedAt: tempSlide.source.pastedAt },
        // Store original for before/after diff
        originalPastedImage: rawImageUrl
      };

      updateSlideAtIndex(insertIndex + 1, finalSlide);
    }
  } catch (error) {
    // Error handling: keep placeholder, show error
    handleError('Paste Failed', error.message);
  }
}, [slides, insertIndex, provider, settings.verbosity]);
```

### Pattern 2: Loading States for AI Operations

**What:** Mutually exclusive state types for AI async operations

**Why:** Avoids impossible states like `isLoading=true AND hasError=true`

**Pattern (from React 2026 best practices):**
```typescript
type AIAnalysisState =
  | { status: 'idle' }
  | { status: 'analyzing'; progress?: string }
  | { status: 'complete'; slide: Slide; originalImage: string }
  | { status: 'error'; error: Error };

// Usage in component
const [analysisState, setAnalysisState] = useState<AIAnalysisState>({ status: 'idle' });

// Render based on state
{analysisState.status === 'analyzing' && (
  <div className="analyzing-indicator">
    Analyzing slide content... {analysisState.progress}
  </div>
)}
```

### Pattern 3: Before/After Diff UI

**What:** Show original vs AI-improved content side-by-side

**Existing Implementation:** `components/EnhancementPanel.tsx` line 1-100+

**Pattern:**
```typescript
// Source: EnhancementPanel.tsx line 2, 86
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

const [showDiff, setShowDiff] = useState(false);

// Toggle between edit view and diff view
{showDiff ? (
  <ReactDiffViewer
    oldValue={originalContent}
    newValue={aiImprovedContent}
    splitView={true}
    compareMethod={DiffMethod.WORDS}
    leftTitle="Pasted Content"
    rightTitle="AI-Improved"
  />
) : (
  <div className="preview">{aiImprovedContent}</div>
)}
```

### Pattern 4: Optional AI Skip

**What:** Let users bypass AI improvement and keep raw paste

**Implementation:**
```typescript
// Add "Skip AI" option during analysis
const handleSkipAI = () => {
  // Keep raw image as full-image layout
  const rawSlide: Slide = {
    id: tempSlide.id,
    title: "Pasted Slide",
    content: [],
    speakerNotes: "",
    imagePrompt: "",
    imageUrl: rawImageDataUrl,
    layout: 'full-image',
    source: { type: 'pasted', pastedAt: new Date().toISOString() }
  };

  updateSlideAtIndex(slideIndex, rawSlide);
};
```

### Anti-Patterns to Avoid

- **Don't create new AI provider infrastructure:** Reuse existing `AIProviderInterface` and provider implementations. Just add one new method.
- **Don't fetch images from data URLs:** Vision APIs expect base64 strings without the `data:image/...;base64,` prefix. Strip it before sending.
- **Don't show diff before AI completes:** User needs to see loading state first, then choose to view diff after completion.
- **Don't block paste on AI:** Insert placeholder immediately, run AI async. User shouldn't wait for API.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image diff visualization | Custom side-by-side component | react-diff-viewer-continued | Already installed, tested in Phase 46; handles word-level diffs, syntax highlighting, split/unified views |
| Base64 image encoding | Manual FileReader wrapper | Existing blobToBase64 utility (from Phase 55) | Already implemented and working in handlePasteSlide |
| AI structured output | Prompt engineering + JSON.parse | Gemini responseSchema / Claude tool_choice | Provider APIs guarantee valid JSON; Phase 44 already uses this pattern successfully |
| Vision API calls | Direct fetch to Gemini/Claude | Existing provider methods (extend analyzeDocument pattern) | Error handling, retries, token management already built |
| Loading states | Multiple boolean flags | Discriminated union state type | Prevents impossible states, enables exhaustive switch cases |

**Key insight:** Phase 56 is 80% code reuse from Phase 44 (vision APIs) and Phase 46 (diff UI). The only new code is the prompt for slide transformation and the UI flow connecting paste → analyze → diff.

## Common Pitfalls

### Pitfall 1: Data URL Prefix in Base64

**What goes wrong:** Sending `data:image/png;base64,iVBORw0KG...` to AI APIs causes errors. APIs expect raw base64.

**Why it happens:** Browser clipboard and FileReader return data URLs with prefix. Easy to forget to strip it.

**How to avoid:**
```typescript
// WRONG
const base64 = await blobToBase64(imageBlob);
await provider.analyzePastedSlide(base64); // ❌ Includes prefix

// RIGHT
const dataUrl = await blobToBase64(imageBlob);
const rawBase64 = dataUrl.split(',')[1]; // Remove "data:image/png;base64,"
await provider.analyzePastedSlide(rawBase64); // ✅ Raw base64 only
```

**Warning signs:** API errors like "Invalid image data" or "Unable to decode base64"

### Pitfall 2: Large Image Token Costs

**What goes wrong:** Sending full-resolution PowerPoint slide images (e.g., 1920x1080) to AI APIs burns tokens and increases latency.

**Why it happens:** PowerPoint copies slides at screen resolution. Claude/Gemini charge per image tokens.

**How to avoid:**
- Resize images before sending if larger than 1568px on long edge (Claude's optimal size)
- Claude: ~1600 tokens for 1092x1092px image
- Gemini: supports up to 3600 images per request, but single slide doesn't need that

**Recommendation:** For single slide paste, don't resize unless user reports slow performance. Optimize later if needed.

**Warning signs:** Slow API responses (>5 seconds), high token usage in provider dashboard

### Pitfall 3: Overwriting User Edits

**What goes wrong:** User pastes slide, AI improves it, user manually edits the AI result, then accidentally triggers re-analysis and loses edits.

**Why it happens:** No tracking of whether slide has been manually modified post-AI.

**How to avoid:**
```typescript
// Track AI completion
const finalSlide: Slide = {
  ...aiSlide,
  source: { type: 'pasted', pastedAt: timestamp },
  // Mark as AI-processed to prevent re-analysis
  aiProcessedAt?: string // ISO timestamp when AI completed
};

// Before re-analyzing, check:
if (slide.source?.type === 'pasted' && slide.aiProcessedAt) {
  // Already processed - don't re-run AI unless user explicitly requests
  return;
}
```

**Warning signs:** User complaints about lost edits, confusion about slide content changing unexpectedly

### Pitfall 4: No Escape Hatch for Bad AI Results

**What goes wrong:** AI misinterprets slide, generates wrong layout/content. User can't revert to raw image.

**Why it happens:** No UI to reject AI improvement and keep original paste.

**How to avoid:**
- Store `originalPastedImage` in slide metadata
- Provide "Revert to Original Image" button in slide edit menu
- Show diff view so user can see what AI changed before accepting

**Verification:** Add test case where user rejects AI improvement and successfully reverts to original image.

**Warning signs:** User frustration in testing, requests to "undo AI changes"

### Pitfall 5: Gemini vs Claude Prompt Incompatibility

**What goes wrong:** Prompt written for Gemini's responseSchema fails with Claude's tool_choice structure, or vice versa.

**Why it happens:** Gemini uses JSON schema directly; Claude uses tools array with input_schema.

**How to avoid:**
```typescript
// GEMINI PATTERN (responseSchema)
const GEMINI_SLIDE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    content: { type: Type.ARRAY, items: { type: Type.STRING } },
    speakerNotes: { type: Type.STRING },
    // ...
  },
  required: ['title', 'content', 'speakerNotes']
};

// CLAUDE PATTERN (tool with input_schema)
const CLAUDE_SLIDE_TOOL = {
  name: 'create_slide',
  description: 'Transform pasted slide content into Cue format',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Slide title' },
      content: {
        type: 'array',
        items: { type: 'string' },
        description: 'Bullet points'
      },
      // ...
    },
    required: ['title', 'content', 'speakerNotes']
  }
};
```

**Recommendation:** Keep schemas in sync. Use TypeScript interface as source of truth, generate both schemas from it.

**Warning signs:** One provider works, other fails with schema validation errors

## Code Examples

### Vision API Text Extraction

Verified pattern from Phase 44 implementation:

```typescript
// Source: services/providers/geminiProvider.ts line 301-340
// GEMINI VISION CALL
async analyzePastedSlide(
  imageBase64: string, // Raw base64, no data URL prefix
  verbosity: VerbosityLevel = 'standard'
): Promise<Slide> {
  const ai = new GoogleGenAI({ apiKey: this.apiKey });

  const parts = [
    { text: buildSlideAnalysisPrompt(verbosity) },
    { inlineData: { mimeType: 'image/png', data: imageBase64 } }
  ];

  const result = await ai.generateContent({
    systemInstruction: SLIDE_ANALYSIS_SYSTEM_PROMPT,
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SLIDE_SCHEMA,
      temperature: 0.7
    }
  });

  const text = result.response.text();
  const slide = JSON.parse(text);

  return {
    id: '', // Caller provides
    ...slide,
    source: { type: 'pasted', pastedAt: new Date().toISOString() }
  };
}

// Source: services/providers/claudeProvider.ts line 1591-1630
// CLAUDE VISION CALL
async analyzePastedSlide(
  imageBase64: string,
  verbosity: VerbosityLevel = 'standard'
): Promise<Slide> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: this.modelName,
      max_tokens: 4096,
      system: SLIDE_ANALYSIS_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: buildSlideAnalysisPrompt(verbosity) },
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: imageBase64 }
          }
        ]
      }],
      tools: [SLIDE_CREATION_TOOL],
      tool_choice: { type: 'tool', name: 'create_slide' }
    })
  });

  const data = await response.json();
  const toolUse = data.content.find(c => c.type === 'tool_use');

  return {
    id: '',
    ...toolUse.input,
    source: { type: 'pasted', pastedAt: new Date().toISOString() }
  };
}
```

### Before/After Diff Component

```typescript
// Source: components/EnhancementPanel.tsx line 1-100
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

interface SlideComparisonProps {
  originalImage: string; // Data URL of pasted image
  aiSlide: Slide;
  onAccept: () => void;
  onRevert: () => void;
}

const SlideComparison: React.FC<SlideComparisonProps> = ({
  originalImage,
  aiSlide,
  onAccept,
  onRevert
}) => {
  const [showDiff, setShowDiff] = useState(false);

  // Format slide content for diff display
  const originalText = `[Image Only]\n\nNo text content extracted.`;
  const aiText = `Title: ${aiSlide.title}\n\nContent:\n${aiSlide.content.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nSpeaker Notes:\n${aiSlide.speakerNotes}`;

  return (
    <div className="slide-comparison">
      <div className="comparison-controls">
        <button onClick={() => setShowDiff(!showDiff)}>
          {showDiff ? 'Hide Diff' : 'Show Changes'}
        </button>
        <button onClick={onAccept} className="primary">Accept AI Improvement</button>
        <button onClick={onRevert} className="secondary">Keep Original Image</button>
      </div>

      {showDiff ? (
        <ReactDiffViewer
          oldValue={originalText}
          newValue={aiText}
          splitView={true}
          compareMethod={DiffMethod.WORDS}
          leftTitle="Original Paste (Image)"
          rightTitle="AI-Improved Slide"
          styles={{
            variables: {
              light: {
                diffViewerBackground: '#fff',
                addedBackground: '#e6ffed',
                removedBackground: '#ffeef0'
              }
            }
          }}
        />
      ) : (
        <div className="side-by-side">
          <div className="original">
            <h4>Original Paste</h4>
            <img src={originalImage} alt="Pasted slide" />
          </div>
          <div className="ai-improved">
            <h4>AI-Improved</h4>
            <div className="slide-preview">
              <h3>{aiSlide.title}</h3>
              <ul>
                {aiSlide.content.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Prompt for Slide Transformation

```typescript
// New file: services/prompts/slideAnalysisPrompts.ts
export const SLIDE_ANALYSIS_SYSTEM_PROMPT = `
You are an expert at analyzing presentation slides and transforming them into effective teaching content for Cue (an educational presentation app for Year 6 students, ages 10-11).

Your task: Extract text and visual content from a pasted PowerPoint slide image and restructure it into Cue's format:
- Clear, concise title (10 words max)
- 3-5 bullet points with key concepts
- Teleprompter notes that ADD VALUE (not repeat bullets)
- Appropriate layout choice

LAYOUT SELECTION:
- 'split': Title + bullets with image on right (most common)
- 'full-image': When slide is primarily visual/diagram
- 'center-text': For text-only slides, quotes, or definitions
- 'two-column': For comparisons, before/after, pros/cons

TELEPROMPTER RULES:
- Segment 0: Introduction before any bullet appears
- Segment N: Explain bullet N AFTER student reads it (past tense)
- Use 👉 as delimiter
- Number of segments = bullets + 1
- NEVER preview upcoming bullets
- Add examples, analogies, "why this matters" - don't repeat slide text

CONTENT TRANSFORMATION:
- Simplify technical terms for Year 6 level
- Break long sentences into clear bullet points
- Preserve key vocabulary and concepts
- If image contains diagrams/charts, describe them in speaker notes
`;

export function buildSlideAnalysisPrompt(verbosity: VerbosityLevel): string {
  const verbosityHint = verbosity === 'concise'
    ? 'Keep speaker notes brief (2-3 phrases per segment).'
    : verbosity === 'detailed'
    ? 'Provide detailed speaker notes (3-5 sentences per segment).'
    : 'Standard speaker notes (1-2 sentences per segment).';

  return `
Analyze this pasted slide image and extract:
1. Title text
2. Main content/bullet points
3. Any diagrams, charts, or visual elements (describe in speaker notes)
4. Appropriate layout for Cue

${verbosityHint}

Return a structured slide object following the schema.
`.trim();
}

// JSON Schema for Gemini responseSchema
export const SLIDE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Clear slide title, max 10 words'
    },
    content: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Array of 3-5 bullet points'
    },
    speakerNotes: {
      type: Type.STRING,
      description: 'Teleprompter notes with 👉 delimiters, segments = bullets + 1'
    },
    imagePrompt: {
      type: Type.STRING,
      description: 'Prompt for generating supporting image (if needed)'
    },
    layout: {
      type: Type.STRING,
      enum: ['split', 'full-image', 'center-text', 'two-column'],
      description: 'Best layout for this content'
    },
    theme: {
      type: Type.STRING,
      enum: ['default', 'purple', 'blue', 'green', 'warm'],
      description: 'Color theme based on subject'
    }
  },
  required: ['title', 'content', 'speakerNotes', 'imagePrompt', 'layout', 'theme']
};

// Tool schema for Claude tool_choice
export const SLIDE_CREATION_TOOL = {
  name: 'create_slide',
  description: 'Transform pasted slide content into Cue slide format',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Clear slide title, max 10 words'
      },
      content: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of 3-5 bullet points'
      },
      speakerNotes: {
        type: 'string',
        description: 'Teleprompter notes with 👉 delimiters, segments = bullets + 1'
      },
      imagePrompt: {
        type: 'string',
        description: 'Prompt for generating supporting image (if needed)'
      },
      layout: {
        type: 'string',
        enum: ['split', 'full-image', 'center-text', 'two-column'],
        description: 'Best layout for this content'
      },
      theme: {
        type: 'string',
        enum: ['default', 'purple', 'blue', 'green', 'warm'],
        description: 'Color theme based on subject'
      }
    },
    required: ['title', 'content', 'speakerNotes', 'imagePrompt', 'layout', 'theme']
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline base64 only | Inline base64 + File API + URL sources | Claude 2025-04 | Three ways to provide images; File API for reuse (not needed for single paste) |
| Generic vision prompting | Structured output (responseSchema/tools) | Gemini 2.0 (2025), Claude 3.5 (2024) | Guaranteed valid JSON; no manual parsing; production-ready |
| Text-only AI | Native multimodal (Gemini 2.0+) | Gemini 2.0 (Dec 2025) | Superior vision understanding; single API for text+image |
| Boolean loading states | Discriminated unions | React 19.2 (2025) | Prevents impossible states; exhaustive type checking |

**Deprecated/outdated:**
- **Gemini Pro Vision (separate model):** Merged into Gemini 2.0+ unified models (2025)
- **Claude image base64 only:** Now supports URLs and File API (2025)
- **Manual JSON parsing of AI responses:** Use responseSchema (Gemini) or tool_choice (Claude) for guaranteed structure

## Open Questions

1. **Should we show diff automatically or require user to click "Show Changes"?**
   - What we know: Phase 46 EnhancementPanel defaults to preview mode, diff is opt-in via "Show Diff" toggle
   - What's unclear: Pasted slides might benefit from immediate diff since user expects AI to improve it
   - Recommendation: Start with opt-in (consistent with Phase 46), add user setting later if users request auto-diff

2. **How to handle slides with no extractable text (pure diagrams/images)?**
   - What we know: AI can describe images but might not produce good bullet points
   - What's unclear: Should we skip AI entirely for image-only slides, or generate descriptive content?
   - Recommendation: Run AI analysis; if it returns empty/minimal content (title + 0-1 bullets), offer "Keep as Full-Image Layout" with one-click option

3. **Token cost optimization: Should we resize images before sending to AI?**
   - What we know: Claude recommends 1092x1092px for optimal cost/performance (~1600 tokens, ~$0.0048/image at Opus 4.6 rates)
   - What's unclear: Typical PowerPoint slide dimensions when pasted, whether users notice latency
   - Recommendation: Don't resize in Phase 56; measure token usage and latency in production, optimize in Phase 57 if needed

## Sources

### Primary (HIGH confidence)
- Codebase: `services/documentAnalysis/documentAnalysisService.ts` - Existing vision API implementation (Phase 44)
- Codebase: `services/providers/geminiProvider.ts` lines 301-340 - Gemini vision with responseSchema
- Codebase: `services/providers/claudeProvider.ts` lines 1591-1630 - Claude vision with tool_choice
- Codebase: `components/EnhancementPanel.tsx` - react-diff-viewer-continued usage
- Codebase: `hooks/usePaste.ts` - Paste event handling and imageBlob extraction
- Codebase: `App.tsx` lines 896-960 - handlePasteSlide implementation (Phase 55)
- [Gemini API Image Understanding](https://ai.google.dev/gemini-api/docs/image-understanding) - Official docs, updated Jan-Feb 2026
- [Claude API Vision Docs](https://platform.claude.com/docs/en/build-with-claude/vision) - Official docs, current as of Feb 2026

### Secondary (MEDIUM confidence)
- [Gemini Pro Vision for Image Understanding](https://developers.google.com/learn/pathways/solution-ai-gemini-images) - Google Developers solution pathway
- [Claude Vision for Document Analysis](https://getstream.io/blog/anthropic-claude-visual-reasoning/) - Developer guide (verified against official docs)
- [React 19.2 Async Handling Patterns](https://blog.logrocket.com/react-19-2-the-async-shift/) - LogRocket article on modern async patterns
- [UI Best Practices for Loading States](https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/) - LogRocket guide

### Tertiary (LOW confidence)
- [Gemini 3 Flash vs Claude Sonnet 4.5 Comparison](https://vertu.com/lifestyle/gemini-3-flash-vs-claude-sonnet-4-5-artificial-analysis-reveals-the-winner/) - Third-party benchmark comparison
- [How Senior React Developers Handle Loading States](https://medium.com/@sainudheenp/how-senior-react-developers-handle-loading-states-error-handling-a-complete-guide-ffe9726ad00a) - Medium article (patterns verified against official React docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and proven in production (Phase 44, 46)
- Architecture: HIGH - Reusing existing patterns from Phase 44 (vision APIs) and Phase 46 (diff UI)
- Pitfalls: MEDIUM - Based on common vision API issues and Phase 44 learnings; Phase 56-specific pitfalls will emerge in implementation

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stable APIs, established patterns)

**Key dependencies on prior phases:**
- Phase 44: Document analysis with vision APIs (foundational pattern)
- Phase 46: Diff UI with react-diff-viewer-continued (UI component)
- Phase 55: Paste infrastructure and imageBlob handling (data source)
