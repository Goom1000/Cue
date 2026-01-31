# Stack Research: Content Preservation Techniques

**Project:** Cue - Preserve Teacher Content
**Researched:** 2026-02-01
**Mode:** Stack dimension - techniques and patterns
**Confidence:** HIGH (primary techniques verified with Anthropic docs and industry research)

## Executive Summary

The problem of preserving specific questions and activities during AI slide generation is primarily a **prompt engineering challenge**, not a library problem. The existing Cue architecture with PDF.js parsing and Gemini/Claude providers is sufficient. The solution involves:

1. **Pre-extraction** - Detect preservable content before slide generation
2. **Tagged prompting** - Pass preserved content with explicit XML markers
3. **Verbatim instructions** - Prompt patterns that enforce exact reproduction
4. **Post-validation** - Optional fuzzy matching to verify preservation

**No new dependencies required.** This is a prompt and pipeline refinement.

---

## Recommended Techniques

### Technique 1: XML-Tagged Preservation Blocks

Use XML tags to mark content that must appear verbatim. Both Claude and Gemini handle XML tags well for semantic boundaries.

**Why this works:**
- XML tags create "robust context separation" that prevents AI from treating preserved content as editable
- They function as "semantic markers" that Claude specifically interprets well (per Anthropic documentation)
- Provides clear boundaries between editable and non-editable content

**Implementation pattern:**

```typescript
const PRESERVATION_SYSTEM_PROMPT = `
CRITICAL PRESERVATION RULES:

Content inside <preserve> tags MUST appear EXACTLY as written in the output.
- Do NOT paraphrase, summarize, or rephrase preserved content
- Do NOT change wording, punctuation, or capitalization
- Do NOT split preserved content across multiple bullets
- You MAY add context around preserved content
- You MAY assign preserved content to appropriate slides

EXAMPLE:
<preserve type="question">What would happen if we removed all the bees?</preserve>

This question MUST appear verbatim in ONE bullet point. You can add slide context,
but the exact question text must be preserved.
`;
```

**Source confidence:** HIGH
- [Anthropic Claude Documentation - Use XML tags](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) confirms XML tags as semantic markers for content boundaries

---

### Technique 2: Few-Shot Exemplar Pattern

Provide examples showing correct vs incorrect preservation behavior. Research shows few-shot examples are highly effective for format adherence.

**Why this works:**
- LLMs learn format and behavior from examples more reliably than from instructions alone
- "Instruction understanding is a promising alternative paradigm for few-shot learning" with "stronger expressiveness and more stringent constraint capabilities"
- 2-3 examples is the sweet spot (diminishing returns after)

**Implementation pattern:**

```typescript
const PRESERVATION_EXAMPLE = `
EXAMPLE OF CORRECT PRESERVATION:

Input:
<preserve type="question">In pairs, list 5 ways plants depend on animals.</preserve>

CORRECT output bullet:
"In pairs, list 5 ways plants depend on animals."

INCORRECT output bullet (DO NOT DO THIS):
"Working with a partner, brainstorm ways that plants rely on animals."
"List ways plants depend on animals with your partner."
"Think about plant-animal relationships with a classmate."

The CORRECT version preserves the EXACT wording. The incorrect versions paraphrase.
`;
```

**Source confidence:** HIGH
- [PromptHub Few-Shot Guide](https://www.prompthub.us/blog/the-few-shot-prompting-guide) - diminishing returns after 2-3 examples
- [Vanderbilt Research on Prompt Patterns](https://www.dre.vanderbilt.edu/~schmidt/PDF/Prompt_Patterns_for_Structured_Data_Extraction_from_Unstructured_Text.pdf) - modular patterns for extraction

---

### Technique 3: Explicit Instruction Reinforcement

Add preservation instructions in BOTH system prompt AND user prompt for redundancy.

**Why this works:**
- System prompt establishes the behavior as a persistent rule
- User prompt reinforcement activates the rule for the specific content
- Redundancy reduces instruction drift in longer generations

**Implementation pattern:**

```typescript
const PRESERVATION_INSTRUCTIONS = `
VERBATIM PRESERVATION (NON-NEGOTIABLE):

The teacher has marked specific content for preservation. This content represents
their exact pedagogical intent and MUST NOT be modified.

For each <preserve> block:
1. Include the EXACT text in a slide bullet point
2. Do NOT paraphrase, simplify, or "improve" the wording
3. Do NOT split the content across multiple points
4. You MAY place it on the most appropriate slide
5. You MAY add other content around it

VERIFICATION: After generating slides, mentally check:
"Can I find each preserved item EXACTLY as written?"
`;
```

**Source confidence:** HIGH
- [IBM Prompt Engineering Guide 2026](https://www.ibm.com/think/prompt-engineering) - context engineering shapes model interpretation

---

### Technique 4: Structured Output with Preservation Tracking (Optional)

Include preservation tracking in the response schema for post-validation.

**Why this works:**
- Self-reporting creates accountability in the generation process
- Enables automated validation of preservation success
- Surfaces preservation failures for teacher review

**Implementation pattern:**

```typescript
const slideSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    content: { type: Type.ARRAY, items: { type: Type.STRING } },
    preservedItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          originalId: { type: Type.STRING },    // Reference to input
          bulletIndex: { type: Type.INTEGER },  // Which bullet contains it
          preservedExactly: { type: Type.BOOLEAN } // Self-check
        }
      },
      description: "Track which bullets contain preserved content"
    },
    // ... other existing fields
  }
};
```

**Source confidence:** MEDIUM
- This is an adaptation of the "source grounding" pattern from [Google LangExtract](https://github.com/google/langextract)
- Not strictly necessary if prompt techniques alone achieve preservation

---

## Content Detection Patterns

### Heuristic Detection (Recommended)

Detect preservable content using regex and keyword patterns BEFORE sending to AI.

**Why this approach:**
- Simple and reliable for educational content patterns
- No external NLP dependencies
- Can be tuned to teacher feedback
- Runs client-side with no latency

**Implementation:**

```typescript
// Question detection
const QUESTION_PATTERNS = [
  /\?$/,                                    // Ends with question mark
  /^(what|why|how|when|where|who|which)/i, // Question words
  /^(can you|could you|would you)/i,       // Polite questions
  /^(discuss|explain|describe|compare)/i,  // Academic prompts
];

// Activity detection
const ACTIVITY_PATTERNS = [
  /^(in pairs|in groups|with a partner)/i,
  /^(list \d+|name \d+|find \d+)/i,        // Numbered tasks
  /^(draw|write|create|design|make)/i,     // Action verbs
  /^(work with|collaborate|discuss)/i,
];

// Instruction detection
const INSTRUCTION_PATTERNS = [
  /^(step \d+|first|then|next|finally)/i,
  /^(\d+\.|[a-z]\))/,                      // Numbered/lettered lists
  /^(remember|note|important)/i,
];
```

**Detection function:**

```typescript
interface PreservableContent {
  type: 'question' | 'activity' | 'instruction';
  originalText: string;       // Exact text from source
  position: number;           // Order in document
  context?: string;           // Surrounding text for AI context
  markers: {                  // How it was detected
    hasQuestionMark: boolean;
    hasNumbering: boolean;
    hasActionVerb: boolean;
    matchedPattern?: string;
  };
}

function detectPreservableContent(text: string): PreservableContent[] {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const preservable: PreservableContent[] = [];

  lines.forEach((line, index) => {
    const type = detectContentType(line);
    if (type) {
      preservable.push({
        type,
        originalText: line,
        position: index,
        context: getContext(lines, index),
        markers: {
          hasQuestionMark: line.includes('?'),
          hasNumbering: /^\d+\.|\([a-z]\)/.test(line),
          hasActionVerb: ACTIVITY_PATTERNS.some(p => p.test(line)),
          matchedPattern: type
        }
      });
    }
  });

  return preservable;
}
```

**Source confidence:** HIGH
- Pattern-based detection is standard for structured content
- No external research needed - this is established practice

---

## Not Recommended

### 1. External NLP Libraries for Detection

**Options:** spaCy, NLTK, transformer-based classifiers

**Why not:**
- Significant bundle size (spaCy models are 50-500MB)
- Browser compatibility issues (most NLP runs server-side)
- Overkill for pattern detection in educational content
- Simple regex achieves 80-90% accuracy for this use case

### 2. Deterministic Quoting (Full Implementation)

**What it is:** Pattern where LLM outputs reference IDs, then a database lookup retrieves actual text verbatim.

**Why not:**
- Designed for RAG systems where citation accuracy is critical
- For Cue, the source document is already in memory
- Teachers can verify and edit slides post-generation
- Simple post-validation is sufficient for this use case

**Source:** [Deterministic Quoting by Matt Yeung](https://mattyyeung.github.io/deterministic-quoting) - informed this decision

### 3. Fine-Tuning Models

**Why not:**
- Gemini and Claude don't support user fine-tuning
- Prompt engineering achieves the goal without model changes
- Would require maintaining separate models

### 4. Separate "Preservation Mode" Generation

**What it would be:** Generate preserved content separately, then stitch together with normal slides.

**Why not:**
- Loses pedagogical flow and coherence
- Creates awkward transitions between preserved and generated content
- Requires complex merging logic
- Better to have AI understand preservation constraints within normal generation

### 5. Heavy Post-Processing Replacement

**What it would be:** Replace AI output with preserved content after generation using fuzzy matching.

**Why not:**
- Fuzzy matching is fragile and may fail on edge cases
- Can break slide coherence when context is ripped out
- Adds latency
- Light validation is fine; heavy replacement is over-engineering

---

## Validation Strategy (Optional but Recommended)

### Levenshtein Distance for Verification

After generation, verify preserved content appears with high similarity.

**Why this approach:**
- Fast and lightweight
- No new dependencies (fastest-levenshtein already in npm ecosystem)
- Handles minor formatting differences (extra spaces, punctuation)
- Surfaces modifications for teacher review

**Implementation:**

```typescript
import { distance } from 'fastest-levenshtein';

interface ValidationResult {
  preserved: PreservableContent[];
  missing: PreservableContent[];
  modified: { item: PreservableContent; found: string; similarity: number }[];
}

function validatePreservation(
  slides: Slide[],
  preserved: PreservableContent[]
): ValidationResult {
  const allBullets = slides.flatMap(s => s.content);
  const results: ValidationResult = { preserved: [], missing: [], modified: [] };

  for (const item of preserved) {
    const match = findBestMatch(item.originalText, allBullets);

    if (match.similarity >= 0.95) {
      results.preserved.push(item);
    } else if (match.similarity >= 0.7) {
      results.modified.push({ item, found: match.text, similarity: match.similarity });
    } else {
      results.missing.push(item);
    }
  }

  return results;
}

function findBestMatch(target: string, candidates: string[]) {
  let best = { text: '', similarity: 0 };

  for (const candidate of candidates) {
    const maxLen = Math.max(target.length, candidate.length);
    const dist = distance(target.toLowerCase(), candidate.toLowerCase());
    const similarity = 1 - (dist / maxLen);

    if (similarity > best.similarity) {
      best = { text: candidate, similarity };
    }
  }

  return best;
}
```

**UI Feedback:**
- Yellow warning: "1 activity may have been modified"
- Link to original: Show original vs generated for teacher review
- Quick fix: One-click restore original wording

**Source confidence:** MEDIUM
- Fuzzy matching is standard practice
- fastest-levenshtein is well-maintained (~300kb weekly downloads)

---

## Integration with Existing Cue Architecture

### Where Preservation Fits

```
User uploads PDF
        |
        v
PDF.js extracts text + images (EXISTING)
        |
        v
detectPreservableContent(lessonText) (NEW)
        |
        v
GenerationInput + preservedContent (MODIFIED)
        |
        v
buildUserPrompt() with <preserve> tags (NEW)
        |
        v
provider.generateLessonSlides() with updated system prompt (MODIFIED)
        |
        v
validatePreservation() (OPTIONAL NEW)
        |
        v
Slides displayed to user (EXISTING)
```

### Files to Modify

| File | Change |
|------|--------|
| `services/prompts/contentPreservationRules.ts` | NEW - preservation rules for prompts |
| `services/contentPreservation/detector.ts` | NEW - pattern detection |
| `services/contentPreservation/validator.ts` | NEW (optional) - post-gen validation |
| `services/aiProvider.ts` | ADD preservedContent to GenerationInput |
| `services/geminiService.ts` | MODIFY prompts to include preservation |
| `services/providers/claudeProvider.ts` | MODIFY prompts to include preservation |

### Prompt Injection Point

Preservation rules should be injected into the **system instruction** for strongest effect:

```typescript
function getSystemInstructionForMode(
  mode: GenerationMode,
  verbosity: VerbosityLevel,
  gradeLevel: string,
  hasPreservedContent: boolean  // NEW parameter
): string {
  let basePrompt = /* existing logic */;

  if (hasPreservedContent) {
    const preservationRules = getContentPreservationRules();
    basePrompt = `${preservationRules}\n\n${basePrompt}`;
  }

  return basePrompt;
}
```

### User Prompt with Tags

```typescript
function buildUserPrompt(
  input: GenerationInput,
  preservedContent: PreservableContent[]
): string {
  let prompt = `Transform this lesson plan into slides:\n\n`;

  if (preservedContent.length > 0) {
    prompt += `\n--- CONTENT TO PRESERVE VERBATIM ---\n`;
    preservedContent.forEach((item, i) => {
      prompt += `<preserve id="${i}" type="${item.type}">${item.originalText}</preserve>\n`;
    });
    prompt += `--- END PRESERVED CONTENT ---\n\n`;
  }

  prompt += input.lessonText;
  return prompt;
}
```

---

## Summary

| Component | Technique | Complexity | Dependencies |
|-----------|-----------|------------|--------------|
| Content detection | Regex patterns | Low | None |
| Prompt structure | XML tags + few-shot | Low | None |
| Response tracking | Schema extension | Low | None |
| Post-validation | Levenshtein match | Low | fastest-levenshtein (optional) |

**Total estimated effort:** 1-2 days implementation, primarily prompt refinement.

**Key insight:** The existing architecture is well-suited for this feature. The solution is additive prompt engineering, not structural changes.

---

## Sources

### Authoritative Documentation
- [Anthropic Claude Documentation - Use XML tags](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) - XML tag best practices for semantic boundaries

### Industry Research
- [Deterministic Quoting](https://mattyyeung.github.io/deterministic-quoting) - Pattern for guaranteed verbatim quotes (informed architecture decision)
- [Google LangExtract](https://github.com/google/langextract) - Structured extraction with source grounding patterns
- [IBM Prompt Engineering Guide 2026](https://www.ibm.com/think/prompt-engineering) - Context engineering principles
- [Prompt Patterns for Structured Data Extraction (Vanderbilt)](https://www.dre.vanderbilt.edu/~schmidt/PDF/Prompt_Patterns_for_Structured_Data_Extraction_from_Unstructured_Text.pdf) - Academic patterns for extraction

### Best Practices
- [PromptHub Few-Shot Guide](https://www.prompthub.us/blog/the-few-shot-prompting-guide) - Few-shot exemplar best practices (2-3 example sweet spot)
- [XML Tags vs Other Dividers](https://beginswithai.com/xml-tags-vs-other-dividers-in-prompt-quality/) - Comparison of delimiter effectiveness
