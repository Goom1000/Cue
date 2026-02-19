# Feature Landscape: Scripted Import, Day Picker, and Claude Chat Tips

**Domain:** Lesson presentation app -- new import mode and UI features
**Researched:** 2026-02-19

---

## Table Stakes

Features users expect once they hear "scripted import mode." Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Parse Say:/Ask:/Write: cues into slides | Core promise of scripted mode. Without it, the feature does not exist. | Medium | Regex parser with ~6 cue types. Follow phaseDetector pattern. |
| Teacher speech becomes teleprompter | Say: cues map to speakerNotes with point-hand delimiters. Teachers expect their words preserved verbatim. | Low | String concatenation with existing delimiter format. |
| Questions flagged on slides | Ask: cues must set `hasQuestionFlag: true` and appear as slide content. Teachers rely on this for pacing. | Low | Boolean flag already exists on Slide interface. |
| Phase labels preserved | Phase: headers map to existing LessonPhase. Teachers using GRR structure expect phase badges. | Low | Reuse `detectPhasesInText()` on header text. |
| DOCX upload for lesson plan | Teachers will export from Claude/ChatGPT as Word docs. PDF-only upload is a deal-breaker. | Low | `processDocx()` already exists; just wire to lesson plan upload zone. |
| Image generation on scripted slides | Slides need background images. AI must generate imagePrompts even though content is teacher-authored. | Medium | Single batched AI call for all slides. |
| Layout assignment | Slides need appropriate layouts (split, center-text, etc.) based on content. | Low | Include in the same AI call as image prompts. |
| Multi-day detection | When teachers paste a 5-day unit plan, Cue must detect the multi-day structure. | Low | Regex for "Day 1", "Lesson 2", "Monday", etc. |
| Day selection before generation | Teachers pick which day to generate. Without this, they get a bloated 50-slide deck. | Low | Simple pill/radio selector component. |

---

## Differentiators

Features that set Cue's scripted mode apart from other tools. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Auto-detect scripted format | Cue automatically switches to scripted mode when it detects Say:/Ask: patterns. No manual mode toggle needed. | Low | Heuristic: 3+ cue markers = scripted. |
| "Write on board" as visual slide content | Teachers who write "Write on board: 3/4 + 1/4 = 1" see it as a prominent slide bullet, not buried in notes. | Low | Parser routing: Write: cues go to `content[]`, Say: cues go to `speakerNotes`. |
| Verbatim preservation guarantee | Unlike fresh/blend mode, scripted mode never paraphrases teacher content. What you write is what you get. | Low | Architectural decision, not code complexity. |
| Parse warnings with line numbers | If a line cannot be parsed (no cue marker, malformed), show warning with line number so teacher can fix it. | Low | Accumulate warnings during parsing, display as toast. |
| "Use entire plan" option in day picker | For short multi-day plans, teachers may want all days in one deck. Day picker includes "Use All" option. | Low | `onSelectAll` callback sets selectedDayIndex to null. |
| Claude prompt template | A copyable prompt template in the tips panel that teachers can paste directly into Claude chat. | Low | Static string in ClaudeTips component. |
| Show: cue as image prompt seed | "Show: diagram of water cycle" becomes the seed for image generation, giving teachers control over visuals. | Low | Map Show: text to imagePrompt field before AI enhancement. |

---

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| AI rewriting of Say: content | Destroys teacher voice. The whole point of scripted mode is verbatim preservation. | Keep Say: text as-is in speakerNotes. |
| Verbosity adjustment of scripted teleprompter | Teacher wrote exactly the script they want. Concise/detailed modes would paraphrase it. | Skip verbosity for scripted slides. May revisit later if teachers request it. |
| Rich DOCX formatting preservation | Bold, italic, heading styles from DOCX are lost in mammoth text extraction. Attempting to preserve them adds significant complexity for minimal gain. | Accept plain text output from mammoth. The scripted cue markers (Say:, Ask:) provide all the structure needed. |
| Merging multiple days into one deck | Multi-day merge produces unfocused decks. Each day should be its own generation run. | Day picker selects one day. Teacher can generate each day separately and manage multiple .cue files. |
| Gap analysis for scripted mode | The teacher defined exactly what they want. AI checking for "gaps" is nonsensical -- there is no reference document to compare against. | Skip Pass 2 and 3 entirely. |
| Slide reordering in scripted mode | Scripted lessons have a deliberate order. Auto-reordering would break the flow. | Slides appear in parse order. Teacher can drag-reorder in the editor if needed (existing feature). |
| Claude API integration | This milestone is about tips for using Claude chat (claude.ai), not calling the Claude API from Cue. API integration already exists. | Static tips panel only. |

---

## Feature Dependencies

```
processDocx (existing) --> DOCX upload in lesson plan zone
                             |
                             v
detectScriptedFormat --> auto mode switching --> uploadMode = 'scripted'
                             |
                             v
parseScriptedLesson --> scriptedCuesToSlides --> Slide[]
                             |
                             v
detectDays -----------> DayPicker component --> selectedDayIndex
                             |
                             v
                    handleGenerate (with effective text)
                             |
                             v
              runScriptedPipeline (mode gate)
                             |
                             v
                 enhanceScriptedSlides (AI: images + layouts)
```

```
ClaudeTips (independent, no dependencies)
```

---

## MVP Recommendation

Prioritize for first delivery:

1. **Scripted parser with Say/Ask/Write cues** -- This is the core value. Everything else is useless without it.
2. **DOCX upload on lesson plan zone** -- Teachers will paste from Claude as .docx. Already have the processor.
3. **Auto-detect scripted format** -- Removes friction. Teacher does not need to know about "modes."
4. **Pipeline integration (mode gate + skip Pass 2/3)** -- Parser output must flow through to slides.
5. **AI enhancement (image prompts + layouts)** -- Slides look naked without images.
6. **Day picker** -- Multi-day plans are common. Without this, long plans produce unwieldy decks.
7. **Claude tips panel** -- Low effort, teaches teachers the format.

Defer:

- **Show: cue parsing** -- Not all teachers will use this. Can be added later. For MVP, all slides get AI-generated image prompts.
- **Activity:/Do: cue variants** -- Start with Say/Ask/Write. Add more cue types based on user feedback.
- **Parse warning display** -- Console.log warnings for now. Toast display can come in a polish pass.

---

## Sources

- Direct codebase analysis of `App.tsx`, `generationPipeline.ts`, `aiProvider.ts`, `phaseDetector.ts`, `docxProcessor.ts`
- Existing feature patterns: content preservation, phase detection, mode switching
