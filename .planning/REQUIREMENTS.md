# Requirements: Cue v6.0 Scripted Import

**Defined:** 2026-02-19
**Core Value:** Students see only the presentation; teachers see the teleprompter script that lets them sound knowledgeable and natural.

## v6.0 Requirements

Requirements for Scripted Import milestone. Each maps to roadmap phases.

### Scripted Parser

- [ ] **PARSE-01**: Parser detects `Say:` markers and extracts verbatim teacher script (including multi-line continuation)
- [ ] **PARSE-02**: Parser detects `Ask:` markers and extracts questions with expected answers
- [ ] **PARSE-03**: Parser detects `Write on board:` markers and extracts student-facing content
- [ ] **PARSE-04**: Parser detects `Activity:` markers and extracts activity instructions
- [ ] **PARSE-05**: Parser detects section headings (## Hook, ### I Do, ### We Do, ### You Do, ### Plenary) as slide boundaries
- [ ] **PARSE-06**: Parser treats unmarked prose (20+ chars between markers) as implicit Say: blocks rather than dropping content
- [ ] **PARSE-07**: Parser splits multi-day lesson plans on `## Day N` boundaries into separate day sections
- [ ] **PARSE-08**: Parser returns typed `ScriptedParseResult` with blocks, days, and parse statistics

### Slide Mapper

- [ ] **MAP-01**: Mapper converts `ScriptedBlock[]` to `Slide[]` with correct field mapping (Say: → speakerNotes, Write on board: → content[], Ask: → content[] with hasQuestionFlag)
- [ ] **MAP-02**: Mapper enforces segment count invariant: speakerNotes has exactly (content.length + 1) 👉-delimited segments per slide
- [ ] **MAP-03**: Mapper creates slide boundaries only on section headings and phase transitions (not per-marker)
- [ ] **MAP-04**: Mapper assigns lessonPhase from section headings using existing phase detection patterns
- [ ] **MAP-05**: Mapper sets `slideType: 'work-together'` on slides generated from Activity: blocks

### Pipeline Integration

- [ ] **PIPE-01**: `GenerationMode` type extended with `'scripted'` value across all providers and switch sites
- [ ] **PIPE-02**: Scripted mode bypasses all three AI passes (generate, gap analysis, auto-fill) in generation pipeline
- [ ] **PIPE-03**: Scripted mode calls AI only for batch image prompt generation and layout assignment (~700 tokens)
- [ ] **PIPE-04**: AI image prompt failure does not block slide import (fallback: synthesized prompts from slide titles)
- [ ] **PIPE-05**: Existing Fresh/Refine/Blend modes unaffected by scripted mode addition (regression-safe)

### Day Picker

- [ ] **DAY-01**: Day picker UI appears between upload and generation when 2+ days detected
- [ ] **DAY-02**: Day cards show day number, title, and section/block count preview
- [ ] **DAY-03**: User can select one or more days to generate decks for
- [ ] **DAY-04**: Select-all option available for importing all days
- [ ] **DAY-05**: Cross-day reference warning shown when importing a subset of days

### Mode Selector

- [ ] **MODE-01**: Landing page provides explicit toggle between AI generation and scripted import after lesson plan upload
- [ ] **MODE-02**: Scripted mode available for DOCX, PDF, and plain text uploads
- [ ] **MODE-03**: Import preview displays detected statistics (days, sections, script blocks) before generation

### Claude Chat Tips

- [ ] **TIPS-01**: Static tips page accessible from landing page with copyable prompt template for Claude chat
- [ ] **TIPS-02**: Format specification shows supported markers (Say:, Ask:, Write on board:, Activity:, section headings, Day headers)
- [ ] **TIPS-03**: Example output snippet demonstrates expected lesson plan structure
- [ ] **TIPS-04**: Copy-to-clipboard with toast feedback and HTTPS fallback
- [ ] **TIPS-05**: Shared `SUPPORTED_MARKERS` constant imported by both parser and tips page to prevent drift

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Scripted Import Enhancements

- **PARSE-F01**: Timing annotation extraction (`(5 min)` markers surfaced in teleprompter)
- **PARSE-F02**: `Show:` cue as image prompt seed for teacher-specified visuals
- **PARSE-F03**: `mammoth.convertToHtml()` for formatting-based markers (bold = board content, italic = teacher actions)
- **PARSE-F04**: Real-time parse preview with line-level highlighting

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| AI rewriting of scripted content | Defeats the feature's purpose -- verbatim preservation is the core value |
| Gap analysis in scripted mode | Teacher's script is authoritative, not incomplete |
| Verbosity variants for scripted mode | Requires AI rewriting, contradicts verbatim preservation |
| Claude API integration in-app | Tips page only, no automated Claude API calls for lesson plan generation |
| Auto-import all days without confirmation | Would produce 50+ slide decks unexpectedly |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PARSE-01 | Phase 69 | Pending |
| PARSE-02 | Phase 69 | Pending |
| PARSE-03 | Phase 69 | Pending |
| PARSE-04 | Phase 69 | Pending |
| PARSE-05 | Phase 69 | Pending |
| PARSE-06 | Phase 69 | Pending |
| PARSE-07 | Phase 69 | Pending |
| PARSE-08 | Phase 69 | Pending |
| MAP-01 | Phase 70 | Pending |
| MAP-02 | Phase 70 | Pending |
| MAP-03 | Phase 70 | Pending |
| MAP-04 | Phase 70 | Pending |
| MAP-05 | Phase 70 | Pending |
| PIPE-01 | Phase 70 | Pending |
| PIPE-02 | Phase 70 | Pending |
| PIPE-03 | Phase 71 | Pending |
| PIPE-04 | Phase 71 | Pending |
| PIPE-05 | Phase 70 | Pending |
| DAY-01 | Phase 72 | Pending |
| DAY-02 | Phase 72 | Pending |
| DAY-03 | Phase 72 | Pending |
| DAY-04 | Phase 72 | Pending |
| DAY-05 | Phase 72 | Pending |
| MODE-01 | Phase 72 | Pending |
| MODE-02 | Phase 72 | Pending |
| MODE-03 | Phase 72 | Pending |
| TIPS-01 | Phase 73 | Pending |
| TIPS-02 | Phase 73 | Pending |
| TIPS-03 | Phase 73 | Pending |
| TIPS-04 | Phase 73 | Pending |
| TIPS-05 | Phase 73 | Pending |

**Coverage:**
- v6.0 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-19 -- traceability updated with phase mappings*
