# Domain Pitfalls: Scripted Import, Day Picker, and Claude Chat Tips

**Domain:** Lesson presentation app -- new import mode and UI features
**Researched:** 2026-02-19

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Scripted Detection False Positives

**What goes wrong:** The `detectScriptedFormat()` heuristic matches normal lesson plans that happen to contain "Say:", "Ask:", or "Do:" in regular prose. Example: "What I want you to Ask: your partner..." or "Say: the answer aloud" in a non-scripted context. The app switches to scripted mode when the teacher expected fresh generation.

**Why it happens:** English lesson plans naturally contain verbs like "say", "ask", "do" followed by colons in instructional context.

**Consequences:** Teacher uploads a normal PDF lesson plan, Cue auto-detects "scripted" mode, parser produces malformed slides (random sentences become bullets), teacher is confused and loses trust in the tool.

**Prevention:**
- Require cue markers at the START of a line: `^Say:` not `Say:` mid-sentence
- Require at least 3 _distinct_ cue types (e.g., both Say: AND Ask:, not just 5x "Say:")
- Consider requiring a "Lesson:" or "Phase:" header as an additional signal
- Show the detected mode prominently so teachers notice and can override
- Add a manual mode toggle as escape hatch (small link: "Not a scripted plan? Switch to Fresh mode")

**Detection:** Monitor user feedback. If teachers frequently override the auto-detected mode, the heuristic is too aggressive. Log mode overrides to analytics.

### Pitfall 2: Teleprompter Segment Count Mismatch

**What goes wrong:** Cue's presentation view expects speakerNotes to have exactly (N+1) segments where N is the number of content bullets (segment 0 = intro, segments 1-N = one per bullet). Scripted mode concatenates Say: cues into speakerNotes, but the number of Say: cues may not match (bullets + 1).

**Why it happens:** In a scripted lesson, Say: cues are interspersed with Ask:/Write: cues freely. A section might have 5 Say: cues and 2 Write: cues. The parser must map 5 speech segments to 2 content bullets, producing 3 segments (intro + 2 bullets) not 5.

**Consequences:** If segment count is wrong: (a) some teleprompter text never appears, or (b) the app throws an index-out-of-bounds error during presentation. Either way, the teacher loses prepared content mid-lesson.

**Prevention:**
- The parser must explicitly construct segments to match the (bullets + 1) formula
- Say: cues BEFORE the first content cue become segment 0 (intro)
- Say: cues BETWEEN content cues become the segment for the preceding bullet
- Say: cues AFTER the last content cue append to the final segment
- Add a validation step: `if (segments.length !== bullets.length + 1) { rebalance() }`
- Unit test with varied Say:/content ratios (0 Say, 1 Say, many Say, Say-only slides)

**Detection:** Parse warnings array includes any slides where segment rebalancing was needed.

### Pitfall 3: Day Splitter Splitting in the Wrong Place

**What goes wrong:** The day boundary regex matches "Day" in contexts like "Independence Day", "Today we will...", or "Day-to-day operations". This splits the lesson plan at the wrong position, giving the teacher garbled partial content for each "day."

**Why it happens:** "Day" is an extremely common English word. Even with line-start anchoring, lesson titles like "Day of the Dead: Cultural Traditions" can trigger false splits.

**Consequences:** Teacher selects "Day 1" expecting their fractions lesson, gets "Day of the Dead" content fragment. Or a 1-day lesson plan is incorrectly detected as multi-day.

**Prevention:**
- Require numeric or weekday qualification: `Day 1`, `Day 2`, `Monday`, not just `Day`
- Require a structural marker after the day label: colon, dash, newline (not mid-sentence)
- Only flag as multi-day if 2+ distinct day boundaries found at reasonable intervals (e.g., at least 100 chars between boundaries)
- Show day previews in the picker so teachers can verify content before generating
- Include "Use entire document" option as fallback

**Detection:** Day picker shows preview text for each detected day. Teacher can visually verify.

---

## Moderate Pitfalls

### Pitfall 1: mammoth.js Loses Scripted Formatting from DOCX

**What goes wrong:** Claude chat exports lesson plans as DOCX with rich formatting (bold headings, indentation). mammoth.js `extractRawText()` strips all formatting, and the resulting plain text may not have clear line breaks between cue types. "Say: Hello everyone Write on board: Topic" becomes one line.

**Prevention:**
- Use `mammoth.convertToHtml()` instead of `extractRawText()`, then strip HTML tags but preserve paragraph boundaries as newlines
- Alternatively, keep `extractRawText()` but verify that mammoth preserves paragraph breaks (it does -- paragraphs become newlines in raw text mode)
- Add integration test: create a DOCX with a known scripted format, process through mammoth, verify cue markers are on separate lines

### Pitfall 2: Slides with Only Say: Cues (No Visual Content)

**What goes wrong:** A phase section has 3 Say: cues and no Ask:/Write:/Show: cues. The parser produces a slide with empty `content[]` array (no bullets). In presentation view, this shows a blank slide with only a background image.

**Prevention:**
- If a section has Say: cues but no content cues, synthesize one summary bullet from the Say: text
- Or: mark these as "intro" slides with `layout: 'center-text'` and the phase label as the title
- Or: merge Say-only sections with the adjacent content section (making the Say: cues part of the previous/next slide's teleprompter)
- Document the chosen behavior in the parser so plan authors understand what to expect

### Pitfall 3: Scripted Mode Bypasses Content Preservation

**What goes wrong:** Existing fresh/blend modes run `detectPreservableContent()` to identify questions and activities for verbatim preservation in AI output. Scripted mode skips AI generation entirely, so this detection is unnecessary. But if a teacher later switches a scripted deck to "refine" mode (re-generation), the preservation rules might not apply correctly.

**Prevention:**
- Scripted mode skips content preservation (correct -- parser preserves everything by design)
- If re-generation is needed, treat it as a fresh generation from the original lesson text, not from the parsed slides
- Store the original lesson text in the .cue file's `lessonText` field (already happens via existing save logic)

### Pitfall 4: Auto-Detect Runs on Partial Text During Typing

**What goes wrong:** `detectScriptedFormat()` is called via `useMemo` whenever `lessonText` changes. While the teacher is typing in the textarea, the detection flickers between modes. Typing "Say" triggers re-evaluation. The mode indicator jumps between "Fresh" and "Scripted" as the teacher types.

**Prevention:**
- Debounce scripted detection (300-500ms delay after last keystroke)
- Or: only run detection when text length exceeds a minimum threshold (e.g., 100 chars)
- Or: only re-evaluate on paste events and file uploads, not on every keystroke
- The existing `uploadMode` is a `useMemo` that runs on every render -- scripted detection should be in a `useEffect` with debounce instead

### Pitfall 5: AI Enhancement Call Fails (Image Prompts)

**What goes wrong:** The single AI call to generate image prompts and layouts for scripted slides fails (rate limit, network error, malformed response). Without it, all slides have no `imagePrompt` and no `layout`.

**Prevention:**
- Graceful degradation: if AI enhancement fails, assign default values:
  - `imagePrompt`: derived from slide title + first bullet (e.g., `"Educational illustration: ${title}"`)
  - `layout`: `'split'` (the most common and safest default)
- Add a warning to the toast: "Image suggestions unavailable. You can generate images manually in the editor."
- This follows the existing pattern in `generationPipeline.ts` where Pass 2/3 failures degrade gracefully

---

## Minor Pitfalls

### Pitfall 1: Quoted Say: Content Has Smart Quotes

**What goes wrong:** Claude often wraps Say: content in smart quotes ("..."). The parser must handle both straight quotes (`"`) and smart quotes (curly `\u201C` `\u201D`). If it strips one type but not the other, speakerNotes end up with dangling quote marks.

**Prevention:** Strip both straight and curly quotes from the start/end of Say: content. Regex: `/^[\u201C\u201D\u2018\u2019"']+|[\u201C\u201D\u2018\u2019"']+$/g`

### Pitfall 2: Empty Phase Sections

**What goes wrong:** A Phase: header is immediately followed by another Phase: header with no cues between them. The parser creates an empty section that becomes a slide with no content and no teleprompter.

**Prevention:** Skip empty sections during slide generation. Log a parse warning. Do not create a slide with zero content and zero speakerNotes.

### Pitfall 3: Very Long Say: Blocks

**What goes wrong:** Teacher writes a 500-word Say: monologue. This becomes a single teleprompter segment, which is unwieldy in the presentation view (wall of text in the speaker notes area).

**Prevention:** For the parser, keep it faithful -- one Say: block = one content unit. Presentation view already handles long notes with scrolling. This is a display concern, not a parser concern. Document in Claude tips: "Break long speeches into multiple Say: blocks for better pacing."

### Pitfall 4: Day Picker Appears for Non-Multi-Day Plans

**What goes wrong:** A single lesson plan mentions "Day 1:" as a heading but has no "Day 2:". The day picker shows with only one option, which is confusing.

**Prevention:** Only show the day picker when `detectedDays.length >= 2`. A single day header is treated as a title, not a day boundary.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Parser core | Segment count mismatch with (bullets + 1) formula | Explicit rebalancing step with unit tests for every ratio |
| Parser core | False positive on "Do:" (very common English word) | Require "Do:" at line start AND followed by actionable content, or consider renaming to "Student Do:" |
| Pipeline integration | Type narrowing on `GenerationMode` union after adding 'scripted' | Update all switch/if-else chains that pattern-match on mode |
| Pipeline integration | `runScriptedPipeline` needs `provider` parameter but current function signature does not pass it | Ensure provider is accessible (add to function params or pipeline options) |
| UI integration | Mode indicator does not have a color/icon for 'scripted' | Add fourth mode case to the mode indicator JSX in App.tsx |
| UI integration | Day picker position in landing page layout conflicts with supplementary resources section | Place day picker between mode indicator and verbosity selector |
| DOCX upload | `handleFileChange` currently has `if (file.type !== 'application/pdf')` guard | Replace with extension-based check to support .docx |
| Claude tips | Tips panel adds visual clutter to already-busy landing page | Default to collapsed. Use subtle styling (muted colors, small text). |

---

## Sources

- Direct codebase analysis of existing parser patterns and failure modes
- `services/phaseDetection/phasePatterns.ts` -- precedent for false positive handling in regex patterns
- `services/generationPipeline.ts` -- precedent for graceful degradation on AI failures
- `services/geminiService.ts` -- teleprompter segment counting rules (point-hand delimiter system)
- `App.tsx` -- current uploadMode derivation and handleFileChange logic
