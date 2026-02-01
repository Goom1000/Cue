# Domain Pitfalls: Clipboard Paste and Deck Cohesion

**Project:** Cue v4.0 — Clipboard Builder
**Researched:** 2026-02-02
**Confidence:** MEDIUM (WebSearch verified with MDN/official sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, security issues, or major UX failures.

### Pitfall 1: Browser Clipboard API Permission Fragmentation

**What goes wrong:** Different browsers implement clipboard read/write permissions completely differently. Code that works in Chrome fails silently or throws in Safari/Firefox. Teachers try to paste content; nothing happens.

**Why it happens:**
- Chrome: Requires `clipboard-read` permission, granted automatically to active tabs for write, prompts for read
- Safari: Requires Promise-returning pattern for ClipboardItem, doesn't support `clipboard-read` permission at all
- Firefox: Requires user pref `dom.events.asyncClipboard.readText` and shows ad-hoc "Paste" popup

**Consequences:**
- Feature appears broken on Safari (large teacher demographic on MacBooks)
- Firefox users see unexpected permission dialogs
- Error messages like "NotAllowedError: Read permission denied" confuse users

**Prevention:**
1. Use feature detection before attempting clipboard access
2. Implement fallback to `paste` event listener for browsers without direct API support
3. Test on all three browser engines (Chromium, WebKit, Gecko)
4. Use user-initiated actions (button click) as trigger, not automatic paste

**Detection (warning signs):**
- Testing only on Chrome during development
- No error handling around `navigator.clipboard.read()`
- Missing user activation check before clipboard access

**Phase to address:** Early — clipboard implementation phase

**Sources:**
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [web.dev Clipboard Access](https://web.dev/articles/async-clipboard)

---

### Pitfall 2: XSS via Unsanitized Clipboard HTML

**What goes wrong:** Pasted HTML from PowerPoint contains scripts, event handlers, or SVG with onerror attributes that execute when rendered. Teacher copies from malicious source; arbitrary code runs in app.

**Why it happens:**
- Browser clipboard sanitization has known bypasses across all major browsers
- PowerPoint clipboard data includes complex HTML with embedded objects
- Developers trust browser sanitization without adding application-level filtering

**Consequences:**
- Self-XSS vulnerabilities (CVE-2020-26956 in Firefox was clipboard-based)
- Data exfiltration if malicious HTML runs in app context
- GitHub's paste-markdown library had this exact vulnerability (GHSA-gpfj-4j6g-c4w9)

**Prevention:**
1. **Always sanitize with DOMPurify** — never trust browser sanitization alone
2. Keep DOMPurify updated (bypasses are discovered regularly)
3. Sanitize BEFORE any DOM insertion, not after
4. Consider allowlist approach: extract only text, images; discard all HTML structure

**Detection (warning signs):**
- Using `innerHTML` with clipboard data without sanitization
- Trusting `text/html` MIME type without processing
- No DOMPurify or equivalent in dependencies

**Phase to address:** Early — paste processing phase, before any other clipboard work

**Sources:**
- [Securitum Clipboard XSS Research](https://research.securitum.com/the-curious-case-of-copy-paste/)
- [GitHub paste-markdown Security Advisory](https://github.com/github/paste-markdown/security/advisories/GHSA-gpfj-4j6g-c4w9)
- [Chrome Unsanitized Clipboard Docs](https://developer.chrome.com/docs/web-platform/unsanitized-html-async-clipboard)

---

### Pitfall 3: PowerPoint Clipboard Data Loss

**What goes wrong:** PowerPoint's clipboard format is rich and complex. Simple text extraction loses structure, tables, images. Cue receives garbled content instead of usable slide data.

**Why it happens:**
- PowerPoint exports multiple clipboard formats simultaneously (RTF, HTML, EMF, plain text)
- Each format has different fidelity levels
- Web apps can only access text/plain, text/html, and image/png
- HTML representation may not include embedded images (stored as references)

**Consequences:**
- Tables render as tab-separated garbage
- Images missing entirely (Outlook-to-PowerPoint paste doesn't even support images in web)
- Formatting context lost, making AI "improvement" harder

**Prevention:**
1. Accept HTML format first, fall back to plain text
2. Warn users upfront: "For best results, copy one slide at a time"
3. Parse HTML tables specifically (they often survive clipboard better than other content)
4. Consider separate image paste workflow rather than expecting images in HTML

**Detection (warning signs):**
- Only testing paste with simple text content
- Not testing actual PowerPoint copy operations
- Ignoring Microsoft's documented clipboard limitations

**Phase to address:** Middle — PowerPoint paste implementation

**Sources:**
- [Microsoft Copy/Paste in PowerPoint for Web](https://support.microsoft.com/en-us/office/copy-and-paste-in-powerpoint-for-the-web-e5bf5376-cf9f-482c-a72c-c98f8a1ba4ed)
- [Microsoft Office Copy/Paste Troubleshooting](https://support.microsoft.com/en-us/office/troubleshoot-copy-and-paste-errors-in-office-for-the-web-0dc01da6-6988-40e5-96ea-0567c151ae2f)

---

### Pitfall 4: AI Cohesion Pass Destroys User Edits

**What goes wrong:** Teacher spends 20 minutes pasting and editing slides. Clicks "Make Cohesive." AI rewrites everything, losing their careful customizations.

**Why it happens:**
- Cohesion feature needs to see all slides to unify them
- AI receives full deck, returns full deck (potentially rewritten)
- No distinction between AI-generated content and user-edited content

**Consequences:**
- User rage quits, loses trust in app
- Worst case: lost work that took significant time to create
- Teachers learn to never use cohesion feature

**Prevention:**
1. **Track provenance:** Mark each slide/bullet as "AI-generated" vs "user-edited"
2. Cohesion pass should ONLY modify AI-generated content by default
3. Show diff preview before applying cohesion changes
4. Offer "Apply to all" vs "Apply to AI-generated only" toggle
5. Consider snapshot/undo capability before cohesion

**Detection (warning signs):**
- No slide-level edit tracking in data model
- Cohesion prompt doesn't distinguish between content sources
- No confirmation dialog before cohesion applies

**Phase to address:** Late — cohesion feature design must account for this from start

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or poor UX.

### Pitfall 5: Image Paste Format Inconsistency

**What goes wrong:** User pastes a JPG screenshot. It arrives as PNG (browsers re-encode). File size balloons. Or worse: some browsers return different formats than others.

**Why it happens:**
- Clipboard API spec only mandates `image/png` support
- Even if user copies a JPG, browsers re-encode to PNG before clipboard access
- Chrome and Firefox re-encode images, Safari may behave differently

**Consequences:**
- Unexpected file sizes (PNGs larger than original JPGs)
- Memory pressure if many images pasted in one session
- Inconsistent behavior across browsers

**Prevention:**
1. Accept that all images will be PNG regardless of source
2. Consider optional re-compression on paste (canvas → toBlob with quality)
3. Set reasonable size limits with clear error messaging
4. Don't promise "paste any image format" — set expectation it becomes PNG

**Detection (warning signs):**
- Assuming clipboard images preserve original format
- No file size validation on pasted images
- Testing only with small images

**Phase to address:** Middle — image paste implementation

**Sources:**
- [web.dev Paste Images Pattern](https://web.dev/patterns/clipboard/paste-images)

---

### Pitfall 6: Deck "Cohesion" Means Different Things

**What goes wrong:** User expects visual consistency (colors, fonts). AI interprets as narrative consistency (story flow). Result satisfies neither expectation.

**Why it happens:**
- "Cohesion" is ambiguous
- Visual cohesion (styling) vs narrative cohesion (content flow) vs structural cohesion (slide types)
- AI models optimize for what's in the prompt, which may not match user mental model

**Consequences:**
- Users confused by what "Make Cohesive" actually does
- Feature doesn't solve the problem user had in mind
- Repeated clicks hoping for different results

**Prevention:**
1. Be specific in UI: "Improve Flow" vs "Match Style" vs "Fix Transitions"
2. Offer explicit options: "Unify language/terminology" vs "Add transitions" vs "Reorder for flow"
3. Cohesion prompt must be crystal clear about what to modify
4. Show preview of proposed changes before applying

**Detection (warning signs):**
- Single "Make Cohesive" button with no clarification
- Prompt uses vague word "cohesive" without defining it
- No user research on what teachers expect from this feature

**Phase to address:** Design phase — before implementation

---

### Pitfall 7: Gap Analysis Hallucination

**What goes wrong:** Teacher uploads lesson plan after building deck. AI "finds" gaps that don't exist (hallucinating requirements) or misses actual gaps.

**Why it happens:**
- AI lacks ground truth for what "complete coverage" means
- Different lesson plan formats confuse AI about what's required
- AI optimizes to provide "helpful" feedback even when none needed

**Consequences:**
- Teachers add unnecessary slides based on false gaps
- Real gaps missed, lesson coverage incomplete
- Erosion of trust in AI suggestions

**Prevention:**
1. Gap analysis should be CONSERVATIVE — only flag obvious gaps
2. Present suggestions as "potential gaps to review" not "required additions"
3. Allow teacher to dismiss suggestions (and learn from dismissals)
4. Cross-reference with slide titles and lesson plan headings for high-confidence matches only

**Detection (warning signs):**
- AI prompt asks "what gaps exist?" (leading question)
- No confidence scoring on gap suggestions
- Testing with only one lesson plan format

**Phase to address:** Late — gap analysis feature

**Sources:**
- [Edutopia AI Lesson Planning Guide](https://www.edutopia.org/article/ai-generated-lesson-plans/)

---

### Pitfall 8: State Explosion with Paste History

**What goes wrong:** Each paste operation adds to app state. After 20 pastes, localStorage is full, app slows down, autosave takes seconds.

**Why it happens:**
- Pasted images stored as base64 data URLs
- Each paste potentially adds megabytes to state
- Existing autosave (30s interval) wasn't designed for heavy image content

**Consequences:**
- localStorage quota exceeded (5-10MB typical limit)
- App becomes sluggish
- Autosave fails silently

**Prevention:**
1. Track state size, warn before limits approached
2. Consider IndexedDB for image storage (larger quota)
3. Compress images on paste before storage
4. Offer "export and clear" workflow for heavy presentations

**Detection (warning signs):**
- No size tracking on state
- Testing only with text-heavy content
- Ignoring localStorage errors

**Phase to address:** Early — architecture decision before implementing paste

---

### Pitfall 9: Integration with Existing Slide Model

**What goes wrong:** Pasted slides don't fit existing `Slide` type. New fields needed break existing functionality. Backward compatibility issues with saved .cue files.

**Why it happens:**
- Existing slide model designed for AI-generated content
- Pasted slides need different fields (source tracking, raw HTML preservation)
- CueFile version needs increment, migration logic needed

**Consequences:**
- Old saved files fail to load
- Pasted slides missing features that AI-generated slides have
- Type errors at runtime

**Prevention:**
1. **Plan schema changes upfront** — map pasted slide data to existing Slide type
2. Extend type with optional fields, not new types
3. Write migration for CueFile v4 → v5 before implementing paste
4. Add source tracking: `source: 'ai' | 'pasted' | 'manual'`

**Detection (warning signs):**
- Starting implementation without reviewing existing types.ts
- No discussion of CueFile version bump
- Testing new features without loading old saved files

**Phase to address:** Early — before any paste code

---

## Minor Pitfalls

Mistakes that cause annoyance but are recoverable.

### Pitfall 10: Paste Hotkey Conflicts

**What goes wrong:** User presses Cmd+V expecting paste into slide. App's existing hotkey (Cmd+K for Ask AI) or browser handling interferes.

**Prevention:**
1. Map out all existing keyboard shortcuts before adding new ones
2. Paste should only work when appropriate target is focused
3. Test hotkey behavior in all app states (editing, presenting, modal open)

**Phase to address:** Implementation — keyboard handling

---

### Pitfall 11: No Paste Progress Indicator

**What goes wrong:** User pastes large content, nothing happens for 3 seconds (AI processing). User pastes again. Now two pastes queued.

**Prevention:**
1. Show immediate visual feedback on paste (loading indicator)
2. Disable paste while processing previous paste
3. Toast confirmation when paste completes

**Phase to address:** UX polish

---

### Pitfall 12: Teleprompter Notes Not Generated for Pasted Slides

**What goes wrong:** Pasted slides appear in deck but have no teleprompter content. Teacher enters presentation mode and sees empty notes.

**Why it happens:** AI improvement for pasted content doesn't run automatically, or doesn't generate speakerNotes field.

**Prevention:**
1. Pasted slides should ALWAYS trigger teleprompter generation
2. Make this non-optional or at least defaulted on
3. If AI improvement is off, generate basic notes from slide content

**Phase to address:** Middle — paste processing flow

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Clipboard infrastructure | Browser permission fragmentation | Test Safari/Firefox early, not just Chrome |
| PowerPoint paste parsing | HTML sanitization security | DOMPurify from day 1, not retrofitted |
| Image paste | Format conversion surprise | Document PNG-only behavior, add compression |
| Slide integration | Type system brittleness | Extend existing Slide type, don't fork |
| Make Cohesive | User edit destruction | Track content provenance from start |
| Gap analysis | AI hallucination | Conservative prompts, confidence scoring |
| State management | Storage limits | IndexedDB for images, monitor size |
| Keyboard shortcuts | Hotkey conflicts | Map existing shortcuts before adding |

---

## Integration Pitfalls with Existing Cue Architecture

### Existing Pattern Conflicts

| Cue Pattern | Paste Feature Conflict | Resolution |
|-------------|------------------------|------------|
| BroadcastChannel sync | Large pasted images flood sync | Don't sync images until presentation mode |
| Auto-save every 30s | Image-heavy state slow to save | Debounce or lazy image serialization |
| Progressive bullet reveal | Pasted slides may not have bullets | Normalize to bullet format or new layout |
| Verbosity regeneration | Pasted content has no original prompt | Store pasted content separately from cache |
| Content preservation | Pasted Q&A pairs need detection | Run detector on pasted content too |

### State Model Additions Needed

Current `Slide` type (from types.ts analysis) needs:

```typescript
// Suggested additions for paste support
interface Slide {
  // ... existing fields ...

  // NEW: Content provenance tracking
  source?: 'ai-generated' | 'pasted' | 'manual';
  pastedAt?: string; // ISO 8601 timestamp

  // NEW: Raw pasted content (for re-processing)
  rawPastedHtml?: string; // Sanitized but structure-preserved
  rawPastedImages?: string[]; // Base64 data URLs
}
```

### CueFile Migration

Current version is 4. Paste feature likely needs v5:
- Migration: Add `source: 'ai-generated'` to all existing slides
- New files: Track provenance on all slides

---

## Confidence Assessment

| Pitfall Area | Confidence | Reason |
|--------------|------------|--------|
| Clipboard API issues | HIGH | MDN/web.dev documentation verified |
| XSS security | HIGH | Known CVEs and security advisories cited |
| PowerPoint format issues | MEDIUM | Microsoft docs confirm, limited first-hand testing data |
| AI cohesion issues | MEDIUM | Inferred from domain research, patterns documented |
| Integration with Cue | HIGH | Code analysis of existing types.ts and geminiService.ts |
| State management | MEDIUM | Inferred from existing architecture patterns |

---

## Sources

### Authoritative (HIGH confidence)
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [MDN Clipboard read() method](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/read)
- [web.dev Clipboard Access](https://web.dev/articles/async-clipboard)
- [web.dev Paste Images Pattern](https://web.dev/patterns/clipboard/paste-images)
- [Chrome Unsanitized Clipboard Docs](https://developer.chrome.com/docs/web-platform/unsanitized-html-async-clipboard)

### Security Research (HIGH confidence)
- [Securitum Clipboard XSS Research](https://research.securitum.com/the-curious-case-of-copy-paste/)
- [GitHub paste-markdown Security Advisory](https://github.com/github/paste-markdown/security/advisories/GHSA-gpfj-4j6g-c4w9)
- [Mozilla Bug 1666300 - XSS via clipboard](https://bugzilla.mozilla.org/show_bug.cgi?id=1666300)

### Microsoft (MEDIUM confidence - official but web-specific limitations)
- [Microsoft Copy/Paste in PowerPoint for Web](https://support.microsoft.com/en-us/office/copy-and-paste-in-powerpoint-for-the-web-e5bf5376-cf9f-482c-a72c-c98f8a1ba4ed)
- [Microsoft Office Copy/Paste Troubleshooting](https://support.microsoft.com/en-us/office/troubleshoot-copy-and-paste-errors-in-office-for-the-web-0dc01da6-6988-40e5-96ea-0567c151ae2f)

### Domain Research (MEDIUM confidence - patterns from multiple sources)
- [Edutopia AI Lesson Planning Guide](https://www.edutopia.org/article/ai-generated-lesson-plans/)
- [Bitovi AI Smart Paste](https://www.bitovi.com/blog/ai-smart-paste-with-react-adding-genuine-ai-value)
- [TinyMCE Clipboard Blog](https://www.tiny.cloud/blog/new-async-clipboard-api/)

### Cue Codebase Analysis (HIGH confidence - direct code review)
- `/types.ts` - Existing Slide model and CueFile format
- `/services/geminiService.ts` - AI prompt patterns
- `/.planning/PROJECT.md` - Feature requirements and constraints
