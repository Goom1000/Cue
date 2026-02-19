# Feature Landscape: Scripted Import, Day Picker, Claude Chat Tips

**Domain:** Structured lesson plan import for teaching presentation app
**Researched:** 2026-02-19
**Overall confidence:** HIGH (deep codebase review + ecosystem survey)

---

## Context: Why This Milestone Exists

Cue has three generation modes (Fresh, Refine, Blend) that all run a full AI pipeline. This works well for unstructured or lightly structured lesson plans. But a growing workflow pattern exists: teachers use Claude (or ChatGPT) in chat to generate highly structured, scripted lesson plans with explicit markers (`Say:`, `Write on board:`, `Ask:`), then want to turn those into presentations. Running these through the AI pipeline dilutes the carefully chosen wording. The teacher's exact script is the value -- AI should not rewrite it.

**The three new features address this workflow:**
1. **Scripted Import** -- parse structured markers, map directly to slides, preserve verbatim
2. **Day Picker** -- multi-day lesson plans are common; let teacher select which day(s) to import
3. **Claude Chat Tips** -- close the loop: give teachers a prompt template that produces Cue-optimized output

---

## Table Stakes

Features users expect when a scripted import mode exists. Missing any of these = the feature feels broken.

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| Verbatim script preservation | The entire value proposition. `Say:` blocks must appear word-for-word in `speakerNotes`. If the AI rewrites the teacher's script, the feature has failed. | Med | New parser, pipeline mode gate | Direct mapping: `say` blocks -> `speakerNotes` segments. No AI content generation. |
| Automatic marker detection | Teacher uploads a DOCX/PDF. Cue recognizes `Say:`, `Ask:`, `Write on board:`, section headings without teacher intervention. | Med | New `scriptedParser.ts` | ~15 marker patterns following `phasePatterns.ts` architecture. See Marker Catalogue below. |
| Slide boundary detection | A scripted plan has natural slide boundaries at section headings, phase transitions, and topic shifts. The parser must identify where one slide ends and another begins. | Med | Parser + section heading detection | Combination of: `## Section` headings, phase markers (`### I Do`), and blank-line-separated marker groups. Fallback: each major section heading starts a new slide. |
| Progressive disclosure mapping | `Say:` blocks within a slide must map to teleprompter segments separated by the existing pointing-right delimiter, so presentation mode works normally. | Low | Parser -> mapper | Each `say` block within a slide = one teleprompter segment. First segment = intro context. Identical to how AI-generated `speakerNotes` already work. |
| AI image prompts | Slides need images. The teacher's script doesn't include image descriptions. AI generates one-sentence `imagePrompt` per slide based on slide content. | Low | Existing provider interface | Small, cheap AI call (~50 tokens per slide). Same API used for gap slide generation. |
| AI layout assignment | Each slide needs a `layout` value from the existing enum. AI picks the best match based on content type. | Low | Same AI call as image prompts | Piggyback on image prompt call. `layout` is a single enum value per slide. |
| Phase detection on imported content | Scripted slides should get lesson phase labels (Hook, I Do, We Do, You Do, Plenary) exactly like AI-generated decks. | None | `detectPhasesInText()` already exists | Zero new work. Existing phase detector runs on any text. Section headings like `### I Do` are already detected as structural patterns. |
| Question flag detection | `Ask:` blocks should set `hasQuestionFlag: true` on the slide. | Low | Parser marker type | Direct mapping during block-to-slide conversion. One line of code. |
| Mode selector on landing page | Teacher needs a way to choose Scripted Import mode (alongside Fresh/Refine/Blend). | Low | UI change in `App.tsx` landing page | Extend the existing mode indicator. Currently mode is auto-detected from file uploads; scripted mode needs an explicit toggle or auto-detection from marker density. |

## Differentiators

Features that elevate scripted import beyond "paste text into a notes app."

| Feature | Value Proposition | Complexity | Depends On | Notes |
|---------|-------------------|------------|------------|-------|
| Multi-day lesson plan splitting (Day Picker) | Teachers often write 3-5 day lesson plans as a single document. Selecting "Day 2" and importing just that day's slides is unique -- no other presentation tool does this. Common Planner offers day-level views but not import-time splitting. | Med | Day boundary detection in parser + `DayPicker.tsx` component | Day boundaries detected by regex (`## Day 1`, `Day 2:`, `--- Day 3 ---`). Teacher selects day(s) via clickable cards. Default: first day selected. |
| Claude chat prompt template | Creates a complete content pipeline: teacher prompts Claude with Cue-optimized template -> Claude outputs structured plan -> teacher pastes into Cue -> Scripted Import preserves perfectly. No competitor offers this bridge. | Low | Independent of parser | Static JSX page with copy button (`navigator.clipboard.writeText()`). No API integration needed. |
| Italic text as teacher action detection | In DOCX lesson plans, italic text often indicates teacher actions (e.g., *point to the number line*, *distribute worksheets*). Detecting these and mapping to teleprompter action cues adds context that raw text extraction misses. | Med | Switch DOCX processing from `mammoth.extractRawText()` to `mammoth.convertToHtml()` | **Critical discovery:** The existing `docxProcessor.ts` uses `extractRawText()` which strips all formatting. Italic teacher actions are lost. For scripted mode, need HTML output to detect `<em>` tags. See Pitfalls section in PITFALLS.md. |
| Mixed-marker tolerance | Real lesson plans mix explicit markers (`Say:`) with unmarked prose. The parser handles partially-marked documents gracefully -- detecting what it can, treating unmarked text as general slide content. | Med | Parser fallback logic | Unmarked text between markers becomes slide `content` bullets. No hard failure if document only has some markers. |
| Content-type slide mapping | `Ask:` blocks auto-set question-optimized layouts. `Activity:` blocks auto-set `work-together` slide type. Gives scripted imports slide variety without AI. | Low | Parser marker types -> layout lookup table | Lookup table: `ask` -> `hasQuestionFlag: true`, `activity` -> `slideType: 'work-together'`, `write-on-board` -> primary content bullets. |
| Import preview | Before generating, show the teacher what was detected: "Found 3 days, 12 sections, 45 script blocks. Day 1 has Hook, I Do, We Do, You Do, Plenary." Builds confidence in the parser. | Med | `ScriptedParseResult` rendered as summary card | Teacher confirms before proceeding. Optional -- can show a simple toast initially and add full preview later. |
| Timing annotation extraction | `(5 min)` or `Time: 10 minutes` annotations stored as metadata on slides and surfaced in teleprompter or UI. | Low | Regex pattern in parser | Nice for teacher reference. Low effort, adds professional polish. |
| "What to watch for" metadata | Many scripted plans include `What to watch for:` monitoring notes. Surface these in the teleprompter as teacher alerts. | Low | Parser marker + teleprompter segment | Maps to a distinct teleprompter segment type (could use a visual indicator like a callout). |

## Anti-Features

Features to explicitly NOT build. Each would add complexity without proportional value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| AI rewriting of scripted content | Defeats the entire purpose. If the teacher wanted AI paraphrasing, they would use Fresh mode. The `Say:` marker means "this is my exact wording." | Preserve verbatim. AI touches only image prompts and layouts. |
| Gap analysis for scripted mode | The teacher's script IS the authority. Running gap analysis implies the script is incomplete, which is disrespectful to the teacher's preparation. | Skip Pass 2/3 entirely (same gate as Refine mode in pipeline). |
| Verbosity variants for scripted mode | Scripted text is the teacher's chosen verbosity. Concise/standard/detailed variants would require AI rewriting, contradicting verbatim preservation. | Use teacher's text as-is. Hide verbosity toggle when scripted mode is active. |
| Claude API integration from within Cue | Connecting to Claude's API for automatic lesson plan generation would require API key management, a second provider flow, and blur the boundary between generation and import. | Provide a copyable prompt template. Teacher uses their own Claude chat session, pastes the output into Cue. Simple, no auth needed, no additional API costs. |
| Automatic day import without confirmation | Auto-importing all days without letting the teacher choose creates unwanted content. A 5-day plan imported in full would produce 40-60+ slides. | Always show day picker when multi-day detected. Default to Day 1 selected. |
| Custom marker configuration UI | Letting teachers define their own markers via a settings interface. | Support 15+ common variants out of the box. Expand based on user feedback. The marker set covers UK, US, and Australian conventions. |
| Rich-text rendering in slides | Converting Markdown bold/italic/links to styled slide content. Slides use plain text arrays and Tailwind styling. | Strip formatting during parsing for slide content. Use italic detection only for classification (teacher actions vs. student-facing content), not for rendering. |
| Real-time drag-and-drop editing of parsed structure | Allowing the teacher to reorder blocks, reassign sections before import. | Parse, preview, import. Post-import editing uses the existing slide editor which already supports reordering. |

---

## Feature Dependencies

```
DOCX/PDF Upload
  |
  v
scriptedParser.ts (marker detection + day splitting + italic detection)
  |
  +-> DayPicker.tsx (UI for multi-day selection)
  |     |
  |     +-> scriptedMapper.ts (selected blocks -> Slide[])
  |           |
  |           +-> AI image/layout call (minimal, per-slide)
  |           |
  |           +-> phaseDetector.ts (assign lesson phases - already built)
  |           |
  |           +-> generationPipeline.ts (scripted branch, return slides)
  |
  +-> Import preview card (summary of detected structure)
  |
  +-> ClaudeTips.tsx (independent, no dependencies on parser)
```

**Critical path:** `scriptedParser.ts` -> `scriptedMapper.ts` -> pipeline integration -> landing page mode selector
**Independent:** `ClaudeTips.tsx` can be built at any time
**Dependent on parser:** `DayPicker.tsx` needs `ScriptedParseResult` type from parser

---

## MVP Recommendation

**Phase 1: Core Scripted Import (parser + mapper + pipeline)**
1. Scripted parser with marker detection -- the foundation everything depends on
2. Block-to-slide mapper with verbatim `speakerNotes` preservation
3. Generation pipeline scripted branch (skip AI content generation, skip gap analysis)
4. AI image prompt + layout assignment (minimal call per slide)
5. Phase detection integration (free -- already built)
6. Mode selector on landing page

**Phase 2: Multi-Day Support (day picker)**
7. Day boundary detection in parser
8. Day picker UI component (clickable cards with section preview)
9. Selected-day filtering before block-to-slide mapping

**Phase 3: Claude Chat Integration Tips**
10. Prompt template page with copy button
11. Example output showing expected Cue-compatible format
12. Link from landing page or settings

**Defer to post-launch:**
- Timing annotation extraction: Low-effort but not core value. Add after launch.
- Import preview panel: Start with a toast ("Found 12 sections in 3 days"), upgrade to full preview later.
- "What to watch for" metadata: Enrichment feature, not blocking.
- Italic teacher action detection: Requires DOCX processing change. Can be Phase 1 if scope allows, or Phase 2 if not.

---

## Marker Catalogue

The scripted parser should detect these markers. Each has structural (line-anchored) and content (inline) variants, following the `phasePatterns.ts` architecture.

### Teacher Speech Markers
| Marker | Variants | Maps To |
|--------|----------|---------|
| `Say:` | "Say:", "Teacher says:", "Script:", "Read aloud:", "Read out:", "Tell students:" | `speakerNotes` segment (verbatim) |

### Board Work Markers
| Marker | Variants | Maps To |
|--------|----------|---------|
| `Write on board:` | "Write on board:", "Board:", "Board work:", "Write:", "Display:", "Show:" | `content` bullet (student-facing) |

### Question Markers
| Marker | Variants | Maps To |
|--------|----------|---------|
| `Ask:` | "Ask:", "Ask students:", "Ask the class:", "Question:", "Q:", "Check for understanding:" | `content` bullet + `hasQuestionFlag: true` |

### Activity Markers
| Marker | Variants | Maps To |
|--------|----------|---------|
| `Activity:` | "Activity:", "Task:", "Do:", "Students do:", "Independent practice:", "Group work:", "Partner task:" | Slide with `slideType: 'work-together'` |

### Resource Reference Markers
| Marker | Variants | Maps To |
|--------|----------|---------|
| `Resource:` | "Resource:", "Handout:", "Worksheet:", "See:", "Use:", "Distribute:" | `speakerNotes` action cue |

### Teacher Action Markers
| Marker | Variants | Maps To |
|--------|----------|---------|
| Italic text | `<em>...</em>` from DOCX HTML, `*...*` from Markdown | `speakerNotes` action cue (e.g., "[Action: point to the number line]") |
| Explicit | "Teacher action:", "Do:", "Model:" | `speakerNotes` action cue |

### Timing Markers
| Marker | Variants | Maps To |
|--------|----------|---------|
| Timing | "(5 min)", "(5 minutes)", "Time: 10 min", "[10 minutes]", "5 mins" | Slide metadata / teleprompter timing note |

### Monitoring Markers
| Marker | Variants | Maps To |
|--------|----------|---------|
| `What to watch for:` | "What to watch for:", "Look for:", "Monitor:", "Check that:" | `speakerNotes` teacher alert segment |

### Objective Markers
| Marker | Variants | Maps To |
|--------|----------|---------|
| Target emoji | Lines starting with target emoji | Slide title annotation or first slide objective |

### Day/Session Boundaries
| Marker | Variants | Maps To |
|--------|----------|---------|
| Day boundary | "## Day 1", "Day 1:", "--- Day 1 ---", "LESSON 1", "Session 1:" | `DaySection` boundary in parser |

### Section Headings (reuse existing phase detection)
| Marker | Variants | Maps To |
|--------|----------|---------|
| Phase heading | "## Hook", "### I Do", "We Do:", "Independent Practice:", "Define & Recall" | Slide `title` + `lessonPhase` assignment |

---

## Claude Chat Output Format Specification

The prompt template should instruct Claude to output lesson plans in this exact format, which the scripted parser handles natively:

```markdown
## Day 1: [Topic Title]

### Hook (5 min)
Say: [Teacher's opening script -- energetic, sets context]
Ask: [Engagement question to hook student interest]

### I Do / Modelling (10 min)
Say: [Teacher explanation of the concept]
Write on board: [Key content students see on screen]
Say: [Continue explanation, refer to what's on board]
*point to the first example on the board*

### We Do / Guided Practice (15 min)
Say: [Set up the guided practice activity]
Ask: [Check for understanding question] (Answer: [expected answer])
Activity: [Description of what students do together with the teacher]
What to watch for: [Common misconceptions or things to monitor]

### You Do / Independent Practice (15 min)
Say: [Instructions for independent work]
Activity: [Description of independent task]
Resource: [Any worksheets or materials needed]
(15 min)

### Plenary (5 min)
Ask: [Reflection question about what was learned]
Say: [Summary of lesson and preview of next session]

---

## Day 2: [Next Topic Title]
...
```

This format:
- Uses standard Markdown headings (detected by existing phase patterns)
- Uses explicit markers (detected by scripted parser)
- Separates days with `---` + `## Day N` (detected by day boundary regex)
- Includes timing annotations in parentheses
- Uses italic text for teacher actions
- Is human-readable even without Cue
- Is unambiguous for machine parsing

---

## Ecosystem Context

### How Other Tools Handle This Space

**No direct competitor** offers a scripted import mode that preserves teacher scripts verbatim while generating presentations. The closest analogues:

| Tool | What It Does | How Cue Differs |
|------|--------------|-----------------|
| **Eduaide.ai** (Lesson Builder) | Generates structured lesson plans with 5E or Gagne's Nine Events frameworks. Exports to Google Docs/Word. | Eduaide generates plans but does not import them into presentations. Cue does the reverse: imports plans into presentations. |
| **Common Planner** | Calendar-based planner with day/week/month/unit views. Supports multi-day stretching and lesson reordering. | Common Planner is a planning tool, not a presentation tool. Its day-level navigation pattern informs our day picker UX (selectable days, preview of sections). |
| **Monsha AI** | Generates full lesson plans from topic/file/standard, exports to Docs/Slides/Word/PPT. | Monsha generates both plans and slides, but always through AI -- no verbatim preservation mode. |
| **Brisk AI** | Generates slides from articles/videos/topics. Also builds unit plans. | Brisk is AI-all-the-way. No import-without-rewriting mode. |
| **ChatGPT for Teachers** | Free workspace for K-12 educators with custom GPTs for lesson planning. | Generates plans in chat, but no bridge to presentation tools. Teachers copy-paste manually. Cue's Claude tips fill this gap. |

**The unique value:** Cue sits at the intersection of structured lesson plan OUTPUT (from Claude/ChatGPT) and presentation INPUT (for classroom delivery). The scripted import mode is the bridge no one else has built.

### Multi-Day UX Patterns from Ed-Tech

From ecosystem research, multi-day interfaces in education tools follow these patterns:
- **Clickable day cards** with content preview (Common Planner, Class Planner)
- **Single-select default** with multi-select option (most calendar apps)
- **Content preview** showing section count or topic names per day
- **Persistent selection** -- chosen day stays selected after import

Our day picker should follow these conventions: clickable cards showing day label + section preview, single day selected by default (Day 1), with option to select multiple days.

---

## Key Technical Discovery: DOCX Formatting Loss

The existing `docxProcessor.ts` (line 31) uses `mammoth.extractRawText()` which discards all formatting. This means italic teacher actions from DOCX files are silently lost. For scripted import to detect teacher actions marked with italics, the processor needs to use `mammoth.convertToHtml()` instead, which preserves bold (`<strong>`), italic (`<em>`), and heading structure (`<h1>`-`<h6>`).

**Impact:** This is a medium-complexity change to the DOCX processing pipeline. It affects the upstream data that feeds into the scripted parser. The parser would scan for `<em>` tags in HTML output and classify their content as teacher actions.

**Important caveat from mammoth.js docs:** Mammoth matches text that has had italic explicitly applied to it, but will not match text that is italic because of its paragraph or run style. This means if a Word template applies italic via a named style (e.g., "Teacher Action" style), mammoth may not detect it. Explicitly formatted italic text (the common case for teacher-authored documents) works correctly.

---

## Sources

- **Codebase analysis** (HIGH confidence): Feature landscape derived from extensive source code review
  - `phaseDetection/phaseDetector.ts` -- 289 lines, regex phase detection architecture
  - `phaseDetection/phasePatterns.ts` -- 161 lines, marker pattern definitions
  - `contentPreservation/detector.ts` -- 672 lines, question/activity/instruction detection (Ask: patterns exist)
  - `generationPipeline.ts` -- 329 lines, three-pass pipeline with mode gating at line 164
  - `geminiService.ts` + `claudeProvider.ts` -- generation prompts, mode handling
  - `docxProcessor.ts` -- current `extractRawText()` usage (formatting loss identified)
  - `types.ts` -- Slide interface, GenerationMode, CueFile format
  - `App.tsx` -- landing page mode derivation (`uploadMode` useMemo)
- **Ecosystem research** (MEDIUM confidence): Competitor landscape from web search
  - [Eduaide.ai Lesson Builder](https://www.eduaide.ai/solutions/lesson-builder) -- structured lesson plan generation
  - [Common Planner Day Views](https://www.commonplanner.com/) -- multi-day navigation patterns
  - [Monsha AI](https://monsha.ai/) -- AI lesson plan to presentation generation
  - [Brisk AI Tools for Teachers](https://www.briskteaching.com/ai-tools-for-teachers) -- AI slide generation from content
  - [mammoth.js README](https://github.com/mwilliamson/mammoth.js) -- `convertToHtml()` vs `extractRawText()` capabilities confirmed
  - [Claude Prompt Engineering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview) -- structured output format guidance
  - [Common Planner Help - Day Views](https://www.commonplanner.com/help/en/articles/11943008-5-adjusting-your-lesson-calendar) -- multi-day UX patterns
  - [ChatGPT for Teachers](https://www.educatorstechnology.com/2026/02/chatgpt-for-education-teachers-guide.html) -- AI chat for education workflows
