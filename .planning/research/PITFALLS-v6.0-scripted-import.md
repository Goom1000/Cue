# Domain Pitfalls: Scripted Import Mode, Day Picker, and Claude Chat Integration

**Project:** Cue v6.0 - Scripted Lesson Plan Import
**Researched:** 2026-02-19
**Confidence:** HIGH (codebase analysis + pattern extrapolation from existing regex systems)

---

## Executive Summary

Adding a scripted import mode to Cue's existing three-mode pipeline (fresh/refine/blend) introduces three categories of risk: (1) text parsing brittleness when lesson plan formats vary from the expected structure, (2) integration seams where the new mode touches shared pipeline code, and (3) a subtle long-term maintenance burden from Claude chat format specifications that drift or get ignored. The critical insight is that the parser itself is low-risk (Cue has two production-proven regex detection systems), but the **boundaries** around parsing -- what happens when parsing partially fails, how day splitting interacts with content preservation, and how the segment count invariant is maintained without AI generation -- are where the real dangers live.

---

## Critical Pitfalls

Mistakes that cause data loss, broken slides, or require architectural rewrites.

---

### Pitfall 1: Segment Count Violation in Scripted Mode

**What goes wrong:** Cue's progressive disclosure system requires `speakerNotes` segment count = `content` bullets + 1. In fresh/refine/blend modes, the AI is explicitly instructed to maintain this invariant (`"The number of pointing-right segments MUST be exactly (Number of Bullets + 1)"` -- geminiService.ts line 36). In scripted mode, the parser maps `Say:` blocks to `speakerNotes` and `Write on board:` / `Ask:` blocks to `content` bullets WITHOUT AI enforcement. If the lesson plan has 3 content items but 5 script blocks, or vice versa, the segment count is wrong and progressive disclosure breaks.

**Why it happens:**
- Lesson plans are not written with Cue's disclosure model in mind. A teacher might write `Say: "..."` five times but only `Write on board:` twice. The ratio is teacher-determined, not constrained.
- The mapper must GROUP consecutive `Say:` blocks between content-producing markers, but the grouping logic is non-trivial. What if `Say:` blocks are interleaved with `Activity:` blocks that don't produce content bullets?
- The AI enforces segment count because it is TOLD to. The parser has no such instruction -- it just extracts what it finds.
- Existing validation in the presentation layer silently clips extra segments or leaves empty segments, producing confusing blank pauses.

**Warning signs:**
- Teleprompter hangs on a blank segment during presentation
- Teacher advances through all content bullets but teleprompter still has unread segments
- Teleprompter finishes before all bullets are revealed
- `speakerNotes.split('pointing-right emoji').length !== content.length + 1` in any generated slide

**Prevention:**
1. The mapper MUST enforce the invariant as a post-processing step. After mapping blocks to slides, count content bullets and segment-ize speakerNotes to match:
   - If too many `Say:` segments: merge adjacent ones with a space separator until count matches
   - If too few `Say:` segments: pad with a generic intro segment ("Let's look at this next point")
   - Segment 0 (intro) is ALWAYS generated: either from the first `Say:` block before any content, or synthesized from the slide title
2. Create a `validateSegmentCount(slide: Slide): Slide` utility that is called on EVERY slide before returning from the scripted pipeline. This utility should already exist as a shared function, since it benefits all modes.
3. Log warnings (not errors) when segment count adjustment occurs, so the teacher sees "2 teaching notes were merged to fit the slide structure" rather than silent corruption.
4. Unit test: For every fixture lesson plan, assert `speakerNotes.split(delimiter).length === content.length + 1` on all output slides.

**Phase to address:** Phase 1 (parser + mapper) -- this is the FIRST thing to validate, before any UI work.

**Cue-specific context:** The invariant is enforced in `TELEPROMPTER_RULES` (geminiService.ts line 36), the concise variant (line 54), and the detailed variant (line 79). It appears in at least 8 places across the prompt system. The scripted mapper must replicate this invariant mechanically since no AI prompt will enforce it.

---

### Pitfall 2: The "Partial Parse" Trap -- Unrecognized Lines Silently Dropped

**What goes wrong:** The lesson plan contains lines that don't match any marker pattern (`Say:`, `Ask:`, `Write on board:`, etc.). These "unmarked" lines are legitimate teaching content -- transitional notes, context paragraphs, differentiation instructions, resource references, classroom management reminders -- but the parser has no category for them. They end up in `unmarkedText[]` and are never mapped to slides. The teacher imports a 3-page lesson plan and gets 4 slides because most content was unlabeled.

**Why it happens:**
- Not all lesson plans use explicit markers. Many use implicit structure: paragraphs of prose that the teacher is expected to say, bold text that goes on the board, questions embedded in narrative.
- Claude chat output will use markers (because we provide a template), but lesson plans from other sources (school-provided, downloaded from TES/Twinkl, hand-written in Word) will not.
- The parser is designed for the "happy path" of explicitly marked content. Real lesson plans are the unhappy path.
- The existing `phaseDetector.ts` handles this gracefully (its content patterns catch body-text signals at medium confidence), but the scripted parser's purpose is DIFFERENT: it must map lines to specific slide components, not just label regions.

**Warning signs:**
- Slide count is much lower than expected for the lesson plan length
- `unmarkedText[]` in the parse result contains more lines than the recognized blocks
- Teacher says "Where did my instructions for the TA go?"
- Long paragraphs of prose have no slide representation

**Consequences:**
- Lost teaching content -- the most critical failure mode
- Teacher loses trust in the scripted import and reverts to fresh mode (defeating the feature's purpose)
- Subtle: content that IS parsed correctly lacks context because surrounding prose was dropped

**Prevention:**
1. **Treat unmarked text as implicit `Say:` blocks.** Any paragraph of text between recognized markers that is longer than ~20 characters should default to a `Say:` block with `confidence: 'medium'`. This is the safest assumption: if the teacher wrote it, they intend to say it.
2. **Show a parse preview before generation.** After parsing but before creating slides, show the teacher a preview: "We detected these sections. Blue = scripted content. Grey = unrecognized text that will be included as teaching notes. Red = nothing was detected (help the teacher fix format)." This is the DayPicker's natural extension.
3. **Never silently drop content.** If `unmarkedText.length > 0`, surface it. The worst outcome is including too much content; the teacher can always delete slides. The unforgivable outcome is dropping content the teacher spent hours writing.
4. **Graceful degradation:** If the parser detects fewer than 3 recognized markers in the entire document, show a warning: "This lesson plan doesn't appear to use scripted markers (Say:, Ask:, etc.). Would you like to use Fresh Generation instead?" This catches documents that are genuinely unstructured.
5. Unit test: For every test fixture, assert `totalBlocks + unmarkedText.length >= totalInputLines * 0.9` -- i.e., at least 90% of non-empty lines are accounted for.

**Phase to address:** Phase 1 (parser) -- the fallback behavior must be designed INTO the parser, not bolted on later.

**Cue-specific context:** The `phaseDetector.ts` has an elegant fallback: when `hasExplicitPhases === false` and slide count >= 5, it uses positional heuristics (line 170). The scripted parser needs an analogous fallback for unmarked documents.

---

### Pitfall 3: Day Boundary Detection Splits Mid-Section

**What goes wrong:** The day boundary regex (`/^[\s#]*(?:Day|Lesson|Session)\s*(\d+)/mi`) matches text that is NOT actually a day boundary. Examples:
- `"Day 1 of the experiment..."` inside a science lesson plan (referencing experiment days, not lesson days)
- `"Lesson 1: Students will learn..."` inside a section heading that refers to a sub-lesson, not a multi-day boundary
- `"Session 1"` in a group activity description referring to activity stations
- Numbered sections (`1. Introduction`) misidentified as `Day 1`

When a false positive splits the lesson plan at the wrong point, the teacher selects "Day 1" in the picker and gets half a lesson, or "Day 2" and gets content from the middle of Day 1.

**Why it happens:**
- Day boundaries are semantically ambiguous. "Day 1" at the top of a document is a boundary. "Day 1" in body text is a reference. Regex cannot distinguish.
- The existing `phaseDetector.ts` faces an analogous problem: "I Do" in title case is a phase boundary, but "I do not recommend..." is body text. It solves this with case-sensitive matching and delimiter requirements (must be followed by `:`, `-`, or newline). But day boundaries don't always have delimiters.
- Multi-day lesson plans from different sources use inconsistent formatting:
  - `## Day 1` (Markdown heading -- reliable)
  - `Day 1:` (colon-delimited -- reliable)
  - `--- Day 2 ---` (separator -- reliable)
  - `Day 1` on its own line (ambiguous)
  - `LESSON 1` in all caps (reliable if structural, but could be a reference)

**Prevention:**
1. **Require structural anchoring.** Day boundaries must appear at line start with heading-like formatting (leading `#`, all-caps, or followed by a delimiter). Body-text references to "Day 1" do not match. Copy the `phasePatterns.ts` approach: structural patterns get high confidence, content patterns get medium.
2. **Confirm with the teacher.** After parsing, show detected day boundaries in the DayPicker with their surrounding context (2-3 lines above and below). Let the teacher confirm or dismiss false positives.
3. **Minimum section size.** A "day" with fewer than 3 blocks is likely a false positive. Flag it: "We detected 'Day 3' but it contains very little content. Is this correct?"
4. **Disambiguate with proximity.** If two "Day" markers are within 200 characters of each other, the second is likely a reference, not a new boundary.
5. **Require 2+ sequential boundaries.** A single "Day 1" heading is just a section heading, not a multi-day split. The day picker only activates when 2 or more distinct day numbers are found in sequence.
6. Unit test: Create fixtures with "Day" in body text and verify they are NOT detected as boundaries.

**Phase to address:** Phase 2 (day picker) -- the parser produces candidates, the day picker validates them with teacher input.

---

### Pitfall 4: New Mode Infects Existing Modes Via Shared Code Paths

**What goes wrong:** Adding `'scripted'` to the `GenerationMode` union type creates compile-time safety (TypeScript switch exhaustiveness), but runtime behavior changes can still regress existing modes. Specifically:
- `getDetectionSource(input)` in geminiService.ts (line 108-116) needs a new case for `'scripted'` -- if forgotten, it falls through to the default and returns wrong text
- `getMinConfidenceForMode(mode)` (line 124-126) returns different thresholds per mode -- scripted needs its own (probably 'high', since markers are explicit)
- `getSystemInstructionForMode(mode)` (line 131-236) needs a scripted case -- if it falls into `'fresh'`, the AI receives full generation instructions when it should only generate image prompts
- `canAnalyzeGaps` check (generationPipeline.ts line 164) must exclude scripted -- if missed, the pipeline tries gap analysis on parser-generated slides
- `claudeProvider.ts` mirrors geminiService.ts structure and needs identical changes

**Why it happens:**
- The `GenerationMode` type is a discriminated union checked in 6+ switch statements across the codebase
- TypeScript catches missing cases in exhaustive switches, but NOT in `if/else` chains or boolean expressions like `input.mode === 'fresh' || input.mode === 'blend'`
- The `canAnalyzeGaps` expression is an `||` chain, not a switch -- adding a new mode does NOT produce a compile error
- Claude provider code often lags behind Gemini provider changes (different files, easy to forget)

**Warning signs:**
- Existing tests still pass but scripted mode gets unexpected AI behavior
- Fresh mode starts doing something slightly different after the change
- AI receives a full generation system prompt when in scripted mode (wasting tokens and potentially overriding parser output)
- Gap analysis runs on scripted slides and finds "gaps" in the teacher's intentional script

**Prevention:**
1. **Audit EVERY reference to `GenerationMode` before implementing.** Search for `mode === 'fresh'`, `mode === 'refine'`, `mode === 'blend'`, `GenerationMode`, and `.mode` across the entire codebase. Create a checklist of every site.
2. **Convert `canAnalyzeGaps` from `||` chain to explicit exclusion.** Change `input.mode === 'fresh' || input.mode === 'blend'` to a `Set<GenerationMode>` of modes that support gap analysis. This is more maintainable and future-proof.
3. **Add integration tests for each existing mode BEFORE adding scripted.** Run the full pipeline in fresh/refine/blend modes and capture output characteristics (slide count range, presence of gap analysis, etc.). These become regression tests.
4. **Change both providers (Gemini + Claude) simultaneously.** Never merge a change to one provider without the other.

**Phase to address:** Phase 1 -- the mode union extension is the first code change and must be done carefully.

**Cue-specific references:**
- `getDetectionSource()`: geminiService.ts line 108
- `getMinConfidenceForMode()`: geminiService.ts line 124
- `getSystemInstructionForMode()`: geminiService.ts line 131
- `canAnalyzeGaps`: generationPipeline.ts line 164
- ClaudeProvider: services/providers/claudeProvider.ts (mirrors Gemini patterns)

---

### Pitfall 5: Content Preservation and Phase Detection Conflict With Scripted Parser

**What goes wrong:** The generation pipeline runs `detectPreservableContent()` and `detectPhasesInText()` on the lesson plan text BEFORE generation (geminiService.ts lines 6-7). In scripted mode, the SAME text is ALSO parsed by the scripted parser. Two detection systems run on the same text with partially overlapping patterns:
- `Ask:` is detected by BOTH `contentPreservation/detector.ts` (context pattern, line 148) AND the scripted parser
- Phase headings like `## Hook` and `### I Do` are detected by BOTH `phaseDetector.ts` AND the scripted parser's section headings
- Activity verbs (Bloom's taxonomy) trigger BOTH the existing activity detector AND the scripted parser's `Activity:` marker

This creates three problems:
1. **Double processing:** Questions detected by content preservation get `<preserve>` tags in the AI prompt, but scripted mode skips AI generation. The preservation system does work for nothing.
2. **Conflicting phase assignment:** Phase detector assigns phases based on text position proportionally. Scripted parser splits text into days, then assigns phases per-day. If both run, slides get different phase labels depending on which runs last.
3. **Detection interference:** If content preservation marks `Ask: "What is 3/4 of 12?"` as a question, AND the scripted parser extracts it as an `ask` block, the same text appears in two systems. If either modifies it (e.g., strips the `Ask:` prefix), the other system's reference becomes stale.

**Warning signs:**
- Slides have `lessonPhase` values that don't match the section headings in the lesson plan
- `hasQuestionFlag` is set on slides that aren't questions (because content preservation detected a rhetorical question in a `Say:` block)
- Performance: two regex scan passes on the same text when one suffices

**Prevention:**
1. **In scripted mode, skip content preservation detection entirely.** The scripted parser already identifies questions (type `'ask'`), activities (type `'activity'`), and instructions. Content preservation detection is designed for unstructured text where the AI needs hints about what to preserve. In scripted mode, there is no AI content generation to constrain.
2. **Run phase detection AFTER the scripted mapper.** Let the scripted parser's section headings define phases. Only fall back to `phaseDetector.ts` if the scripted parser found no section headings (i.e., the lesson plan has `Say:` / `Ask:` markers but no phase headings). The mapper should set `lessonPhase` directly from section headings.
3. **Add mode gating to detection source.** Extend `getDetectionSource()` to return empty string for scripted mode, which causes `detectPreservableContent()` to return empty results and skip prompt injection.
4. Unit test: Assert that scripted mode does NOT produce `<preserve>` tags in any prompt.

**Phase to address:** Phase 1 (pipeline integration) -- the mode gate must be designed to bypass both detection systems cleanly.

---

### Pitfall 6: Slide Boundary Explosion -- Every Marker Creates a New Slide

**What goes wrong:** The naive mapper approach of "each structural marker = new slide" produces a massive slide count from detailed lesson plans. A teacher who writes `Say: ... Ask: What do you think? Say: ... Ask: Can you explain?` as a single teaching sequence gets four slides instead of one. A detailed scripted plan with 30 questions and 15 activities produces 50+ slides.

**Why it happens:**
- In fresh/blend/refine modes, the AI naturally groups related content into 8-15 slides. The AI has pedagogical judgment about what constitutes a "slide-worth" of content.
- The scripted parser has no pedagogical judgment. It detects markers mechanically.
- Each `Ask:` could be a brief embedded question (part of the current slide) OR a major discussion question (worth its own slide). The parser cannot tell the difference.
- Teachers expect scripted import to produce a similar slide count to fresh mode (~10-15 slides). Getting 40+ slides is a show-stopper.

**Consequences:**
- Massive, unnavigable deck
- Teacher abandons scripted mode
- Or: teacher spends more time deleting slides than the import saved

**Prevention:**
1. **Only start a new slide on section headings and phase transitions** -- these are explicit break points the teacher intended.
2. `Ask:` blocks within a section become `content` bullets on the current slide (with `hasQuestionFlag: true`), NOT separate slides.
3. `Activity:` blocks start a new slide ONLY if they follow a non-activity block. Multiple consecutive activity items stay on one slide.
4. `Say:` blocks NEVER start a new slide -- they accumulate into `speakerNotes` for the current slide.
5. `Write on board:` blocks become `content` bullets on the current slide, not new slides.
6. Set a maximum content density threshold: if a single slide accumulates more than 6 content bullets, force a split at the next natural boundary.
7. Provide a slide count preview before import: "This will create approximately 12 slides." Teacher can cancel and adjust.

**Phase to address:** Phase 1 (mapper) -- the grouping algorithm is the core of slide boundary logic.

---

## Moderate Pitfalls

Mistakes that cause UX degradation, subtle bugs, or technical debt.

---

### Pitfall 7: Multi-Line Say Blocks Get Truncated to One Line

**What goes wrong:** A `Say:` marker followed by multiple lines of teacher script (common in detailed lesson plans) only captures the first line. The rest of the speech is lost or treated as unmarked text.

**Why it happens:** The regex pattern `^Say:\s*(.+)` captures to end-of-line. But teachers often write multi-line scripts:

```
Say: Good morning everyone. Today we're going to explore fractions.
I want you to think about a time when you had to share something equally.
Have you ever cut a pizza into slices? That's exactly what fractions help us do.
```

Only "Good morning everyone..." gets captured. The next two lines have no marker prefix, so they fall into `unmarkedText[]` or are misidentified.

**Consequences:** Teacher's carefully written scripts are silently truncated. Most of the `speakerNotes` content is lost. This is one of the most damaging bugs for a "verbatim preservation" feature.

**Prevention:**
1. After matching a `Say:` marker, consume subsequent lines until the next recognized marker or a blank line.
2. Multi-line accumulation logic: lines after `Say:` that don't start with a known marker prefix are continuation lines belonging to the current block.
3. Preserve paragraph breaks within multi-line blocks (double newline = paragraph break in the speech, not a block boundary).
4. This is the same pattern used in many Markdown parsers: a block continues until the next block-level marker.

**Phase to address:** Phase 1 (parser) -- the continuation-line logic must be in the initial parser design, not patched later.

---

### Pitfall 8: Mammoth.js Strips Formatting Markers That The Parser Needs

**What goes wrong:** The existing `docxProcessor.ts` uses `mammoth.extractRawText()` (line 31) which strips ALL formatting: bold, italic, headings, bullet indentation, and color. Many lesson plan conventions use formatting AS markers:
- **Bold text** = content to write on the board
- *Italic text* = teacher action / stage direction
- Heading styles = section boundaries (Day 1, Hook, I Do)
- Colored text = differentiation tiers

After `extractRawText()`, formatting-only markers are invisible to the parser.

**Why it happens:**
- `mammoth.extractRawText()` was chosen for the original use case (feeding text to AI for interpretation, where formatting doesn't matter)
- The richer `mammoth.convertToHtml()` preserves formatting as HTML tags, but requires HTML parsing
- For scripted mode, formatting IS semantics in some lesson plans

**Prevention:**
1. **Accept the limitation for v1.** Document that scripted import works best with explicitly marked lesson plans (using `Say:`, `Ask:`, etc.) and that formatting-only conventions are not detected.
2. **For future enhancement:** Use `mammoth.convertToHtml()` and parse HTML for formatting markers. Map `<strong>` to bold markers, `<em>` to italic, `<h1>`-`<h6>` to headings.
3. The regex already handles optional prefix chars (`^[\s*\-#]*`) following the `phasePatterns.ts` pattern -- ensure common list formatting (`- `, `* `, `1. `) is normalized before parsing.

**Phase to address:** Phase 1 (parser) -- decide and document the limitation. Flag for Phase 2 if teachers report missing content.

**Cue-specific context:** `docxProcessor.ts` line 31: `const result = await mammoth.extractRawText({ arrayBuffer })`.

---

### Pitfall 9: Day Picker Loses Cross-Day Context and References

**What goes wrong:** The teacher selects "Day 2" only from the day picker. Day 2's content references Day 1: "Review yesterday's fraction bar. Ask: Who can remind us what a numerator is?" The slide says "Review yesterday's fraction bar" but there is no Day 1 slide to reference.

Similarly, multi-day lesson plans often have:
- "Recap from Day 1:" sections that reference specific content
- Homework review: "Check answers from yesterday's worksheet"
- Building vocabulary: "Remember the term 'denominator' from yesterday"
- Cross-day differentiation: "Students who struggled yesterday should..."

When Day 2 is imported alone, these references become orphaned.

**Prevention:**
1. **Do not attempt to "fix" cross-day references.** This is AI rewriting, which scripted mode deliberately avoids. The teacher's exact script must be preserved, orphaned references and all.
2. **Show a warning when importing a subset of days.** If the teacher selects Day 2 but not Day 1, show: "Day 2 may reference content from earlier days. References will be preserved as-is."
3. **Default to all days selected.** If the lesson plan has 3 days, select all 3 by default. The teacher must explicitly deselect.
4. **Allow selecting multiple non-adjacent days.** Don't force sequential selection.

**Phase to address:** Phase 2 (day picker) -- the warning is a UI concern, not a parser concern.

---

### Pitfall 10: Claude Chat Output Format Specification Drift

**What goes wrong:** The Claude Chat Tips page provides a prompt template that teachers copy into Claude to generate lesson plans in Cue-compatible format. Over time, three forms of drift occur:

1. **Template drift:** The Cue parser evolves (new marker types, changed patterns), but the tips page template is not updated. Teachers generate lesson plans using stale format specifications.
2. **Claude model drift:** Claude's default output behavior changes between model updates. A template that produces `Say: "..."` today might produce `**Say:** "..."` or `Say (to class): "..."` tomorrow.
3. **User drift:** Teachers modify the template, share modified versions with colleagues, or use it as inspiration rather than verbatim. Non-standard formats enter the ecosystem.

**Warning signs:**
- Bug reports: "I used Claude to generate my lesson plan but Cue only found 3 slides"
- Parser `unmarkedText[]` grows over time as formats diverge
- Template in the tips page doesn't match what the parser actually accepts

**Prevention:**
1. **Make the parser more tolerant, not the template more specific.** The parser should handle common variations:
   - `Say:`, `Teacher Says:`, `Script:`, `Read aloud:` -- all map to `'say'`
   - `Ask:`, `Ask students:`, `Question:`, `Ask the class:` -- all map to `'ask'`
   - With or without quotes around the content
   - With or without bold/italic formatting markers
2. **Include a "validate format" feature.** Before generation, run the parser and show a preview: "We detected 12 scripted sections, 3 questions, and 2 activities." If detection count is low relative to document length, suggest: "This may not be in scripted format. Try Fresh Generation instead."
3. **Don't couple tightly to Claude.** The format should work from any source. A teacher who writes the lesson plan by hand using the markers should get the same results. The template is a CONVENIENCE, not a requirement.
4. **Test with real Claude output.** Generate 5-10 lesson plans across different topics using the template in Claude. Feed them through the parser. Record any failures.
5. **Define `SUPPORTED_MARKERS` as a shared constant** imported by both the parser and the tips page, so they cannot drift independently.

**Phase to address:** Phase 3 (Claude tips) -- but parser tolerance is a Phase 1 concern.

---

### Pitfall 11: Quoted Speech in `Say:` Blocks Creates Nested Delimiter Problems

**What goes wrong:** Teachers write quoted speech within `Say:` blocks:

```
Say: "Today we're going to learn about fractions. Can anyone tell me what a fraction is?"
Say: Tell the class: "Open your textbooks to page 42"
Say: "Remember what we said yesterday: 'The denominator tells us the total parts'"
```

The parser must decide: does the content include the outer quotes? Where does the block end? And critically: if the line contains `Ask:` inside a `Say:` block (`Say: Ask: "What is photosynthesis?"`), which marker wins?

**Prevention:**
1. **Strip outer quotes from `Say:` content as a post-processing step.** If the captured text starts and ends with matching quotes (`"..."` or `'...'`), remove them. Internal quotes are preserved.
2. **First-marker-wins rule.** When a line contains multiple markers (`Say: Ask: "What is..."`), the FIRST marker on the line wins. `Say:` captures everything after it, including `Ask:`. This is the simplest rule and matches teacher intent: they're scripting what to SAY, which includes asking a question.
3. **Don't over-parse quotes.** Treat the `Say:` content as opaque text. The parser's job is to IDENTIFY the block type and EXTRACT the content, not to analyze the content's internal structure.

**Phase to address:** Phase 1 (parser) -- quote handling must be designed into the regex patterns, not patched later.

---

### Pitfall 12: `hasQuestionFlag` Set on Teaching Prompts, Not Student Questions

**What goes wrong:** Not all `Ask:` blocks are student-facing questions:
- `Ask: students to move into groups` (classroom management)
- `Ask: TA to distribute worksheets` (logistics)
- `Ask: Can anyone see a pattern?` (genuine question -- correct)
- `Ask: rhetorically, "Isn't this fascinating?"` (not a real question)

Setting `hasQuestionFlag: true` on non-questions clutters the UI with question badges.

**Prevention:**
1. **Combine prefix and suffix signals.** An `Ask:` block with content ending in `?` gets `hasQuestionFlag: true`. Without `?` it maps as a regular content bullet.
2. **Reuse the rhetorical question detector.** Run extracted `Ask:` text through `isRhetorical()` from `contentPreservation/detector.ts` (line 62). Rhetorical questions get `hasQuestionFlag: false`.
3. **Separate `ask` from `ask-students-to`.** If content starts with `students to` or `TA to` or `children to`, map as an `activity` block instead.

**Phase to address:** Phase 1 (parser) -- marker classification refinement.

---

### Pitfall 13: `uploadMode` Derivation Cannot Detect Scripted Mode

**What goes wrong:** The current `uploadMode` in App.tsx (line 403) is derived from which files are uploaded:
- Has lesson plan file, no PPT = `'fresh'`
- Has PPT file, no lesson plan = `'refine'`
- Has both = `'blend'`

Scripted mode requires the SAME input as fresh mode (a lesson plan file), but needs DIFFERENT processing. The file-presence heuristic cannot distinguish fresh from scripted. The teacher must explicitly choose.

**Why it happens:**
- Fresh and scripted both take a lesson plan file as input
- The current derivation is a `useMemo` that checks file presence, not a user selection
- Adding scripted mode to the automatic derivation is impossible without additional UI

**Prevention:**
1. **Add an explicit mode toggle** for scripted import. When a lesson plan is uploaded, show a secondary choice: "Generate from AI" (fresh mode) vs "Import as scripted lesson" (scripted mode).
2. **Do not try to auto-detect scripted vs fresh.** Running the parser to check for markers on every upload is wasteful and creates a confusing UX if the auto-detection is wrong.
3. **Keep the mode toggle simple:** a button or radio group, not a dropdown. Two clear options with one-sentence descriptions.
4. The toggle only appears when a lesson plan is uploaded (not for PPT-only uploads, which remain refine mode).

**Phase to address:** Phase 2 (UI) -- the mode selector is a prerequisite for scripted import to be accessible.

---

### Pitfall 14: Scripted Import Produces Slides With No Image Prompts

**What goes wrong:** In fresh/refine/blend modes, the AI generates `imagePrompt` for every slide as part of content generation. In scripted mode, the parser maps text to slides but does NOT generate image prompts. If slides have empty `imagePrompt` fields, auto-image-generation fails and slides have no visuals.

**Prevention:**
1. **Generate image prompts in a lightweight AI pass.** After the mapper creates slides, make ONE batch API call with all slide titles and content, requesting one-sentence image descriptions. This is the minimum viable AI involvement (~500 tokens total).
2. **Alternatively, synthesize prompts from slide content without AI.** `imagePrompt = "An educational illustration about " + slide.title`. No AI needed, but generic results.
3. **If auto-generate-images is turned off**, this is not an issue. But if turned on, empty prompts must not crash the image generation pipeline.
4. **Image prompt failure should never block slide import.** Use `withRetry` and fall back to synthesized prompts on failure.

**Phase to address:** Phase 1 (pipeline) -- decide the image prompt strategy before implementation.

---

## Minor Pitfalls

Issues that cause annoyance but are recoverable with simple fixes.

---

### Pitfall 15: Timing Markers Have No Slide Representation

**What goes wrong:** Lesson plans include timing: `(5 minutes)`, `Time: 10 min`, `Allow 3-5 minutes`. The parser detects these but the `Slide` interface has no timing field. The information is detected with nowhere to go.

**Prevention:**
1. Inject timing into `speakerNotes` as a cue: `"[5 minutes] Today we'll look at fractions..."`. Matches existing `[PAUSE]` cue format.
2. Do not add a `timing` field to `Slide`. This would require a file format version bump.
3. Alternatively, include timing in the slide title: `"Hook (5 min)"`.

**Phase to address:** Phase 1 (mapper) -- simple post-processing.

---

### Pitfall 16: Copy-to-Clipboard Fails on HTTP or Older Browsers

**What goes wrong:** `navigator.clipboard.writeText()` requires HTTPS and a secure context. If accessed via HTTP, the copy button silently fails.

**Prevention:**
1. Fallback to `document.execCommand('copy')` with a hidden textarea.
2. Show success/failure toast after copy attempt.
3. Render the template in a selectable `<pre>` element for manual copy.

**Phase to address:** Phase 3 (Claude tips) -- 5-line implementation.

---

### Pitfall 17: Marker False Positives in Natural Prose

**What goes wrong:** The word "say" or "ask" appears in regular sentences: "I wouldn't say fractions are difficult" matches as a `Say:` block.

**Prevention:**
1. Require markers to be line-anchored (start of line, after optional bullet/heading characters).
2. Require a colon after the marker word: `Say:` not just `Say`.
3. Do NOT implement body-text `say` detection. Structural patterns only.
4. All patterns use case-insensitive flag (`/i`), following `phasePatterns.ts` convention.

**Phase to address:** Phase 1 (parser) -- baked into initial regex design.

---

### Pitfall 18: Empty Slides from Consecutive Section Headings

**What goes wrong:** A section heading followed immediately by another section heading (no content between them) creates an empty slide with just a title.

**Prevention:**
1. After mapping, filter out slides with no content AND no speakerNotes.
2. Or: collapse consecutive headings into a single slide title. `"## Hook"` followed by `"### The Pizza Problem"` becomes title "The Pizza Problem" with phase "hook".

**Phase to address:** Phase 1 (mapper) -- post-processing pass.

---

## Phase-Specific Warning Summary

| Phase | Highest-Risk Pitfall | Mitigation Priority |
|-------|---------------------|---------------------|
| Parser (Phase 1) | Segment count violation (#1) | Post-processing validation, enforce `segments = bullets + 1` mechanically |
| Parser (Phase 1) | Silent content dropping (#2) | Default unmarked text to `Say:` blocks, show parse preview |
| Parser (Phase 1) | Shared code path regression (#4) | Audit all `GenerationMode` references, add regression tests for existing modes |
| Parser (Phase 1) | Detection system conflicts (#5) | Skip content preservation in scripted mode, run phase detection after mapper |
| Parser (Phase 1) | Multi-line truncation (#7) | Continuation-line accumulation logic |
| Parser (Phase 1) | Slide boundary explosion (#6) | Section-heading-only splitting, not per-marker splitting |
| Day Picker (Phase 2) | False positive day boundaries (#3) | Structural anchoring, teacher confirmation, require 2+ boundaries |
| Day Picker (Phase 2) | Lost cross-day context (#9) | Warning when importing subset, default all-selected |
| Day Picker (Phase 2) | Mode derivation impossibility (#13) | Explicit mode toggle UI |
| Claude Tips (Phase 3) | Format specification drift (#10) | Tolerant parser, validate-before-generate, shared marker constants |
| Claude Tips (Phase 3) | Stale documentation (#10) | Generate tips from parser constants |

---

## Integration Pitfalls With Existing Cue Architecture

### Existing Pattern Conflicts

| Cue Pattern | Scripted Mode Conflict | Resolution |
|-------------|----------------------|------------|
| `TELEPROMPTER_RULES` segment count invariant | No AI to enforce it | Mechanical post-processing in mapper |
| `contentPreservation/detector.ts` runs on all input | Overlapping detection with scripted parser | Skip content preservation in scripted mode |
| `phaseDetector.ts` assigns phases proportionally | Scripted parser also assigns phases from headings | Let scripted parser handle phases; fall back to phaseDetector only if no headings |
| `getDetectionSource(input)` switch on mode | Missing case returns wrong text | Add explicit `'scripted'` case returning empty string |
| `canAnalyzeGaps` boolean expression | New mode not caught by `||` chain | Refactor to explicit exclusion set |
| `mammoth.extractRawText()` | Strips formatting markers | Accept for v1; document limitation |
| `uploadMode` derivation in App.tsx | Cannot distinguish fresh from scripted | Add explicit mode toggle |
| `CueFile` format version | Scripted slides use same Slide interface | No version bump needed |

### Data Flow for Scripted Import

```
Uploaded File (PDF/DOCX/PPTX/plain text)
    |
    v
Text Extraction (existing processors, unchanged)
    |
    v
Scripted Parser (NEW: detect markers, split days, extract blocks)
    |
    v
Day Picker UI (NEW: teacher selects which days to import)
    |
    v
Scripted Mapper (NEW: convert ScriptedBlock[] to Slide[])
    |                    |
    |                    v
    |              Enforce segment count invariant
    |                    |
    v                    v
AI Image Prompts  +  Phase Detection (on mapped slides)
    |                    |
    v                    v
Return Slide[] (skip Pass 2/3 gap analysis)
```

**Critical difference from existing pipeline:** The parser-to-mapper path is synchronous and deterministic. No AI calls in the critical path. AI is only used for image prompts (optional). This means scripted import is faster, cheaper, and more predictable -- but also has no AI to "fix" parser mistakes.

---

## Testing Strategy

### Golden Test Fixtures

1. **Happy path:** Explicitly marked lesson plan with `Say:`, `Ask:`, `Write on board:`, section headings, timing markers. Single day.
2. **Multi-day:** Three-day plan with `## Day 1/2/3`. Select Day 2 only. Verify completeness.
3. **Unmarked prose:** Lesson plan with NO explicit markers. Verify graceful degradation and warning.
4. **Nested markers:** `Say: Ask: "What is 3/4?"` -- verify first-marker-wins.
5. **False day boundaries:** "Day 1 of the experiment" in body text. Verify NOT split.
6. **Segment count stress:** Slide with 3 content bullets but 6 `Say:` blocks. Verify merge to match invariant.
7. **Quoted speech:** `Say: "Hello class"` -- verify outer quote stripping.
8. **Multi-line blocks:** `Say:` followed by 3 continuation lines. Verify all captured.
9. **Real Claude output:** Lesson plan generated from the tips template. Verify full detection.
10. **Edge cases:** Empty doc, headings-only doc, timing-only doc.

### Regression Tests for Existing Modes

- [ ] Fresh mode output unchanged after adding `'scripted'` to `GenerationMode`
- [ ] Refine mode still skips gap analysis
- [ ] Blend mode still runs gap analysis
- [ ] Content preservation detection runs in fresh/refine/blend but NOT scripted
- [ ] Phase detection runs in all modes
- [ ] `canAnalyzeGaps` correctly excludes scripted and refine
- [ ] TypeScript compiles with no errors

---

## Confidence Assessment

| Pitfall Area | Confidence | Reason |
|--------------|------------|--------|
| Segment count violation (#1) | HIGH | Direct analysis of TELEPROMPTER_RULES invariant (8+ references) and absence of enforcement outside AI prompts |
| Silent content dropping (#2) | HIGH | Inherent behavior of regex parsers: unmatched lines are invisible |
| Day boundary false positives (#3) | HIGH | Direct analysis of analogous problem in `phasePatterns.ts` (case-sensitive "I Do" matching, line 64) |
| Shared code path regression (#4) | HIGH | Direct audit of 6+ `GenerationMode` switch sites, including non-exhaustive boolean expressions |
| Detection system conflicts (#5) | HIGH | Direct analysis of overlapping regex patterns between `detector.ts` and proposed parser |
| Slide boundary explosion (#6) | HIGH | Extrapolated from AI vs parser judgment difference; AI naturally groups, parsers don't |
| Multi-line truncation (#7) | HIGH | Standard regex end-of-line behavior; verified against lesson plan writing conventions |
| Mammoth formatting loss (#8) | HIGH | Direct analysis of `docxProcessor.ts` line 31 |
| Cross-day context loss (#9) | MEDIUM | Inferred from pedagogical practice; not verified with real samples |
| Format specification drift (#10) | MEDIUM | Inferred from AI ecosystem behavior patterns; no Cue-specific data yet |
| Nested delimiters (#11) | HIGH | Direct analysis of lesson plan writing conventions and greedy regex behavior |
| Question flag misclassification (#12) | HIGH | Direct analysis of existing `isRhetorical()` patterns and `Ask:` prefix ambiguity |
| uploadMode derivation (#13) | HIGH | Direct analysis of App.tsx line 403 `useMemo` logic |
| Missing image prompts (#14) | HIGH | Direct analysis of image generation pipeline dependency on `imagePrompt` field |

---

## Sources

### Cue Codebase Analysis (HIGH confidence)
- `services/generationPipeline.ts` -- Three-pass pipeline, mode gating at line 164, segment count not validated post-generation
- `services/geminiService.ts` -- `TELEPROMPTER_RULES` segment invariant (line 36), mode-specific instructions (line 131), detection source per mode (line 108)
- `services/aiProvider.ts` -- `GenerationMode` type (line 66), `GenerationInput` interface (line 68)
- `services/contentPreservation/detector.ts` -- `Ask:` context pattern (line 148), rhetorical patterns (line 47), activity detection (line 238)
- `services/phaseDetection/phaseDetector.ts` -- Phase detection with structural/content tiers, proportional assignment, positional heuristics
- `services/phaseDetection/phasePatterns.ts` -- Structural vs content patterns, priority ordering, delimiter requirements
- `services/documentProcessors/docxProcessor.ts` -- `mammoth.extractRawText()` (line 31)
- `services/prompts/contentPreservationRules.ts` -- `<preserve>` tag system for AI prompt injection
- `types.ts` -- `Slide` interface (no timing field), `GenerationMode`, `CueFile` format v5
- `App.tsx` -- `uploadMode` derivation logic (line 403)

### Prior Cue Research (HIGH confidence)
- `PITFALLS-content-preservation.md` -- Helpful Transformation Instinct, State Tracking Amnesia (relevant to understanding what scripted mode bypasses)
- `PITFALLS-script-mode-export.md` -- Verbosity cache resolution, pasted slide handling
- `STACK-v6.0-scripted-import.md` -- Zero-dependency decision, parser architecture, type extension points

### External Research (MEDIUM confidence)
- [Document Parsing: Techniques, Tools, and Best Practices (Chatbase)](https://www.chatbase.co/blog/document-parsing)
- [Document Parsing Unveiled (arXiv)](https://arxiv.org/html/2410.21169v1)
- [Software Design by Example: Parsing Text](https://third-bit.com/sdxpy/parse/)
- [ChatGPT to Claude Migration Guide (Arsturn)](https://www.arsturn.com/blog/from-chatgpt-to-claude-an-honest-migration-guide-for-power-users)

---

*Pitfalls research: 2026-02-19*
