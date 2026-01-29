---
phase: 44-ai-document-analysis
plan: 01
subsystem: ai-services
tags: [document-analysis, multimodal-ai, structured-output, gemini, claude]
dependency-graph:
  requires: [43-types-and-file-upload]
  provides: [document-analysis-foundation, ai-provider-extension]
  affects: [45-enhancement]
tech-stack:
  added: []
  patterns: [structured-output, multimodal-vision, pdf-rendering]
key-files:
  created:
    - services/documentAnalysis/analysisPrompts.ts
    - services/documentAnalysis/documentAnalysisService.ts
  modified:
    - types.ts
    - services/aiProvider.ts
    - services/providers/geminiProvider.ts
    - services/providers/claudeProvider.ts
decisions:
  - id: DEC-44-01
    title: "Structured output approach differs by provider"
    choice: "Gemini uses responseSchema, Claude uses tool_choice"
    reason: "Each provider has different native structured output mechanisms"
metrics:
  duration: ~4 minutes
  completed: 2026-01-29
---

# Phase 44 Plan 01: Document Analysis Foundation Summary

**One-liner:** AI document analysis with multimodal vision using Gemini structured output and Claude tool_choice patterns.

## What Was Built

### 1. Document Analysis Types (types.ts)

Added comprehensive type definitions for document structure detection:

- `DocumentClassification`: worksheet | handout | quiz | activity | assessment | other
- `ConfidenceLevel`: high | medium | low
- `ElementType`: 11 structural element types (header, question, table, diagram, etc.)
- `AnalyzedElement`: Individual detected element with position, content, visual flag
- `DocumentAnalysis`: Complete analysis result with classification, metadata, and elements

### 2. Analysis Prompts (services/documentAnalysis/analysisPrompts.ts)

Created AI prompts for document understanding:

- `DOCUMENT_ANALYSIS_SYSTEM_PROMPT`: Classification rules, element detection guidelines, output requirements
- `buildAnalysisUserPrompt()`: Constructs user prompt with filename, document type, extracted text, page count

### 3. AI Provider Extension (services/aiProvider.ts)

Extended `AIProviderInterface` with new method:

```typescript
analyzeDocument(
  documentImages: string[],   // Base64 images (pages or single image)
  documentText: string,       // Extracted text
  documentType: 'pdf' | 'image' | 'docx',
  filename: string,
  pageCount: number
): Promise<DocumentAnalysis>;
```

### 4. Gemini Implementation (services/providers/geminiProvider.ts)

- Uses `@google/genai` SDK with structured output schema
- `responseMimeType: 'application/json'` with full JSON schema
- `temperature: 0` for consistent classification
- Limits images to 10 pages for token management

### 5. Claude Implementation (services/providers/claudeProvider.ts)

- Uses `tool_choice` with `document_analysis_result` tool for structured output
- Full JSON schema in `input_schema` with `additionalProperties: false`
- Reuses existing error handling helpers (`getErrorMessage`, `getErrorCode`)

### 6. Analysis Service (services/documentAnalysis/documentAnalysisService.ts)

Orchestration layer providing:

- `analyzeUploadedDocument()`: Main entry point taking UploadedResource + AI provider
- `extractPdfImages()`: Renders PDF pages at scale 1.5 for AI accuracy
- `extractPdfText()`: Extracts text content with page markers
- `overrideDocumentType()`: Helper for user type confirmation
- `AnalysisResult` type with `needsTypeConfirmation` flag for UI flow

## Key Implementation Details

### PDF Processing

```typescript
// Scale 1.5 balances AI accuracy vs token usage
const viewport = page.getViewport({ scale: 1.5 });
// JPEG at 0.8 quality for reasonable base64 size
canvas.toDataURL('image/jpeg', 0.8);
// Strip data URL prefix - APIs expect raw base64
images.push(dataUrl.split(',')[1]);
```

### Type Confirmation Logic

```typescript
const needsTypeConfirmation =
  analysis.documentTypeConfidence !== 'high' ||
  (analysis.alternativeTypes && analysis.alternativeTypes.length > 0);
```

## Commits

| Hash | Message |
|------|---------|
| d9d1c13 | feat(44-01): add DocumentAnalysis types and analysis prompts |
| 81ba9a3 | feat(44-01): add analyzeDocument to AI providers |
| b588597 | feat(44-01): create document analysis service |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 45 (Enhancement)** can now:
- Call `analyzeUploadedDocument()` with any UploadedResource and AI provider
- Receive structured `DocumentAnalysis` with detected type and all elements
- Use `needsTypeConfirmation` to show type selector when AI is uncertain
- Access full element text content for enhancement prompts
- Know which elements have `visualContent: true` for special handling

**Dependencies satisfied:**
- [x] DocumentAnalysis type defined
- [x] Both providers implement analyzeDocument
- [x] PDF image/text extraction working
- [x] Type confirmation flag for UI flow
