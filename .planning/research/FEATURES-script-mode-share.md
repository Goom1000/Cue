# Feature Landscape: Script Mode (Share with Colleague)

**Domain:** Presentation sharing / lesson handoff for education
**Researched:** 2026-02-08
**Confidence:** HIGH (domain well-understood, codebase thoroughly reviewed)

## Context: What Exists vs What We Are Building

**Current state of Cue exports:**
- PPTX export: slide title + brief bullet points + image. Speaker notes go into PowerPoint's hidden Notes pane (only visible in Presenter View or Notes Page print layout). A colleague opening this in PowerPoint sees minimal bullets and must know to check Presenter View.
- Working Wall PDF export: visual screenshot of slides as A4 posters (landscape for Quick, portrait for AI Poster). No talking points at all.
- Teleprompter content: stored in `speakerNotes` field as a continuous string delimited by pointing-right emoji segments. Tightly coupled to progressive bullet disclosure (Segment 0 = intro, Segment N = explanation of Bullet N after it appears).

**The gap:** A colleague receives a PPTX with 3-4 brief bullet points per slide and no visible guidance on *what to say*. The teleprompter scripts -- which contain the real teaching value (examples, analogies, interaction prompts, explanations) -- are buried in PowerPoint's Notes pane where most teachers never look.

**v4.1 approach:** Transform at export time, not generation time. Take the existing deck and use AI to convert teleprompter scripts into expanded talking-point bullets that live *on the slide face*. Export as PPTX or PDF. The original deck is unchanged.

## Table Stakes

Features users expect. Missing = the export feels broken or unhelpful.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| One-click export to PPTX | Teachers live in PowerPoint. Any export that does not produce a .pptx is dead on arrival. | Low | Already built via PptxGenJS. Extend with script-version layout. |
| One-click export to PDF | Many schools block PPTX editing or use PDF-only workflows. PDF is the universal fallback. | Low | Already built via jsPDF + html2canvas. New layout needed. |
| Slide images preserved | The images are the visual anchor. Slides without images feel incomplete and unprofessional. | Low | Existing `imageUrl` data URLs. Must be placed in script-version layout. |
| Expanded talking points per slide | The whole point. A colleague must see what to say on each slide without checking Notes. | Med | AI transforms teleprompter segments into readable bullets. Core feature. |
| Slide titles preserved | Colleague needs topic orientation. Removing titles makes the deck unnavigable. | Low | Direct copy from existing `slide.title`. |
| File downloads automatically | Teachers expect "click and get file." No email flows, no cloud storage, no accounts. | Low | Existing pattern: `URL.createObjectURL` + click trigger. |
| Sensible filename | "Fractions Lesson - Script Version.pptx" not "export-1707345600.pptx". | Low | Use deck title + " - Script Version" suffix. |

## Differentiators

Features that set this apart from "just print the Notes page." Not expected but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-transformed talking points (not raw teleprompter copy) | Raw teleprompter scripts are conversational, segmented by pointing-right delimiters, reference "what we just saw on screen," and assume progressive disclosure. A colleague reading a static slide needs restructured content: clear bullet points, not a stream-of-consciousness script. AI transforms these into clean, self-contained teaching notes. | Med | This is the key differentiator. Not a copy-paste of speakerNotes but a genuine transformation. |
| Optional in-app preview | Teacher can see what the script version looks like before exporting. Builds confidence in the output. Catches AI errors before the file leaves the app. | Med | Render script-version slides in a modal or preview pane. Can reuse existing SlideContentRenderer pattern with modified content. |
| Handles all slide types gracefully | Work Together, Class Challenge, pasted slides, full-image slides -- each needs appropriate treatment. Not just "slap text on it." | Med | Some slide types (Class Challenge) may not need script transformation. Pasted image slides need careful handling. |
| Progress feedback during generation | AI transformation takes time (one call per slide or batched). Teacher needs to see something is happening. | Low | Existing patterns: spinner + progress counter (see ExportModal, posterService). |
| Deck-level context in AI prompt | AI sees surrounding slides so talking points reference the right lesson flow, not just isolated slide content. | Low | Existing pattern from posterService: `buildSlideContext()` provides N slides before/after. |

## Anti-Features

Features to explicitly NOT build. Each would add complexity without proportional value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Generation-time "Script Mode" toggle | The original pending todo (2026-01-19) proposed generating different slide content at creation time. This doubles the generation matrix, creates divergent deck states, and forces the teacher to decide mode before seeing the result. Export-time transformation is simpler and non-destructive. | Transform at export time. Original deck stays unchanged. |
| Editable script-version slides in-app | If the teacher can edit the script version inside Cue, you now have two parallel decks to maintain, sync, and persist. Massive complexity. | Export is one-way. If teacher wants to change talking points, they edit in PowerPoint after export. Preview is read-only. |
| Per-slide AI regeneration in preview | Allowing "regenerate this slide's talking points" in the preview creates a micro-editing loop that delays export and adds UI complexity. | Generate all slides once. If the teacher does not like the result, they export and edit in PowerPoint, or regenerate the entire batch. |
| Cloud sharing / link-based sharing | Requires authentication, hosting, link management, permissions. Way outside scope for a local SPA. | Export as file. Teacher shares via email, USB, Google Drive, Teams -- whatever they already use. |
| Automatic teleprompter-to-bullets without AI | Splitting on pointing-right delimiters and dumping raw segments onto slides produces unreadable results. The segments assume progressive disclosure context ("as you can see...," "now that we have looked at...") and need genuine restructuring. | Always use AI transformation. The quality difference is the entire value proposition. |
| Dual-format export (PPTX + PDF in one click) | Confusing UX. Teacher may not want both. Two files appearing feels buggy. | Let teacher choose PPTX or PDF. One button, one file. |
| Verbosity selection for script version | The existing deck already has a verbosity level (concise/standard/detailed). Adding another verbosity toggle for the script version creates decision paralysis. | Use the deck's existing verbosity as input context. Script-version talking points are always "expanded" -- that is the point. |

## What "Expanded Talking Points" Should Look Like

This is the core design question. The AI transformation must convert teleprompter scripts into a format optimized for a colleague reading from static slides.

### Input: Current Teleprompter Format

```
"Alright everyone, today we're going to explore something really interesting - fractions!
[PAUSE] Has anyone ever shared a pizza with friends? That's exactly what fractions help us
understand. [pointing-right] So when we look at this first point, the denominator - that's
the number on the bottom - tells us how many equal parts we've divided something into. Think
of it like cutting a cake into slices. If we cut it into 4 pieces, our denominator is 4.
[Point to example on board] Does that make sense so far? [pointing-right] ..."
```

**Problems with using this raw on a slide:**
- References "this first point" (assumes progressive disclosure)
- Contains [PAUSE], [Point to example] stage directions mixed in
- Stream-of-consciousness conversational tone
- Assumes the teacher is the same person who created it
- Extremely long -- would overflow a readable slide

### Output: What Script-Version Bullets Should Look Like

**Target format:** 4-7 concise but substantive bullet points per slide. Each bullet is a self-contained teaching note that tells the colleague *what to say and do*.

```
- Introduce fractions using a pizza analogy -- ask "has anyone shared a pizza?"
- Denominator (bottom number) = how many equal parts the whole is divided into
- Use the example: cutting a cake into 4 slices means denominator is 4
- Draw a simple fraction diagram on the board while explaining
- Check understanding: "Which is bigger, 1/2 or 1/4? Why?"
```

### Design Principles for Talking Points

1. **Action-oriented:** Each bullet tells the colleague what to *do* or *say*, not what the concept abstractly is. "Ask students to..." rather than "Students should understand..."

2. **Self-contained:** No bullet references another bullet or assumes progressive disclosure. A colleague glancing at any single bullet gets a complete instruction.

3. **Concrete over abstract:** Include the specific example, analogy, or question -- not "use an analogy" but "use the pizza analogy."

4. **Interaction prompts preserved:** The teleprompter's "[PAUSE for questions]" and "[Wait for responses]" are valuable signals. Transform into bullets like "Pause -- ask if anyone has questions so far."

5. **Appropriate density:** Research shows 3-6 bullets per slide is optimal for readability. For script-version slides (which are read, not projected to students), 4-7 bullets is acceptable because the audience is one teacher reading at arm's length, not students reading from the back of a room.

6. **Stage directions as bullets:** "[Point to diagram]" becomes "Point to the fraction diagram on the board." These are actionable instructions, not parenthetical noise.

## Script-Version Slide Layout Recommendations

### PPTX Layout (16:9)

**Recommended: Two-column layout with image**

```
+--------------------------------------------------+
|  SLIDE TITLE (32pt bold)                          |
+--------------------------------------------------+
|                          |                        |
|  * Talking point 1       |                        |
|  * Talking point 2       |     [SLIDE IMAGE]      |
|  * Talking point 3       |     (contained fit)     |
|  * Talking point 4       |                        |
|  * Talking point 5       |                        |
|                          |                        |
+--------------------------------------------------+
```

- **Text area:** Left 55% of slide. Bullets at 18-20pt font (smaller than student-facing 24pt because this is for a teacher reading at desk distance, not projected).
- **Image area:** Right 45% of slide. Uses `sizing: { type: "contain" }` to preserve aspect ratio.
- **No-image fallback:** Text expands to full width. Bullets at 20-22pt.
- **Title:** 28-32pt bold at top. Same as current export.
- **Background:** Light neutral (`#F8FAFC` slate-50) rather than pure white. Easier on eyes for reading.
- **Bullet style:** Filled circle bullets with 8-10pt paragraph spacing. NOT numbered (numbering implies sequence/priority that may not exist).
- **Speaker Notes in PPTX:** Still include the original raw teleprompter text in PowerPoint's Notes pane as a bonus. The colleague who knows about Presenter View gets the full script; the one who does not still has the talking points on-slide.

**For full-image / pasted slides:**

```
+--------------------------------------------------+
|  SLIDE TITLE (28pt bold, white, shadow)           |
|                                                   |
|     [ORIGINAL IMAGE - full background]            |
|                                                   |
+--------------------------------------------------+
|  Talking points in Notes pane only                |
```

Full-image and pasted slides should NOT have talking points overlaid on the image. Instead, put the expanded talking points in the Notes pane only and add a small footer text: "See presenter notes for teaching guidance." This preserves the teacher's original visual content (diagrams, worksheets, arrows) per the existing pasted-slide design decision.

### PDF Layout (A4 Portrait)

**Recommended: "Notes Page" style -- slide thumbnail + talking points below**

```
+------------------------------------------+
|  SLIDE TITLE (16pt bold)                  |
+------------------------------------------+
|                                           |
|  +-----------------------------------+   |
|  |                                   |   |
|  |    [SLIDE IMAGE]                  |   |
|  |    (centered, ~40% page height)   |   |
|  |                                   |   |
|  +-----------------------------------+   |
|                                           |
|  TEACHING NOTES                           |
|  ----------------------------------------|
|  * Talking point 1                        |
|  * Talking point 2                        |
|  * Talking point 3                        |
|  * Talking point 4                        |
|  * Talking point 5                        |
|                                           |
|                           Slide 3 of 12  |
+------------------------------------------+
```

- **Image:** Centered, constrained to ~40% of page height. Maintains aspect ratio.
- **Title:** 16pt bold, above image.
- **Talking points:** 11pt body text with bullet markers. Below image.
- **Page number:** Footer with "Slide N of M" for easy reference.
- **One slide per page:** Ensures each slide's teaching notes are self-contained on a single page. No awkward page breaks mid-slide.
- **Margins:** Same A4 margins as existing exportService (25mm left for binding, 15mm right, 20mm top/bottom).

### Special Slide Type Handling

| Slide Type | Script-Version Treatment |
|------------|------------------------|
| Standard (split layout) | Full talking points + image. Core case. |
| Full-image | Image dominates. Talking points in Notes (PPTX) or below image (PDF). |
| Pasted slides | Preserve original image exactly. Talking points below (PDF) or in Notes (PPTX). |
| Work Together | Include the activity instructions as talking points. Omit student pairs (colleague will have different students). |
| Class Challenge | Include the challenge prompt and facilitation tips. Omit student contributions (those were live and session-specific). |
| Center-text | Treat like standard -- add talking points alongside or below the centered text. |

## Feature Dependencies

```
Existing slide data (content[], speakerNotes, imageUrl) --> AI Transformation Service
                                                               |
                                                               v
                                                        Script-version bullets[]
                                                               |
                                              +----------------+----------------+
                                              |                                 |
                                              v                                 v
                                     Script PPTX Export                 Script PDF Export
                                     (pptxService extension)           (new jsPDF layout)
                                              |                                 |
                                              v                                 v
                                     [Optional Preview]              [Optional Preview]
                                     (in-app modal)                  (in-app modal)

Dependencies on existing features:
- AI provider infrastructure (ClaudeProvider / GeminiProvider) -- for transformation
- pptxService.ts -- extend with script-version layout
- exportService.ts patterns -- reuse PDF generation approach (jsPDF)
- ExportModal.tsx patterns -- reuse modal UX, progress feedback, off-screen rendering
- posterService.ts pattern -- sequential AI generation with progress callbacks
```

## MVP Recommendation

**Phase 1 (MVP): AI transformation + PPTX export**

Prioritize in this order:

1. **AI transformation service** -- takes a Slide's speakerNotes + content + title and returns 4-7 expanded talking-point bullets. This is the core value. Without this, everything else is just layout work.
2. **Script-version PPTX export** -- extend pptxService with a new layout function that places talking-point bullets on-slide alongside image. PPTX is what teachers use daily.
3. **Export trigger UX** -- "Share with Colleague" button (likely in the same area as existing PPTX export). Simple: click, wait for AI, download.

**Phase 2: PDF + Preview**

4. **Script-version PDF export** -- "Notes Page" style A4 portrait with image + talking points. Reuse jsPDF patterns from exportService.
5. **Optional preview** -- Read-only modal showing what the script version looks like before export. Nice-to-have, not launch-critical.

**Defer:**
- Per-slide regeneration in preview (anti-feature)
- Verbosity toggle for script version (anti-feature)
- Cloud sharing (anti-feature)
- Generation-time script mode (anti-feature -- export-time is better)

## Text Density and Readability Guidelines

Based on research into presentation readability and substitute teacher plan design:

### For PPTX (read on screen or projected)
- **4-7 bullets per slide.** Research says 3-6 for audience-facing; script slides are teacher-facing so slightly higher density is acceptable.
- **18-20pt font.** Readable at arm's length (teacher's laptop) but allows more content than student-facing 24-28pt.
- **Max ~60 words per slide.** Hard ceiling. If AI produces more, it needs to condense.
- **No full sentences.** Bullet fragments: "Introduce fractions via pizza analogy" not "You should introduce fractions by using a pizza analogy to help students understand."
- **Bold key terms.** "**Denominator** = bottom number, how many equal parts" -- colleague's eye catches the key term.

### For PDF (read on paper or tablet)
- **4-7 bullets per slide page.** Same content as PPTX.
- **11pt body text.** Standard print readability.
- **Full A4 page per slide.** No cramming multiple slides onto one page -- that defeats the "glance and teach" purpose.

### What Makes Handoff Notes Effective (from substitute teacher plan research)
- **Assume zero prior knowledge.** Do not reference "what we did yesterday" or "as you know."
- **Be specific about examples.** "Use the pizza analogy" not "use a relatable analogy."
- **Include interaction cues.** "Ask students: which is bigger, 1/2 or 1/4?" -- the colleague knows exactly what question to pose.
- **Number or order tasks.** "First explain X, then demonstrate Y" provides flow.
- **Keep it scannable.** The colleague may be reading these 5 minutes before the lesson. Dense paragraphs are hostile.

## Sources

Research findings aggregated from:
- [Duarte - Speaker Notes in PowerPoint](https://www.duarte.com/blog/everything-need-know-using-speaker-notes-in-powerpoint/) -- MEDIUM confidence (content not fully accessible but principles verified via other sources)
- [Microsoft - Print slides with notes](https://support.microsoft.com/en-us/office/print-your-powerpoint-slides-handouts-or-notes-194d4320-aa03-478b-9300-df25f0d15dc4) -- HIGH confidence (authoritative)
- [Moreland - Creating Substitute Plans](https://moreland.edu/resources/blog-insights/creating-substitute-plans-without-stress-a-teachers-guide-how-ai-can-help) -- HIGH confidence (directly relevant domain)
- [Education Corner - Creating Effective Sub Plans](https://www.educationcorner.com/how-create-sub-plans/) -- HIGH confidence (directly relevant domain)
- [Teaching Hub - Five Rules for Presentation Slides](https://teachinghub.barefield.ua.edu/faculty-blog/technology/five-rules-to-create-engaging-legible-presentation-slides/) -- MEDIUM confidence
- [Readability Guidelines - Presentations](https://readabilityguidelines.co.uk/audiences-devices-channels/presentations/) -- MEDIUM confidence
- [Free Power Point Templates - Talking Points](https://www.free-power-point-templates.com/articles/talking-points-for-presentations/) -- MEDIUM confidence
- [PptxGenJS API - Text](https://gitbrent.github.io/PptxGenJS/docs/api-text.html) -- HIGH confidence (official docs)
- Codebase analysis: pptxService.ts, exportService.ts, ExportModal.tsx, posterService.ts, types.ts, geminiService.ts, claudeProvider.ts -- HIGH confidence (primary source)
