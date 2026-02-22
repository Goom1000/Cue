# Phase 73: Claude Chat Tips - Research

**Researched:** 2026-02-22
**Domain:** Static UI component, clipboard API, shared constants
**Confidence:** HIGH

## Summary

Phase 73 is a straightforward UI phase that creates a static tips page accessible from the landing page. The page shows teachers the supported marker format for scripted lesson plans (so they can use Claude chat to generate Cue-compatible scripts), provides a copyable prompt template, and displays an example lesson plan snippet. The critical technical requirement is that the marker list on the tips page and the parser share a single `SUPPORTED_MARKERS` constant (already exported from `services/scriptedParser/types.ts` at line 138) to prevent drift.

The existing codebase provides all the patterns needed. The app uses Tailwind CSS (CDN), React 19, and Vite. UI follows a modal/overlay pattern for auxiliary pages (SettingsModal, ResourceHub, ShareModal). Toast notifications use the existing `useToast` hook (from `components/Toast.tsx`) with `addToast(message, duration, variant)`. Clipboard copying uses `navigator.clipboard.writeText()` (seen in `PresentationView.tsx` and `ManualPlacementGuide.tsx`). The `SUPPORTED_MARKERS` constant is already exported as `['Write on board', 'Activity', 'Ask', 'Say'] as const` -- the tips page imports and renders this directly. Zero new dependencies required.

The only non-trivial consideration is the HTTPS fallback for clipboard (TIPS-04). The `navigator.clipboard.writeText()` API requires a secure context (HTTPS or localhost). The codebase currently has no fallback -- existing clipboard uses just try/catch with error toast. For the tips page, a `document.execCommand('copy')` fallback using a temporary textarea element is the standard approach for non-HTTPS environments.

**Primary recommendation:** Build `components/ClaudeChatTips.tsx` as a full-screen overlay component (following the SettingsModal/ResourceHub pattern), import `SUPPORTED_MARKERS` from `services/scriptedParser/types.ts`, add a "Claude Chat Tips" link/button on the landing page, and implement copy-to-clipboard with `navigator.clipboard.writeText()` + `document.execCommand('copy')` fallback + toast confirmation.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TIPS-01 | Static tips page accessible from landing page with copyable prompt template for Claude chat | New `ClaudeChatTips.tsx` component rendered as overlay when `showClaudeTips` state is true in App.tsx. Link added to the landing page (AppState.INPUT section). The prompt template is a hardcoded string constant within the component. |
| TIPS-02 | Format specification shows supported markers (Say:, Ask:, Write on board:, Activity:, section headings, Day headers) | Import `SUPPORTED_MARKERS` from `services/scriptedParser/types.ts` for the 4 canonical markers. Section headings (Hook, I Do, We Do, You Do, Plenary) and Day headers (`## Day N`) are hardcoded in the parser regex patterns (not in SUPPORTED_MARKERS). Display all 3 categories: markers, section headings, and day headers. |
| TIPS-03 | Example output snippet demonstrates expected lesson plan structure | A static example lesson plan string embedded in the component, showing all marker types, section headings, and multi-day structure. Rendered in a monospace code block with syntax-like highlighting. |
| TIPS-04 | Copy-to-clipboard with toast feedback and HTTPS fallback | Primary: `navigator.clipboard.writeText(text)` (requires HTTPS/localhost). Fallback: create temporary `<textarea>`, select text, `document.execCommand('copy')`. Toast via `addToast('Copied to clipboard', 2000, 'success')` on success, `addToast('Failed to copy', 2000, 'error')` on failure. Follows existing pattern from `PresentationView.tsx:1237-1240`. |
| TIPS-05 | Shared `SUPPORTED_MARKERS` constant imported by both parser and tips page to prevent drift | `SUPPORTED_MARKERS` is already exported from `services/scriptedParser/types.ts:138` as `['Write on board', 'Activity', 'Ask', 'Say'] as const`. The tips page imports this constant directly. Parser uses `MARKER_PATTERNS` (separate regex array) but both are derived from the same marker set. The tips page renders `SUPPORTED_MARKERS` to show the marker format. |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | Component rendering | Already in project |
| TypeScript | ~5.8.2 | Type safety | Already in project |
| Tailwind CSS | CDN (via index.html) | Styling | Already in project; all components use Tailwind classes |

### Supporting

No supporting libraries needed. This is a static UI component with clipboard interaction.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Full-screen overlay | Modal dialog | Overlay is better for content-heavy reference page; modals are for quick actions. Overlay follows ResourceHub pattern. |
| Static prompt string | External JSON/markdown file | Unnecessary indirection; the prompt template is a single string that changes with the phase. Keep it inline in the component. |
| Custom clipboard utility | `clipboard-polyfill` npm package | Zero new dependencies is a project principle. The execCommand fallback is 10 lines of code. |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure

```
components/
  ClaudeChatTips.tsx       # New: tips page overlay component
services/scriptedParser/
  types.ts                 # Existing: exports SUPPORTED_MARKERS constant (shared)
  scriptedParser.ts        # Existing: uses MARKER_PATTERNS (derived from same marker set)
App.tsx                    # Modified: adds showClaudeTips state + link on landing page
```

### Pattern 1: Overlay Component (follows SettingsModal/ResourceHub)

**What:** Full-screen overlay with backdrop, close button, and scrollable content area.
**When to use:** Auxiliary content pages that replace the main view temporarily.
**Example:**
```typescript
// Source: Existing pattern from SettingsModal, ResourceHub, ShareModal
interface ClaudeChatTipsProps {
  onClose: () => void;
  addToast: (message: string, duration?: number, variant?: 'success' | 'error' | 'info' | 'warning') => void;
}

const ClaudeChatTips: React.FC<ClaudeChatTipsProps> = ({ onClose, addToast }) => {
  // Render full-screen overlay with close button, marker format spec,
  // example snippet, and copy-to-clipboard prompt template button
};
```

### Pattern 2: Shared Constant Import (TIPS-05)

**What:** Tips page imports `SUPPORTED_MARKERS` from the parser types module.
**When to use:** When UI must reflect the same data that the parser uses.
**Example:**
```typescript
// Source: services/scriptedParser/types.ts:138
import { SUPPORTED_MARKERS } from '../services/scriptedParser/types';

// In the component:
// SUPPORTED_MARKERS = ['Write on board', 'Activity', 'Ask', 'Say'] as const
// Render each marker with `: ` suffix to show the format
{SUPPORTED_MARKERS.map(marker => (
  <div key={marker}>
    <code>{marker}:</code> <span>description</span>
  </div>
))}
```

### Pattern 3: Clipboard Copy with HTTPS Fallback

**What:** Copy text to clipboard using modern API with legacy fallback.
**When to use:** Any copy-to-clipboard action that must work on HTTP (e.g., local dev or LAN access).
**Example:**
```typescript
// Primary: navigator.clipboard.writeText (requires HTTPS or localhost)
// Fallback: document.execCommand('copy') via temporary textarea
async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern API first
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy approach
    }
  }
  // Legacy fallback for non-HTTPS environments
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
```

### Pattern 4: Landing Page Link Placement

**What:** A subtle link/button on the landing page that opens the tips overlay.
**When to use:** To provide access to the tips page without cluttering the primary UI.
**Example:**
```typescript
// In App.tsx, within the appState === AppState.INPUT block
// Place after the "or drag a .cue file" text (line ~2691-2693)
// or as a subtle link below the generate button area
<button
  onClick={() => setShowClaudeTips(true)}
  className="text-sm text-slate-400 hover:text-indigo-500 dark:hover:text-amber-400 transition-colors"
>
  Tips for generating lesson plans with Claude
</button>
```

### Anti-Patterns to Avoid

- **Duplicating marker list:** Never hardcode the marker list in the tips component. Always import `SUPPORTED_MARKERS` from `services/scriptedParser/types.ts`. This is the entire point of TIPS-05.
- **Hardcoding section headings in SUPPORTED_MARKERS:** The section headings (Hook, I Do, We Do, You Do, Plenary) and Day headers (`## Day N`) are structural markers, not content markers. They are defined by regex patterns in the parser (`SECTION_HEADING`, `DAY_BOUNDARY`), not in `SUPPORTED_MARKERS`. The tips page should list them separately, not try to extract them from a shared constant.
- **Using window.prompt() for copy fallback:** Some tutorials suggest `window.prompt()` as a clipboard fallback. This is terrible UX. Use the textarea/execCommand approach.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clipboard copy | Custom clipboard manager | `navigator.clipboard.writeText()` + `execCommand` fallback | Standard browser API; 15 lines total with fallback |
| Toast notifications | Custom notification system | Existing `useToast` hook from `components/Toast.tsx` | Already built, battle-tested, used throughout the app |
| Styling | Custom CSS file | Tailwind CSS classes | Entire app uses Tailwind CDN; consistency is non-negotiable |

**Key insight:** This phase has zero complexity that warrants third-party solutions. Everything is static content rendering with one clipboard interaction.

## Common Pitfalls

### Pitfall 1: Marker List Drift

**What goes wrong:** The tips page hardcodes marker names like `['Say', 'Ask', 'Write on board', 'Activity']` instead of importing `SUPPORTED_MARKERS`. Someone later adds a new marker to the parser but forgets to update the tips page.
**Why it happens:** Copy-paste is faster than importing.
**How to avoid:** Import `SUPPORTED_MARKERS` from `services/scriptedParser/types.ts`. Never duplicate the list. This is the primary requirement of TIPS-05.
**Warning signs:** Any `string[]` literal containing marker names in the tips component.

### Pitfall 2: Clipboard API Fails Silently on HTTP

**What goes wrong:** `navigator.clipboard.writeText()` throws a `NotAllowedError` when the page is served over HTTP (not HTTPS or localhost). The teacher clicks "Copy" and nothing happens.
**Why it happens:** The Clipboard API requires a secure context. Cue is a Vite app that may be accessed over local network (e.g., `http://192.168.x.x:3000`).
**How to avoid:** Always wrap clipboard calls in try/catch with `document.execCommand('copy')` fallback. Show toast feedback so the teacher knows the copy succeeded or failed.
**Warning signs:** Clipboard copy works in dev (`localhost:3000`) but fails when accessing from another device on LAN.

### Pitfall 3: Prompt Template Formatting Issues on Copy

**What goes wrong:** The copied prompt template has unexpected whitespace, missing newlines, or HTML entities instead of actual characters.
**Why it happens:** Template literal indentation gets included in the string, or JSX rendering introduces HTML encoding.
**How to avoid:** Store the prompt template as a dedented string constant (not inline JSX). Use template literals with explicit `\n` for line breaks, or use a dedent helper. Test the actual copied text by pasting into a text editor.
**Warning signs:** The copied text has extra leading spaces on each line or `&amp;` instead of `&`.

### Pitfall 4: Missing Section Headings and Day Headers in Format Spec

**What goes wrong:** The tips page only shows the 4 markers from `SUPPORTED_MARKERS` but forgets to document section headings (Hook, I Do, We Do, You Do, Plenary) and Day headers (`## Day N: Title`).
**Why it happens:** `SUPPORTED_MARKERS` only contains the 4 content markers. Section headings and day boundaries are separate concepts in the parser.
**How to avoid:** The format specification must cover 3 categories: (1) content markers from `SUPPORTED_MARKERS`, (2) section headings (hardcoded list matching the parser's `SECTION_HEADING` regex), and (3) day headers (format: `## Day N` or `## Day N: Title`).
**Warning signs:** A teacher generates a lesson plan with Claude but it has no section headings because the prompt template didn't mention them.

### Pitfall 5: Stale addToast Type Signature

**What goes wrong:** The `addToast` prop type in the tips component doesn't match the actual signature from `useToast`.
**Why it happens:** Copy-pasting the type from another component that has an older or simplified version.
**How to avoid:** Check `components/Toast.tsx` for the canonical `addToast` signature: `(message: string, duration?: number, variant?: ToastVariant, action?: ToastAction) => void`. Use `ToastVariant` type from Toast.tsx.
**Warning signs:** TypeScript errors when passing `addToast` to the tips component.

## Code Examples

Verified patterns from the existing codebase:

### Clipboard Copy with Toast (from PresentationView.tsx:1233-1241)
```typescript
// Source: components/PresentationView.tsx lines 1233-1241
const handleCopy = useCallback(async () => {
  if (!textToCopy) return;
  try {
    await navigator.clipboard.writeText(textToCopy);
    addToast('Copied to clipboard', 2000, 'success');
  } catch {
    addToast('Failed to copy', 2000, 'error');
  }
}, [textToCopy, addToast]);
```

### SUPPORTED_MARKERS Constant (from types.ts:130-138)
```typescript
// Source: services/scriptedParser/types.ts lines 130-138
/**
 * The 4 canonical markers recognized by the parser.
 * Shared with Phase 73 (Claude Chat Tips) to keep the tips page
 * and parser in sync.
 */
export const SUPPORTED_MARKERS = ['Write on board', 'Activity', 'Ask', 'Say'] as const;
```

### Modal/Overlay Pattern (from SettingsModal.tsx)
```typescript
// Source: components/SettingsModal.tsx structure
interface TipsProps {
  onClose: () => void;
  addToast: (message: string, duration?: number, variant?: ToastVariant) => void;
}

const ClaudeChatTips: React.FC<TipsProps> = ({ onClose, addToast }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header with close button */}
        {/* Content sections */}
        {/* Copy button */}
      </div>
    </div>
  );
};
```

### Toast Hook Usage (from App.tsx:275)
```typescript
// Source: App.tsx line 275
const { toasts, addToast, removeToast } = useToast();
// addToast is passed as prop to child components
```

### Landing Page State Toggle (pattern from showSettings, showResourceHub)
```typescript
// Source: App.tsx pattern
const [showClaudeTips, setShowClaudeTips] = useState(false);
// In JSX:
{showClaudeTips && (
  <ClaudeChatTips
    onClose={() => setShowClaudeTips(false)}
    addToast={addToast}
  />
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` | 2019 (Chrome 66+) | execCommand is deprecated but still needed as fallback for HTTP contexts |

**Deprecated/outdated:**
- `document.execCommand('copy')`: Deprecated in spec but still widely supported. Required as fallback for non-secure contexts where `navigator.clipboard` is unavailable.

## Open Questions

1. **Prompt Template Content**
   - What we know: The prompt template should instruct Claude to generate a lesson plan using the supported markers, section headings, and day headers.
   - What's unclear: The exact wording of the prompt template (pedagogical instructions, subject/topic placeholder, grade level placeholder).
   - Recommendation: Planner has full discretion on prompt template wording. Include placeholders for `[TOPIC]`, `[GRADE LEVEL]`, and `[NUMBER OF DAYS]`. The prompt should instruct Claude to use the exact marker format, section headings, and day headers.

2. **Link Placement on Landing Page**
   - What we know: The tips page should be accessible from the landing page. The landing page has a logo, title, upload zones, mode banner, verbosity selector, day picker, textarea, supplementary resources, image toggle, generate button, and "drag a .cue file" footer.
   - What's unclear: Exact placement of the tips link.
   - Recommendation: Place as a subtle text link below the "or drag a .cue file" line (around line 2691-2693 in App.tsx), or as a small link near the upload zone. Keep it unobtrusive -- this is a reference page, not a primary action.

3. **Section Headings: Should They Be a Shared Constant Too?**
   - What we know: `SUPPORTED_MARKERS` covers the 4 content markers. Section headings (Hook, I Do, We Do, You Do, Plenary) are defined in the parser via `SECTION_HEADING` regex and `SECTION_MAP` constant. The `SectionLabel` type is exported from `types.ts`.
   - What's unclear: Whether to also export a `SUPPORTED_SECTION_HEADINGS` constant or just hardcode them in the tips page.
   - Recommendation: The `SectionLabel` type already defines the canonical 5 headings. Export a `SUPPORTED_SECTIONS: SectionLabel[]` array constant from `types.ts` alongside `SUPPORTED_MARKERS`. This prevents drift for section headings too, at minimal cost (one line). If deemed over-engineering, the planner can hardcode them since section headings are extremely stable.

## Sources

### Primary (HIGH confidence)
- `services/scriptedParser/types.ts` - `SUPPORTED_MARKERS` constant definition (line 138), `ScriptedBlockType`, `SectionLabel` type
- `services/scriptedParser/scriptedParser.ts` - `MARKER_PATTERNS`, `SECTION_HEADING`, `DAY_BOUNDARY` regex patterns
- `components/Toast.tsx` - `useToast` hook, `ToastVariant` type, `ToastContainer` component
- `components/PresentationView.tsx:1237` - Clipboard copy with toast pattern
- `components/ManualPlacementGuide.tsx:19` - Another clipboard copy pattern
- `App.tsx:275` - Toast hook instantiation and prop passing
- `App.tsx:2285-2697` - Landing page (AppState.INPUT) section structure
- `index.html` - Tailwind CDN, font families (Fredoka for headings, Poppins for body)

### Secondary (MEDIUM confidence)
- MDN Web Docs - `navigator.clipboard.writeText()` requires secure context (HTTPS or localhost)
- MDN Web Docs - `document.execCommand('copy')` deprecated but widely supported as fallback

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zero new dependencies, all patterns exist in codebase
- Architecture: HIGH - Follows established overlay/modal pattern; shared constant already exported
- Pitfalls: HIGH - Clipboard HTTPS limitation is well-documented; marker drift prevention is the core requirement

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable; no external dependencies to track)
