# Technology Stack: Clipboard Paste & Deck Cohesion

**Project:** Cue v4.0 - Clipboard Paste & Deck Cohesion Features
**Researched:** 2026-02-02
**Confidence:** HIGH (Clipboard API), HIGH (Deck Cohesion)

## Executive Summary

The new features require **zero new dependencies**. The existing stack already contains everything needed:
- Browser Clipboard API (native) for paste handling
- `@google/genai` ^1.30.0 (already installed) includes embedding support for semantic similarity
- Existing `imageProcessor.ts` pattern for processing pasted images

The only stack change is **leveraging underutilized capabilities** already present.

---

## Feature 1: Clipboard Paste Handling

### Recommended Approach: Native Clipboard API

**No library needed.** Use the browser's native Clipboard API.

| Capability | API | Browser Support | Notes |
|------------|-----|-----------------|-------|
| Paste event listener | `paste` event + `clipboardData` | 96%+ all browsers | Synchronous, well-supported |
| Read images | `clipboardData.files` / `clipboardData.items` | Chrome 66+, Firefox 63+, Safari 13.1+ | Works in paste event context |
| Async clipboard read | `navigator.clipboard.read()` | Chrome 76+, Firefox 127+, Safari 13.1+ | Requires user gesture |
| Read text | `clipboardData.getData('text/plain')` | Universal | Already used in codebase |
| Read HTML | `clipboardData.getData('text/html')` | Universal | PowerPoint copies as HTML |

### Why No Library

1. **Native API is sufficient** - Paste event + clipboardData handles all use cases
2. **Already used in codebase** - `EnhancementPanel.tsx` already uses `e.clipboardData.getData('text/plain')`
3. **No polyfill needed** - Target browsers (modern Chrome, Safari, Firefox) all support required features
4. **No CORS/permissions issues** - Paste event doesn't require `clipboard-read` permission

### Implementation Pattern

```typescript
// Already in codebase pattern (EnhancementPanel.tsx:401-405)
onPaste={(e) => {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  // handle text
}}

// For images (new):
onPaste={(e) => {
  e.preventDefault();
  const items = e.clipboardData.items;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      // Use existing processImage() from imageProcessor.ts
    }
  }
}}

// For HTML (PowerPoint paste):
onPaste={(e) => {
  e.preventDefault();
  const html = e.clipboardData.getData('text/html');
  const text = e.clipboardData.getData('text/plain');
  // Parse HTML for structured content, fall back to text
}}
```

### PowerPoint Clipboard Format

When copying slides from PowerPoint (desktop or web):

| Data Type | Content | Use Case |
|-----------|---------|----------|
| `text/html` | HTML fragment with formatting | Structured content extraction |
| `text/plain` | Plain text fallback | Simple text extraction |
| `image/png` | Screenshot of selection | Visual capture (if available) |

**Key insight:** PowerPoint copies as [CF_HTML format](https://learn.microsoft.com/en-us/windows/win32/dataxchg/html-clipboard-format) which includes `<!--StartFragment-->` markers. Parse the HTML to extract slide content structure.

### Browser Compatibility Notes

| Browser | Paste Event | Image Paste | HTML Paste |
|---------|-------------|-------------|------------|
| Chrome 66+ | Full | Full | Full |
| Firefox 63+ | Full | Full | Full |
| Safari 13.1+ | Full | Full | Full |
| Edge 79+ | Full | Full | Full |

**Security:** Paste events work on any page. No HTTPS requirement. No permission prompts (unlike `navigator.clipboard.read()`).

---

## Feature 2: Deck Cohesion Analysis

### Recommended Approach: Gemini Embeddings

**No new dependency.** Use `@google/genai` (already at ^1.30.0) with `embedContent` API.

| Component | Technology | Status | Notes |
|-----------|------------|--------|-------|
| Embedding Model | `gemini-embedding-001` | Available via existing SDK | 3072 dimensions, MRL-trained |
| Similarity Metric | Cosine similarity | Implement in-app (trivial) | Standard formula |
| SDK Method | `ai.models.embedContent()` | Available in ^1.30.0+ | Supports batch embedding |

### Why Embeddings Over Prompt Engineering

| Approach | Pros | Cons |
|----------|------|------|
| **Embeddings + Cosine** | Deterministic, fast, cacheable, cheap | Requires understanding threshold tuning |
| Prompt-based comparison | Flexible, natural language output | Expensive, slower, non-deterministic |

**Recommendation:** Use embeddings for gap detection (fast, cheap), then use generative AI only to explain detected gaps in natural language.

### Gemini Embedding API Syntax

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "..." });

// Embed lesson plan sections
const lessonEmbeddings = await ai.models.embedContent({
  model: 'gemini-embedding-001',
  contents: lessonPlanSections, // string[]
  config: { taskType: 'SEMANTIC_SIMILARITY' }
});

// Embed slide content
const slideEmbeddings = await ai.models.embedContent({
  model: 'gemini-embedding-001',
  contents: slideContents, // string[]
  config: { taskType: 'SEMANTIC_SIMILARITY' }
});

// Compare using cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (normA * normB);
}
```

### Embedding Model Details

| Property | Value |
|----------|-------|
| Model | `gemini-embedding-001` |
| Default Dimensions | 3072 |
| Reduced Dimensions | 768, 1536 (via `outputDimensionality`) |
| Token Limit | 8K tokens per text |
| Task Types | `SEMANTIC_SIMILARITY`, `RETRIEVAL_DOCUMENT`, `RETRIEVAL_QUERY`, `CLASSIFICATION`, `CLUSTERING` |

**For deck cohesion:** Use `SEMANTIC_SIMILARITY` task type for both lesson plan and slides.

### Cost Considerations

Gemini embeddings are significantly cheaper than generative API calls:
- Embedding: ~1000x cheaper per token than generation
- Batch support: Send multiple texts in one API call
- Cacheable: Embed slides once, re-embed only on changes

---

## What NOT to Add

### Libraries Considered and Rejected

| Library | Why Considered | Why Rejected |
|---------|----------------|--------------|
| `clipboard-polyfill` | Async clipboard polyfill | Not needed - paste event sufficient |
| `sentence-transformers` (Python) | High-quality embeddings | Python-only, Gemini embeddings are sufficient |
| `@xenova/transformers` | Client-side embeddings | 100MB+ model download, Gemini API is simpler |
| `compromise` / `natural` | NLP text parsing | Overkill - AI handles semantic analysis |
| `diff` / `diff-match-patch` | Text diffing | Wrong tool - need semantic, not textual similarity |

### Why Client-Side Embeddings Were Rejected

1. **Model size:** Transformer.js requires downloading 100MB+ models
2. **Latency:** First load would be very slow
3. **Existing infrastructure:** Already have Gemini API key and SDK
4. **Quality:** Gemini embeddings outperform many client-side alternatives (MTEB benchmark leader)

---

## Integration Points

### With Existing Codebase

| New Feature | Integrates With | How |
|-------------|-----------------|-----|
| Image paste | `services/documentProcessors/imageProcessor.ts` | Reuse `processImage()` for pasted images |
| Text/HTML paste | `App.tsx` paste handler pattern | Extend existing textarea paste handling |
| Embeddings | `services/geminiService.ts` | Add `embedContent` calls alongside `generateContent` |
| Cohesion UI | `components/Dashboard.tsx` | Add cohesion panel to editing view |

### File Structure Recommendation

```
services/
  clipboardService.ts          # NEW: Paste event handling, format detection
  cohesionService.ts           # NEW: Embedding generation, similarity calculation
  geminiService.ts             # EXTEND: Add embedContent wrapper
```

---

## Version Requirements

| Package | Current | Required | Change Needed |
|---------|---------|----------|---------------|
| `@google/genai` | ^1.30.0 | ^1.30.0 | None (embedContent available) |
| React | ^19.2.0 | ^19.2.0 | None |
| TypeScript | ~5.8.2 | ~5.8.2 | None |
| Vite | ^6.2.0 | ^6.2.0 | None |

**No package.json changes required.**

---

## Browser Requirements

| Feature | Minimum Browser | Notes |
|---------|-----------------|-------|
| Paste images | Chrome 66, Firefox 63, Safari 13.1 | `clipboardData.items` |
| Paste HTML | Chrome 1, Firefox 1, Safari 4 | `clipboardData.getData()` |
| Async clipboard (optional) | Chrome 76, Firefox 127, Safari 13.1 | Only if implementing paste button |

**Target browsers already meet requirements** - Cue targets modern browsers only.

---

## Sources

**Clipboard API:**
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) - Official documentation
- [MDN Paste Event](https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event) - Event handling
- [web.dev Async Clipboard](https://web.dev/articles/async-clipboard) - Modern clipboard patterns
- [web.dev Paste Images](https://web.dev/patterns/clipboard/paste-images) - Image paste patterns
- [Can I Use Clipboard](https://caniuse.com/clipboard) - Browser compatibility (96.84% global support)
- [Microsoft CF_HTML Format](https://learn.microsoft.com/en-us/windows/win32/dataxchg/html-clipboard-format) - PowerPoint clipboard format

**Gemini Embeddings:**
- [Gemini Embeddings API](https://ai.google.dev/gemini-api/docs/embeddings) - Official documentation
- [@google/genai npm](https://www.npmjs.com/package/@google/genai) - SDK documentation (v1.39.0 latest)
- [Google Developers Blog - Gemini Embedding](https://developers.googleblog.com/en/gemini-embedding-text-model-now-available-gemini-api/) - Model announcement

**Semantic Similarity:**
- [Hugging Face Sentence Similarity](https://huggingface.co/tasks/sentence-similarity) - Task overview
- [IBM Cosine Similarity](https://www.ibm.com/think/topics/cosine-similarity) - Metric explanation
- [Sentence Transformers STS](https://www.sbert.net/docs/sentence_transformer/usage/semantic_textual_similarity.html) - Implementation patterns
