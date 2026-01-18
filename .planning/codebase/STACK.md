# Technology Stack

**Analysis Date:** 2026-01-18

## Languages

**Primary:**
- TypeScript ~5.8.2 - All application code (`App.tsx`, `index.tsx`, `types.ts`, `services/*.ts`, `components/*.tsx`)

**Secondary:**
- HTML - Entry point template (`index.html`)
- CSS (inline/Tailwind) - Styling via CDN and inline styles

## Runtime

**Environment:**
- Node.js (version not pinned, requires modern ES2022 support)
- Browser-based SPA

**Package Manager:**
- npm
- Lockfile: Missing (no `package-lock.json` in project root)

## Frameworks

**Core:**
- React 19.2.0 - UI framework, functional components with hooks
- Vite 6.2.0 - Build tool and dev server

**Testing:**
- None detected - No test framework configured

**Build/Dev:**
- Vite 6.2.0 - Development server (port 3000), build tooling
- @vitejs/plugin-react 5.0.0 - React plugin for Vite

## Key Dependencies

**Critical:**
- `@google/genai` ^1.30.0 - Google Gemini AI SDK for content and image generation
- `react` ^19.2.0 - Core UI framework
- `react-dom` ^19.2.0 - React DOM renderer

**Infrastructure:**
- `typescript` ~5.8.2 - Type checking
- `@types/node` ^22.14.0 - Node.js type definitions

**CDN-Loaded Libraries (in `index.html`):**
- TailwindCSS (CDN) - Utility-first CSS framework
- PptxGenJS 3.12.0 (CDN) - PowerPoint file generation
- PDF.js 3.11.174 (CDN) - PDF parsing and rendering
- html2pdf.js 0.10.1 (CDN) - HTML to PDF export
- Google Fonts (Fredoka, Poppins) - Typography

## Configuration

**Environment:**
- `.env.local` - Contains `GEMINI_API_KEY`
- Vite loads env via `loadEnv()` and exposes as `process.env.API_KEY` and `process.env.GEMINI_API_KEY`

**Build:**
- `vite.config.ts` - Vite configuration
  - Dev server: port 3000, host 0.0.0.0
  - Path alias: `@` maps to project root
  - Env injection: `GEMINI_API_KEY` exposed to client

**TypeScript:**
- `tsconfig.json` - Compiler configuration
  - Target: ES2022
  - Module: ESNext with bundler resolution
  - JSX: react-jsx
  - Path alias: `@/*` maps to `./*`
  - No emit (Vite handles transpilation)

## Platform Requirements

**Development:**
- Node.js (modern version supporting ES2022)
- npm for package management
- Gemini API key required

**Production:**
- Static SPA hosting (outputs to `dist/`)
- Browser with ES2022 support
- Internet access for CDN resources and Gemini API

---

*Stack analysis: 2026-01-18*
