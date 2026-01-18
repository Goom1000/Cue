# External Integrations

**Analysis Date:** 2026-01-18

## APIs & External Services

**AI/ML:**
- Google Gemini AI - Core AI functionality for all content generation
  - SDK/Client: `@google/genai` package
  - Auth: `GEMINI_API_KEY` env var
  - Models Used:
    - `gemini-3-flash-preview` - Text generation (slides, questions, resources, quizzes)
    - `gemini-2.5-flash-image` - Image generation for slides and resources
  - Implementation: `services/geminiService.ts`
  - Features:
    - `generateLessonSlides()` - Transform lesson plans into structured slides with multimodal input (text + images)
    - `generateSlideImage()` - Generate AI artwork for individual slides
    - `generateResourceImage()` - Generate header images for printable resources
    - `generateQuickQuestion()` - Generate oral questions by difficulty (Grade C/B/A)
    - `reviseSlide()` - AI-powered slide editing via natural language
    - `generateContextualSlide()` - Create new slides fitting lesson context
    - `generateExemplarSlide()` - Generate worked example slides
    - `generateLessonResources()` - Create printable worksheets, handouts, quizzes
    - `generateImpromptuQuiz()` - Generate multiple choice quizzes from slide content

## Data Storage

**Databases:**
- None - Application is stateless, no persistence layer

**File Storage:**
- Local filesystem only (via browser File API for PDF upload)
- Browser memory for runtime state (React useState)

**Caching:**
- None - No caching layer implemented

## Authentication & Identity

**Auth Provider:**
- None - No user authentication
- API authentication: Gemini API key stored in `.env.local`

## Monitoring & Observability

**Error Tracking:**
- None - Console logging only (`console.error`)

**Logs:**
- Browser console for error logging
- No structured logging or external log service

## CI/CD & Deployment

**Hosting:**
- Not configured - README indicates local development only
- Static SPA output suitable for any static host (Vercel, Netlify, etc.)

**CI Pipeline:**
- None configured

## Environment Configuration

**Required env vars:**
- `GEMINI_API_KEY` - Google Gemini API key (required for all AI features)

**Secrets location:**
- `.env.local` file (gitignored via `*.local` pattern)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## CDN Dependencies

**Runtime CDN Resources:**
- TailwindCSS: `https://cdn.tailwindcss.com` - CSS framework
- PptxGenJS: `https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js` - PowerPoint export
- PDF.js: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js` - PDF parsing
- PDF.js Worker: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js` - PDF processing worker
- html2pdf.js: `https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js` - HTML to PDF export
- Google Fonts: Fredoka, Poppins font families
- React ESM: `https://aistudiocdn.com/react@^19.2.0` - React via import map (development)

## Third-Party Library Integration

**PptxGenJS (PowerPoint Export):**
- Loaded via CDN script tag
- Accessed via `window.PptxGenJS` global
- Implementation: `services/pptxService.ts`
- Features: Export slides to .pptx format with images, bullets, and speaker notes

**PDF.js (PDF Parsing):**
- Loaded via CDN script tag
- Accessed via `pdfjsLib` global
- Implementation: `App.tsx` (handleFileChange)
- Features: Extract text and render pages as images for multimodal AI analysis

**html2pdf.js (PDF Export):**
- Loaded via CDN script tag
- Used in ResourceHub component for exporting printable resources

---

*Integration audit: 2026-01-18*
