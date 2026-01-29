# Phase 45: Enhancement with Lesson Context - Research

**Researched:** 2026-01-30
**Domain:** AI document enhancement, content differentiation, slide alignment, answer key generation
**Confidence:** HIGH

## Summary

Phase 45 implements AI-powered enhancement of uploaded educational resources with three differentiation levels (simple/standard/detailed), automatic slide alignment detection, and answer key generation. The codebase already has document analysis infrastructure from Phase 44 that extracts document structure, and the multimodal AI providers (Gemini and Claude) support the structured output patterns needed.

The key technical challenge is designing a prompt engineering pipeline that: (1) preserves original content while enhancing, (2) generates three differentiation levels efficiently, (3) auto-detects which lesson slides relate to the resource, and (4) produces answer keys with rubrics for open-ended questions. All this must happen in a cancellable flow with progress indication.

**Primary recommendation:** Create an `enhanceDocument()` method on AIProviderInterface that accepts the document analysis + slide context, returns a structured response with three differentiated versions plus answer keys. Use AbortController for cancellation. Generate all three levels in one API call to reduce latency.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Codebase - DO NOT CHANGE)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @google/genai | ^1.30.0 | Gemini multimodal API | Already integrated, structured output via responseSchema |
| Claude API | claude-sonnet-4 | Claude multimodal API | Already integrated, structured outputs via output_config.format |
| AbortController | Native Web API | Cancel ongoing fetch requests | Built into browsers, no dependency needed |
| React 19 | ^19.2.0 | Component state, effects | Already in codebase |

### No New Dependencies Required
| Library | Reason Not Needed |
|---------|-------------------|
| Streaming libraries | Both providers support native streaming, already implemented |
| Diff libraries | Phase 46 (preview UI) handles visual diff, not this phase |
| Markdown parsers | Resource content stays as structured JSON, rendering is Phase 46 |

**Installation:** None required - all dependencies already present.

## Architecture Patterns

### Recommended Project Structure
```
services/
  documentEnhancement/
    documentEnhancementService.ts   # Orchestrates enhancement pipeline
    enhancementPrompts.ts           # System prompts for enhancement
  aiProvider.ts                      # Add enhanceDocument() method
  providers/
    geminiProvider.ts                # Implement enhanceDocument()
    claudeProvider.ts                # Implement enhanceDocument()
types.ts                             # Add EnhancedResource, DifferentiatedVersion types
```

### Pattern 1: Single-Call Multi-Level Generation
**What:** Generate all three differentiation levels (simple/standard/detailed) in one API call
**When to use:** Always - reduces latency and ensures consistency across levels
**Why:** User decisions from CONTEXT.md specify "Generate all three levels in one operation"
**Example:**
```typescript
// Source: Project requirement + structured output patterns
interface EnhancementResult {
  slideMatches: SlideMatch[];      // Which slides this resource aligns with
  versions: {
    simple: DifferentiatedVersion;
    standard: DifferentiatedVersion;
    detailed: DifferentiatedVersion;
  };
  answerKeys: AnswerKeyResult;
}

// Single call generates all three levels
const result = await provider.enhanceDocument(
  documentAnalysis,
  slideContext,
  gradeLevel,
  options
);
```

### Pattern 2: Slide Alignment Detection
**What:** AI auto-detects which lesson slides the resource relates to before enhancement
**When to use:** First step of enhancement flow, shown to teacher for confirmation
**Example:**
```typescript
// Source: CONTEXT.md decisions - AI auto-detects, teacher confirms
interface SlideMatch {
  slideIndex: number;       // 0-indexed slide number
  slideTitle: string;       // For display in confirmation UI
  relevanceScore: 'high' | 'medium' | 'low';
  reason: string;           // Brief explanation for teacher
}

// Slide context format for AI
function buildSlideContext(slides: Slide[]): string {
  return slides.map((s, i) =>
    `Slide ${i + 1}: "${s.title}"\n${s.content.join('\n')}`
  ).join('\n\n---\n\n');
}
```

### Pattern 3: Preserve-First Enhancement
**What:** Enhancement preserves all original content, only adds/clarifies/simplifies
**When to use:** Default mode per CONTEXT.md "preserve mode default"
**Example:**
```typescript
// Source: CONTEXT.md - ENHANCE-01 preserve mode default
const ENHANCEMENT_SYSTEM_PROMPT = `
You are an expert educational content enhancer. Your task is to enhance worksheets
and resources while PRESERVING all original content.

CRITICAL RULES - PRESERVATION:
1. NEVER remove questions, exercises, or content from the original
2. NEVER change the meaning or factual content
3. NEVER introduce information not supported by the source document
4. Mark any visual content (diagrams, images) with "[Original diagram/image]" placeholder

ENHANCEMENT ACTIONS (what you CAN do):
- Clarify wording (make instructions clearer)
- Fix grammar/spelling errors
- Add slide number references ("See Slide 5")
- Echo terminology from aligned slides
- Simplify vocabulary for Simple level
- Add scaffolding/hints for Detailed level
`;
```

### Pattern 4: AbortController for Cancellation
**What:** Pass AbortSignal to fetch calls to enable user cancellation
**When to use:** All enhancement API calls (ENHANCE-05 requirement)
**Example:**
```typescript
// Source: Web API standard + existing Claude provider pattern
async enhanceDocument(
  documentAnalysis: DocumentAnalysis,
  slideContext: string,
  options: EnhancementOptions,
  signal?: AbortSignal  // NEW: cancellation support
): Promise<EnhancementResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify({ /* ... */ }),
    signal  // Pass through to fetch
  });

  if (!response.ok) {
    throw this.wrapError(/* ... */);
  }

  return response.json();
}

// In component:
const abortController = useRef<AbortController | null>(null);

const handleCancel = () => {
  abortController.current?.abort();
  abortController.current = null;
  setStatus('idle');
};

const handleEnhance = async () => {
  abortController.current = new AbortController();
  try {
    const result = await provider.enhanceDocument(
      analysis,
      slideContext,
      options,
      abortController.current.signal
    );
    // ... handle result
  } catch (error) {
    if (error.name === 'AbortError') {
      // User cancelled - return to pre-enhancement state
      return;
    }
    throw error;
  }
};
```

### Pattern 5: Differentiation Level Definitions
**What:** Clear definitions for what each level produces
**When to use:** Prompt engineering for the three versions
**Example:**
```typescript
// Source: CONTEXT.md decisions
const DIFFERENTIATION_DEFINITIONS = {
  simple: {
    description: 'Reduce text length + simplify vocabulary',
    rules: [
      'Shorter sentences (max 15 words)',
      'Simpler words (Year 4 reading level)',
      'Same exercises/questions as original',
      'Visual scaffolding (bullet points, numbered steps)',
      'Remove complex subordinate clauses'
    ]
  },
  standard: {
    description: 'Light enhancement + lesson alignment',
    rules: [
      'Clean up formatting and clarify wording',
      'Add slide concept references where relevant',
      'Echo terminology from aligned slides',
      'Add "See Slide X" references in header/footer',
      'Year 6 reading level (original target)'
    ]
  },
  detailed: {
    description: 'Extensions + scaffolding + deeper explanations',
    rules: [
      'Add harder/extension questions',
      'Include hints and worked examples',
      'Add reasoning prompts ("Explain why...")',
      'Challenge vocabulary (Year 7-8 level)',
      'Add "Going Further" section if appropriate'
    ]
  }
};
```

### Pattern 6: Answer Key Generation
**What:** Generate answer keys from enhanced versions, with rubrics for open-ended questions
**When to use:** After enhancement is complete (ENHANCE-04 requirement)
**Example:**
```typescript
// Source: CONTEXT.md decisions + LLM grading research
interface AnswerKeyResult {
  // Claude's discretion: unified vs per-level
  structure: 'unified' | 'per-level';
  keys: AnswerKey[];
}

interface AnswerKey {
  level?: 'simple' | 'standard' | 'detailed';  // If per-level
  items: AnswerKeyItem[];
}

interface AnswerKeyItem {
  questionRef: string;        // "Question 1" or "Exercise A, part 2"
  type: 'closed' | 'open-ended';
  // For closed questions (specific answer)
  answer?: string;
  // For open-ended questions (rubric)
  rubric?: {
    criteria: string[];       // What to look for
    exemplar?: string;        // Example good answer
    commonMistakes?: string[]; // What to watch for
  };
}
```

### Anti-Patterns to Avoid
- **Generating levels sequentially:** Three API calls is slower; use single structured output
- **Modifying original questions:** Preserve mode means keep all original exercises
- **Hardcoding slide numbers in prompts:** Pass full slide context, let AI detect alignment
- **Ignoring visual content markers:** Must preserve `[Original diagram]` placeholders from analysis
- **Skipping teacher confirmation of slide matches:** Per CONTEXT.md, teacher reviews before enhancement

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request cancellation | Custom timeout/polling | AbortController | Native API, proper cleanup |
| Structured JSON output | String parsing/regex | Gemini responseSchema / Claude output_config | Guaranteed valid JSON |
| Reading level analysis | Custom vocabulary scoring | AI with level-specific prompts | More nuanced understanding |
| Semantic slide matching | Keyword overlap scoring | AI semantic understanding | Context-aware matching |

**Key insight:** The AI providers already support all needed capabilities (multimodal, structured output, semantic understanding). No new infrastructure required - just prompt engineering and a new `enhanceDocument()` method.

## Common Pitfalls

### Pitfall 1: Token Overflow with Full Slide Context
**What goes wrong:** Sending all 20+ slides + full document analysis exhausts token limit
**Why it happens:** Both inputs are substantial; combined they exceed context window
**How to avoid:**
- Limit slide context to ~10 most relevant slides (based on title/content overlap)
- Truncate slide content to first 3 bullets per slide
- Use separate "slide matching" call before full enhancement if needed
**Warning signs:** 400 errors, truncated responses, missing content in output

### Pitfall 2: Inconsistent Differentiation Across Levels
**What goes wrong:** Simple and detailed versions contradict each other
**Why it happens:** AI generates each level without full context of others
**How to avoid:**
- Generate all three in single call so AI sees relationship
- Include explicit instruction: "Detailed must be superset of Standard content"
- Structure schema to enforce progression
**Warning signs:** Detailed version missing content that's in Simple version

### Pitfall 3: Answer Keys Don't Match Enhanced Questions
**What goes wrong:** Answer key references questions that got modified during enhancement
**Why it happens:** Enhancement step changes question wording, key uses original
**How to avoid:**
- Generate answer keys FROM enhanced versions, not original (per CONTEXT.md)
- Include question text snippets in key items for verification
**Warning signs:** "Question 3" in key doesn't match any question in worksheet

### Pitfall 4: Cancel Not Returning to Pre-Enhancement State
**What goes wrong:** User cancels but partial state lingers in UI
**Why it happens:** AbortError caught but component state not fully reset
**How to avoid:**
- On AbortError, explicitly reset all enhancement-related state
- Clear any partial results in UI
- Return to exactly the state before "Enhance" was clicked
**Warning signs:** "Enhance" button disabled after cancel, partial results visible

### Pitfall 5: Visual Content Lost in Enhancement
**What goes wrong:** Diagrams/images from original document disappear
**Why it happens:** AI doesn't have image generation, tries to describe instead
**How to avoid:**
- Document analysis (Phase 44) flags visual content with `visualContent: true`
- Enhancement prompt explicitly says: "Preserve visual placeholders as [Original diagram: caption]"
- Enhanced output retains position markers for images
**Warning signs:** Enhanced worksheet has no image references, original had diagrams

### Pitfall 6: Slide References Wrong After Reordering
**What goes wrong:** "See Slide 5" references are stale if teacher reordered slides
**Why it happens:** Enhancement uses slide indices at time of generation
**How to avoid:**
- Use slide titles in addition to numbers: "See Slide 5 (Fractions)"
- Store matched slide IDs (not just indices) in enhancement result
- Regeneration clears stale references
**Warning signs:** Slide 5 reference points to unrelated content

## Code Examples

Verified patterns from official sources:

### EnhancementOptions Type Definition
```typescript
// Source: CONTEXT.md requirements + architectural decisions
interface EnhancementOptions {
  preserveMode: boolean;      // true = preserve original, false = allow modification (future)
  generateAnswerKey: boolean; // ENHANCE-04
  gradeLevel: string;         // e.g., "Year 6 (10-11 years old)"
}

interface DifferentiatedVersion {
  level: 'simple' | 'standard' | 'detailed';
  title: string;              // May be enhanced from original
  alignedSlides: number[];    // 1-indexed slide numbers this relates to
  elements: EnhancedElement[];
}

interface EnhancedElement {
  // Mirrors AnalyzedElement from Phase 44, with enhancements
  type: ElementType;
  originalContent: string;    // Preserved from analysis
  enhancedContent: string;    // May differ based on level
  position: number;
  visualContent?: boolean;    // Preserved - signals "don't modify"
  slideReference?: string;    // Added: "See Slide 5 (Fractions)"
}
```

### AIProviderInterface Extension
```typescript
// Source: Existing aiProvider.ts pattern
interface AIProviderInterface {
  // ... existing methods ...

  // Document enhancement for resource improvement (Phase 45)
  enhanceDocument(
    documentAnalysis: DocumentAnalysis,
    slideContext: string,       // Formatted slide content for alignment
    options: EnhancementOptions,
    signal?: AbortSignal        // For cancellation support
  ): Promise<EnhancementResult>;
}
```

### Enhancement System Prompt
```typescript
// Source: CONTEXT.md decisions + educational content research
const ENHANCEMENT_SYSTEM_PROMPT = `
You are an expert educational content enhancer specializing in worksheet differentiation.

TASK: Enhance an educational resource to create three versions (simple/standard/detailed)
while preserving all original content and aligning with lesson slides.

PRESERVATION RULES (CRITICAL - NEVER VIOLATE):
1. Keep ALL original questions, exercises, and tasks
2. Keep ALL factual information unchanged
3. Keep visual content markers as "[Original diagram: description]"
4. Mark any illegible text as "[unclear in original]"

DIFFERENTIATION RULES:
SIMPLE LEVEL:
- Shorter sentences (max 15 words)
- Simpler vocabulary (Year 4 reading level)
- Same exercises as original
- Add visual scaffolding (numbered steps, bullet points)

STANDARD LEVEL:
- Clean formatting, clear wording
- Echo terminology from aligned slides
- Add "See Slide X" references where helpful
- Year 6 reading level

DETAILED LEVEL:
- Add extension questions or "Going Further" section
- Include hints, scaffolding, worked examples
- Add reasoning prompts ("Explain why...", "What would happen if...")
- Challenge vocabulary (Year 7-8 level)
- All Standard content PLUS extensions

SLIDE ALIGNMENT:
- Identify which slides the resource content relates to
- Reference slide numbers in header/footer area
- Echo key terminology and concepts from aligned slides
- Each version clearly shows which slides it aligns with

ANSWER KEY RULES:
- Generate from the ENHANCED versions (not original)
- For closed questions: provide specific answers
- For open-ended questions: provide rubric with criteria, exemplar, common mistakes
- Decision on unified vs per-level key depends on how much content diverges

OUTPUT:
Return valid JSON matching the provided schema.
`;
```

### Gemini Provider Implementation
```typescript
// Source: Existing geminiProvider.ts patterns + Gemini structured output docs
async enhanceDocument(
  documentAnalysis: DocumentAnalysis,
  slideContext: string,
  options: EnhancementOptions,
  signal?: AbortSignal
): Promise<EnhancementResult> {
  const ai = new GoogleGenAI({ apiKey: this.apiKey });

  const userPrompt = buildEnhancementUserPrompt(documentAnalysis, slideContext, options);

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: { parts: [{ text: userPrompt }] },
    config: {
      systemInstruction: ENHANCEMENT_SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: ENHANCEMENT_RESULT_SCHEMA,
      temperature: 0.3  // Some creativity for enhancements, but consistent
    }
  }, { signal });  // Pass abort signal

  const text = response.text || '{}';
  return JSON.parse(text) as EnhancementResult;
}
```

### Claude Provider Implementation
```typescript
// Source: Existing claudeProvider.ts patterns + Claude structured outputs docs
async enhanceDocument(
  documentAnalysis: DocumentAnalysis,
  slideContext: string,
  options: EnhancementOptions,
  signal?: AbortSignal
): Promise<EnhancementResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,  // Enhancement output is substantial
      system: ENHANCEMENT_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: buildEnhancementUserPrompt(documentAnalysis, slideContext, options)
      }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: ENHANCEMENT_RESULT_JSON_SCHEMA
        }
      }
    }),
    signal  // Pass abort signal for cancellation
  });

  if (!response.ok) {
    throw this.wrapError(/* ... */);
  }

  const data = await response.json();
  return JSON.parse(data.content[0].text) as EnhancementResult;
}
```

### Cancellation in React Component
```typescript
// Source: AbortController Web API + React patterns
function EnhancementPanel({ analysis, slides, provider }) {
  const [status, setStatus] = useState<'idle' | 'matching' | 'enhancing' | 'complete'>('idle');
  const [result, setResult] = useState<EnhancementResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleEnhance = async () => {
    abortControllerRef.current = new AbortController();
    setStatus('matching');

    try {
      const slideContext = buildSlideContext(slides);
      const result = await provider.enhanceDocument(
        analysis,
        slideContext,
        { preserveMode: true, generateAnswerKey: true, gradeLevel: 'Year 6' },
        abortControllerRef.current.signal
      );

      setResult(result);
      setStatus('complete');
    } catch (error) {
      if (error.name === 'AbortError') {
        // User cancelled - return to pre-enhancement state (ENHANCE-05)
        setStatus('idle');
        setResult(null);
        return;
      }
      // Handle other errors
      throw error;
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleRegenerate = () => {
    // ENHANCE-06: Clear result and restart
    setResult(null);
    handleEnhance();
  };

  // ... render
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual worksheet differentiation | AI generates 3 levels automatically | 2024-2025 | Teacher time savings of 5-10 hours/week |
| Keyword matching for alignment | Semantic understanding via LLMs | 2023-2024 | More accurate slide-resource matching |
| Generic difficulty levels | Bloom's taxonomy-based differentiation | Educational best practice | Pedagogically sound difficulty progression |
| Manual answer key creation | LLM with rubric generation | 2024-2025 | Consistent marking criteria |

**Current best practices:**
- Use LLMs for semantic understanding of content alignment, not keyword matching
- Generate all differentiation levels in single call for consistency
- Preserve original content in "preserve mode" to prevent hallucination
- Use structured outputs for guaranteed schema compliance
- AbortController for user-friendly cancellation

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal max_tokens for enhancement output**
   - What we know: 8192 tokens should cover most worksheets with 3 levels + answer key
   - What's unclear: Very large worksheets (10+ pages) may need higher limit
   - Recommendation: Start with 8192, add error handling for max_tokens reached

2. **Answer key structure decision**
   - What we know: CONTEXT.md says "Claude's discretion on unified vs per-level"
   - What's unclear: How AI should decide this
   - Recommendation: Prompt says "If Simple and Detailed have significantly different questions, use per-level; otherwise unified"

3. **Progress indication granularity**
   - What we know: CONTEXT.md says "Simple progress bar during processing"
   - What's unclear: Whether to show "Matching slides..." vs "Enhancing..." stages
   - Recommendation: Two stages: "Analyzing alignment..." then "Generating enhanced versions..."

4. **Handling very long slide decks (30+ slides)**
   - What we know: Full context of 30 slides may exceed token limits
   - What's unclear: Best truncation strategy
   - Recommendation: Pass first 15 slides + sampled remaining, or use title-only for distant slides

## Sources

### Primary (HIGH confidence)
- [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - JSON schema enforcement, output_config.format syntax
- [Gemini Structured Outputs](https://ai.google.dev/gemini-api/docs/json-mode) - responseSchema, responseMimeType patterns
- Existing codebase: `services/providers/geminiProvider.ts`, `services/providers/claudeProvider.ts` - multimodal + structured output patterns
- Existing codebase: `services/documentAnalysis/documentAnalysisService.ts` - document analysis pipeline

### Secondary (MEDIUM confidence)
- [AbortController MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) - Native cancellation API
- [arxiv: Educational Content Differentiation with LLMs](https://arxiv.org/html/2406.12787v1) - Leveled text generation research
- [Oxford Academic: LLM Grading with Rubrics](https://academic.oup.com/bioinformatics/article/41/Supplement_1/i21/8199383) - Answer key/rubric generation patterns

### Tertiary (LOW confidence)
- WebSearch results on AI differentiation tools (Diffit, MagicSchool AI) - market patterns
- WebSearch results on semantic text matching - NLP approaches

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing AI infrastructure, no new dependencies
- Architecture: HIGH - Extends established AIProviderInterface pattern
- Differentiation prompts: MEDIUM - Educational best practices, needs iteration
- Answer key generation: MEDIUM - Rubric patterns from research, needs validation
- Cancellation: HIGH - Standard AbortController pattern

**Research date:** 2026-01-30
**Valid until:** 2026-03-01 (60 days - Claude/Gemini APIs stable, prompt patterns may need tuning)
