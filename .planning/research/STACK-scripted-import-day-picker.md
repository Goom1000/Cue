# Technology Stack: Scripted Import, Day Picker, and Claude Chat Tips

**Project:** Cue -- Scripted Import Milestone
**Researched:** 2026-02-19

---

## Recommended Stack

### Core Framework (no changes)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 19 | UI framework | Already in use. No change. |
| TypeScript | 5.x | Type safety | Already in use. No change. |
| Vite | 6.x | Build tool | Already in use. No change. |
| Tailwind CSS | 4.x | Styling | Already in use. No change. |

### Document Processing (existing, no new deps)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| mammoth.js | (installed) | DOCX text extraction | Already used in `docxProcessor.ts`. The scripted import DOCX upload path reuses this exact processor. Zero new code needed for DOCX-to-text. |

### AI Providers (existing, no new deps)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @google/genai | (installed) | Gemini API for image prompt + layout enhancement | Already used for all AI features. Scripted mode makes one lightweight call per generation. |
| Anthropic SDK | (installed) | Claude API (if teacher uses Claude as provider) | Already used. Same enhancement call pattern. |

### Testing (existing, no new deps)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | (installed) | Unit and integration tests | Already used for `phaseDetector.test.ts`, `detector.test.ts`. Scripted parser tests follow same pattern. |

---

## New Dependencies

**None.**

This milestone requires zero new npm packages. The entire feature set is built with:
- Pure TypeScript regex parsing (no parser generators, no NLP libraries)
- Existing mammoth.js for DOCX processing
- Existing AI provider SDK for image/layout enhancement
- React components with Tailwind styling (standard Cue patterns)

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| DOCX parsing | mammoth.js (existing) | docx-parser, docxtemplater | Already installed and tested. Adding another DOCX library creates confusion about which to use. |
| Scripted text parsing | Custom regex parser | PEG.js, Nearley, Chevrotain | Grammar parsers are overkill for line-oriented cue detection. The format is simple: `CueType: content`. Regex is sufficient, matches existing phaseDetector pattern, and avoids a new dependency. |
| Day splitting | Custom regex | chrono-node (date parsing) | Day headers are structured ("Day 1:", "Monday:") not natural language dates. Regex is more precise and avoids a 200KB dependency. |
| Tips display | Static React component | MDX, Markdown renderer | 4 tips with title+description. A static JSX array is simpler and has zero bundle cost vs. a markdown parser. |

---

## Installation

```bash
# No new packages needed
# Verify existing dependencies are present:
npm ls mammoth
npm ls @google/genai
```

---

## Sources

- `package.json` inspection (existing dependencies)
- `services/documentProcessors/docxProcessor.ts` -- mammoth already in use
- `services/phaseDetection/phaseDetector.ts` -- regex parsing pattern already established
- `services/contentPreservation/detector.ts` -- regex parsing pattern already established
