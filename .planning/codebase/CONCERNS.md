# Codebase Concerns

**Analysis Date:** 2026-01-18

## Tech Debt

**Monolithic App.tsx Component:**
- Issue: `App.tsx` (582 lines) contains all primary application state, business logic, and UI rendering in a single component with 13+ useState hooks
- Files: `App.tsx`
- Impact: Difficult to maintain, test, and reason about. State management becomes unwieldy. High cognitive load for modifications.
- Fix approach: Extract state into custom hooks (e.g., `useSlideManager`, `usePdfProcessor`). Split into smaller presentation components. Consider state management solution for complex app state.

**Any Types Throughout Codebase:**
- Issue: Extensive use of `any` type bypasses TypeScript safety
- Files:
  - `services/geminiService.ts` (lines 46, 84, 89, 117, 354)
  - `App.tsx` (lines 17, 111, 154)
  - `components/ResourceHub.tsx` (lines 210, 211)
  - `components/SlideCard.tsx` (line 82)
  - `types.ts` (line 43)
- Impact: Loss of type safety, potential runtime errors, IDE autocomplete degradation
- Fix approach: Create proper TypeScript interfaces for Gemini API responses, PDF.js types, PptxGenJS, and html2pdf. Use `unknown` with type guards where necessary.

**Global External Library Declarations:**
- Issue: External libraries (pdfjsLib, PptxGenJS, html2pdf) are declared globally via `any` or ambient declarations
- Files: `types.ts`, `App.tsx` (line 17)
- Impact: No IntelliSense, no type checking, potential undefined access errors
- Fix approach: Install @types packages where available or create proper type definitions. Consider npm-installed versions instead of CDN scripts.

**PresentationView.tsx Complexity:**
- Issue: `PresentationView.tsx` (543 lines) handles presentation logic, student window portal, quiz overlay, and UI all in one file with 15+ hooks
- Files: `components/PresentationView.tsx`
- Impact: Hard to test individual features, difficult to modify without side effects
- Fix approach: Extract `QuizOverlay` to separate file. Extract `StudentWindow` to separate file. Create `usePresentationNavigation` hook.

**Inline Component Definition:**
- Issue: `InsertPoint` component defined inside `App.tsx` re-creates on every render
- Files: `App.tsx` (lines 20-56)
- Impact: Unnecessary re-renders, potential performance issues
- Fix approach: Move `InsertPoint` to `components/InsertPoint.tsx` as standalone component

## Known Bugs

**Unused Dashboard Component:**
- Symptoms: `Dashboard.tsx` exists but appears to be empty/unused
- Files: `components/Dashboard.tsx`
- Trigger: N/A - dead code
- Workaround: None needed
- Impact: Code bloat, potential confusion for developers

**Missing Event Handler Dependency:**
- Symptoms: `useEffect` for keyboard handlers recreates functions but dependencies may be stale
- Files: `components/PresentationView.tsx` (lines 382-390)
- Trigger: Rapid keyboard navigation may use stale closure values
- Workaround: Works in most cases
- Impact: Potential navigation bugs in edge cases

## Security Considerations

**API Key Exposure Risk:**
- Risk: API key is bundled into client-side JavaScript via Vite's `define` config
- Files: `vite.config.ts` (lines 13-15), `.env.local`
- Current mitigation: Uses `.env.local` which is gitignored
- Recommendations:
  1. Move API calls to backend/serverless function
  2. Add API key rotation policy
  3. Implement rate limiting on backend

**Unvalidated AI Responses:**
- Risk: AI-generated JSON is parsed directly without schema validation beyond Gemini's response schema
- Files: `services/geminiService.ts` (lines 83, 214, 243, 287, 353, 427)
- Current mitigation: Relies on Gemini's `responseSchema` config
- Recommendations: Add runtime validation with Zod or similar before using parsed data

**XSS Potential in Markdown Rendering:**
- Risk: `parseMarkdown` function uses `dangerouslySetInnerHTML` with AI-generated content
- Files: `components/ResourceHub.tsx` (line 328)
- Current mitigation: Basic regex replacement, but no sanitization library
- Recommendations: Use DOMPurify to sanitize HTML output before rendering

**PDF Processing Without Validation:**
- Risk: PDF files are processed client-side without content validation
- Files: `App.tsx` (lines 82-132)
- Current mitigation: Basic MIME type check for `application/pdf`
- Recommendations: Add file size limits, consider server-side processing for sensitive deployments

## Performance Bottlenecks

**Synchronous Image Generation Loop:**
- Problem: When `autoGenerateImages` is true, all slide images are generated concurrently with no throttling
- Files: `App.tsx` (lines 147-153)
- Cause: `forEach` with async callbacks does not await, causing API request burst
- Improvement path: Use `Promise.all` with chunking (e.g., 2-3 concurrent), add queue system, or sequential processing with visual progress

**Student Window Style Copying:**
- Problem: Iterates through all document stylesheets and copies rules on every StudentWindow open
- Files: `components/PresentationView.tsx` (lines 19-34)
- Cause: Synchronous iteration over potentially large stylesheet collections
- Improvement path: Cache computed styles, use CSS-in-JS that handles portal styles automatically

**Large Component Re-renders:**
- Problem: State changes in App.tsx trigger re-renders of entire component tree
- Files: `App.tsx`
- Cause: Lack of state isolation, no memoization strategy
- Improvement path: Extract state to hooks, use React.memo on child components, consider context splitting

## Fragile Areas

**Speaker Notes Parsing Logic:**
- Files: `components/PresentationView.tsx` (lines 330-363)
- Why fragile: Complex string manipulation with multiple regex replacements, hardcoded delimiters ("👉"), assumptions about AI output format
- Safe modification: Add comprehensive unit tests before changing. Ensure delimiter constant is shared with Gemini prompts.
- Test coverage: None detected

**Markdown Parser in ResourceHub:**
- Files: `components/ResourceHub.tsx` (lines 37-101)
- Why fragile: Custom regex-based markdown parser, order of replacements matters, edge cases likely exist
- Safe modification: Consider replacing with established library (marked, react-markdown). Add unit tests for common markdown patterns.
- Test coverage: None detected

**Slide Layout Switching:**
- Files: `components/SlideRenderers.tsx` (lines 335-348)
- Why fragile: Each layout component has different props handling, no shared interface enforcement
- Safe modification: Create layout component interface, add Storybook or visual regression tests
- Test coverage: None detected

**PDF Page Processing:**
- Files: `App.tsx` (lines 95-125)
- Why fragile: Relies on pdf.js CDN version, hardcoded page limit (5), canvas rendering assumptions
- Safe modification: Pin pdf.js version, add error boundaries, make page limit configurable
- Test coverage: None detected

## Scaling Limits

**PDF Page Processing Limit:**
- Current capacity: 5 pages processed
- Limit: Longer documents are truncated
- Scaling path: Implement pagination, background processing, or server-side PDF extraction

**Slide Context for AI:**
- Current capacity: 3000 characters for lesson text and slide context in resource generation
- Limit: Large lessons lose context
- Scaling path: Implement smart truncation, summarization, or chunked processing

**Client-Side Everything:**
- Current capacity: Small to medium lesson sizes
- Limit: Large PDFs, many slides, or slow connections cause poor UX
- Scaling path: Move heavy processing (PDF, image generation) to backend

## Dependencies at Risk

**CDN-Loaded Libraries:**
- Risk: No version pinning, CDN availability dependency, no integrity hashes
- Files: `index.html` (lines 8, 26-28, 68-78)
- Impact: Breaking changes, CDN outages, security vulnerabilities
- Migration plan: Install via npm, bundle with Vite, add SRI hashes if keeping CDN

**Preview Model Usage:**
- Risk: Using `gemini-3-flash-preview` and `gemini-2.5-flash-image` models
- Files: `services/geminiService.ts` (lines 11, 99, 136, 167, 200, 219, 248, 297, 378)
- Impact: Preview models may change or be deprecated
- Migration plan: Monitor Gemini API changelog, have fallback to stable model versions

## Missing Critical Features

**No Authentication:**
- Problem: No user authentication or session management
- Blocks: Multi-user deployment, saved lessons, cloud sync

**No Offline Support:**
- Problem: Requires constant network for AI features
- Blocks: Use in low-connectivity classrooms

**No Error Boundaries:**
- Problem: Unhandled errors crash entire app
- Blocks: Production reliability

**No Undo/Redo:**
- Problem: Destructive edits cannot be reversed
- Blocks: User confidence in editing

## Test Coverage Gaps

**No Test Files Detected:**
- What's not tested: Entire codebase
- Files: All `.ts` and `.tsx` files
- Risk: Regressions introduced silently, refactoring is dangerous
- Priority: High

**Critical Paths Needing Tests:**
- Slide generation and parsing (`services/geminiService.ts`)
- PDF text extraction (`App.tsx` PDF handling)
- Presentation navigation (`components/PresentationView.tsx`)
- Export functionality (`services/pptxService.ts`)
- Markdown parsing (`components/ResourceHub.tsx`)

---

*Concerns audit: 2026-01-18*
