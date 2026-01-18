# Architecture

**Analysis Date:** 2025-01-18

## Pattern Overview

**Overall:** Single-Page Application (SPA) with State Machine Pattern

**Key Characteristics:**
- Monolithic React SPA with centralized state in root `App.tsx`
- State machine controls UI transitions via `AppState` enum (INPUT -> PROCESSING_TEXT -> EDITING -> PRESENTING)
- Service layer abstracts AI operations (Gemini API)
- Component-based UI with specialized slide renderers
- No routing library; navigation handled by app state changes

## Layers

**Entry Layer:**
- Purpose: Bootstrap React application
- Location: `index.tsx`, `index.html`
- Contains: ReactDOM render call, HTML shell with CDN dependencies
- Depends on: React, ReactDOM
- Used by: Browser

**Application Layer:**
- Purpose: Central state management and orchestration
- Location: `App.tsx`
- Contains: All application state (slides, UI mode, user preferences), event handlers, orchestration logic
- Depends on: Services layer, Components layer, Types
- Used by: Entry layer

**Services Layer:**
- Purpose: External API integration (AI generation)
- Location: `services/`
- Contains: Gemini API calls for slide/image/quiz generation, PPTX export
- Depends on: `@google/genai` SDK, `types.ts`, browser globals (PptxGenJS)
- Used by: Application layer

**Components Layer:**
- Purpose: Reusable UI elements
- Location: `components/`
- Contains: Presentational components, slide renderers, modals
- Depends on: Types, Services (for callbacks)
- Used by: Application layer

**Types Layer:**
- Purpose: TypeScript interfaces and enums
- Location: `types.ts`
- Contains: `Slide`, `LessonResource`, `LessonPlan`, `AppState` definitions
- Depends on: None
- Used by: All layers

## Data Flow

**Lesson Generation Flow:**

1. User uploads PDF or pastes text in INPUT state (`App.tsx` handles via `handleFileChange`, `setLessonText`)
2. PDF processed client-side via pdf.js; images extracted as base64
3. User clicks "Generate Slideshow" triggering `handleGenerate()`
4. State transitions to PROCESSING_TEXT; `generateLessonSlides()` called from `services/geminiService.ts`
5. Gemini API returns structured JSON (slides array); parsed and stored in `slides` state
6. If `autoGenerateImages` enabled, parallel calls to `generateSlideImage()` for each slide
7. State transitions to EDITING; slides rendered in sidebar + SlideCard workspace

**Presentation Flow:**

1. User clicks "Present" from EDITING state
2. State transitions to PRESENTING
3. `PresentationView.tsx` renders slides with progressive bullet disclosure
4. Keyboard navigation (Arrow keys, Space, Escape) controls reveal/navigation
5. Optional: Student window opened via `window.open()` with portal rendering

**State Management:**
- All state lives in `App.tsx` via `useState` hooks
- State passed down as props to child components
- Callbacks passed down for mutations (`onUpdate`, `onDelete`, `onRevise`)
- No external state library (Redux, Zustand, etc.)

## Key Abstractions

**Slide:**
- Purpose: Core data model for presentation content
- Examples: `types.ts` line 2-14
- Pattern: TypeScript interface with optional fields for layouts/themes

**AppState:**
- Purpose: Finite state machine for UI modes
- Examples: `types.ts` line 33-38
- Pattern: TypeScript enum controlling conditional rendering in `App.tsx`

**Layout Renderers:**
- Purpose: Polymorphic slide rendering based on layout type
- Examples: `components/SlideRenderers.tsx` (DefaultLayout, FullImageLayout, FlowchartLayout, GridLayout, TileOverlapLayout)
- Pattern: Strategy pattern via switch statement in `SlideContentRenderer`

**Service Functions:**
- Purpose: Encapsulate AI API calls with typed returns
- Examples: `services/geminiService.ts` (generateLessonSlides, generateSlideImage, reviseSlide, etc.)
- Pattern: Async functions returning Promises; use Gemini structured output schemas

## Entry Points

**Browser Entry:**
- Location: `index.html`
- Triggers: Direct URL load
- Responsibilities: Load CDN dependencies (Tailwind, fonts, pptxgenjs, pdf.js, html2pdf), mount React app

**React Entry:**
- Location: `index.tsx`
- Triggers: Vite bundler during dev/build
- Responsibilities: Find root element, render `<App />` with StrictMode

**Application Entry:**
- Location: `App.tsx`
- Triggers: React mount
- Responsibilities: Initialize state, render UI based on AppState, handle all user interactions

## Error Handling

**Strategy:** Try-catch with user-facing error messages

**Patterns:**
- API errors caught in service functions, re-thrown with friendly messages
- Component-level error state (`error` useState in App.tsx) displays inline alerts
- Console.error for debugging; no external error tracking
- Fallback UI for failed image generation (placeholder shown)

## Cross-Cutting Concerns

**Logging:** Console-based only (`console.error`, `console.warn`)

**Validation:** Minimal; relies on TypeScript types and Gemini response schemas

**Authentication:** None; API key passed via environment variable (`process.env.API_KEY`)

**Styling:** Tailwind CSS via CDN; dark mode toggled via class-based approach

**External Dependencies:** Loaded via CDN script tags (pptxgenjs, pdf.js, html2pdf, Tailwind)

---

*Architecture analysis: 2025-01-18*
