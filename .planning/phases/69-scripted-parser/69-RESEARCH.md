# Phase 69: Scripted Parser - Research

**Researched:** 2026-02-19
**Domain:** Pure-function text parsing for marker-annotated lesson plans
**Confidence:** HIGH

## Summary

Phase 69 implements a deterministic, pure-function parser that extracts typed blocks (Say, Ask, Write on board, Activity) from marker-annotated lesson plan text. The parser also handles multi-day plans with `## Day N` headers and section headings (Hook, I Do, We Do, You Do, Plenary) as slide boundary markers. Input is plain text; output is a typed `ScriptedParseResult` with blocks grouped by day and section. No AI, no side effects, no network calls.

The Cue codebase already has two production-proven pure-function parsing systems that provide the exact architectural blueprint: `phaseDetection/phaseDetector.ts` (regex-based phase boundary detection, 289 lines) and `contentPreservation/detector.ts` (marker-based question/activity/instruction detection, 672 lines). The scripted parser follows the same patterns: line-by-line scanning with regex, typed output interfaces, confidence levels, and comprehensive unit tests via Jest 30. Zero new dependencies are needed.

The key design challenge is multi-line block accumulation: a `Say:` marker starts a block, but the block content may span multiple lines until the next marker or heading. This differs from the existing detectors which match single lines. The parser must use a state machine approach -- tracking the "current block" and appending lines to it until a new marker or boundary is encountered.

**Primary recommendation:** Build as a single pure-function module at `services/scriptedParser/scriptedParser.ts` with a co-located types file and test file, following the `phaseDetection/` directory pattern. Use line-by-line state machine parsing with regex marker detection at each line start. Export a single entry point `parseScriptedLessonPlan(text: string): ScriptedParseResult`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Case-insensitive matching -- accept Say:, say:, SAY: -- normalize to Title Case in output
- Strict canonical markers only -- Say, Ask, Write on board, Activity -- no abbreviations or shorthands (prompt template in Phase 73 controls input format)
- Flexible whitespace after colon -- accept "Say:text", "Say: text", "Say:  text" -- trim content
- Line-start only -- markers recognized only at the beginning of a line to avoid false positives in natural text
- 5 canonical headings: Hook, I Do, We Do, You Do, Plenary -- these are the complete set
- Any order accepted -- parser detects boundaries, doesn't enforce pedagogical sequence
- No section headings = one big section -- still parse markers, just no phase labels
- Sections repeat per day -- each day can have its own Hook to Plenary cycle
- Unmarked prose = implicit Say: block -- any text without a marker is assumed to be teacher speech
- Preserve markdown formatting within blocks -- parser passes through bold/italic/lists verbatim, downstream phases decide rendering
- Consecutive same-type markers stay separate -- each marker instance creates its own block (preserves teacher's intentional pacing)
- Blank lines preserved within blocks (paragraph breaks), ignored between blocks (formatting whitespace)
- `## Day N` format with optional title -- e.g., `## Day 1` or `## Day 1: Introduction to Fractions`
- No day headers = single Day 1 default -- keeps data structure consistent (always >= 1 day)
- Warn on empty days -- parser succeeds but returns warnings for days with no blocks

### Claude's Discretion
- Heading level detection (which ## vs ### levels to recognize)
- Internal data structure design for ScriptedBlock
- Parsing algorithm and implementation approach
- Whitespace normalization details
- Error/warning format

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PARSE-01 | Parser detects `Say:` markers and extracts verbatim teacher script (including multi-line continuation) | Regex pattern `^Say\s*:\s*` at line start with state machine accumulation of subsequent unmarked lines. Case-insensitive via `/i` flag. Multi-line: all lines after marker until next marker/heading/day-boundary are appended to block content. |
| PARSE-02 | Parser detects `Ask:` markers and extracts questions with expected answers | Same pattern structure as PARSE-01. `^Ask\s*:\s*` at line start. Content after colon is the question text. Multi-line continuation captures expected answers on following lines. |
| PARSE-03 | Parser detects `Write on board:` markers and extracts student-facing content | Multi-word marker: `^Write\s+on\s+board\s*:\s*` (case-insensitive). Same accumulation strategy. The "on board" space-separated words make this the longest marker pattern. |
| PARSE-04 | Parser detects `Activity:` markers and extracts activity instructions | `^Activity\s*:\s*` at line start. Multi-line continuation for activity descriptions. |
| PARSE-05 | Parser detects section headings (## Hook, ### I Do, ### We Do, ### You Do, ### Plenary) as slide boundaries | Heading regex: `^#{2,3}\s*(Hook\|I\s+Do\|We\s+Do\|You\s+Do\|Plenary)\s*$` (case-insensitive). Creates section boundary markers, not content blocks. Recommend recognizing ## and ### levels (both are common in lesson plans). |
| PARSE-06 | Parser treats unmarked prose (20+ chars between markers) as implicit Say: blocks | State machine default: any line that doesn't match a marker, heading, or day boundary is accumulated as implicit Say content. 20-char threshold filters out stray whitespace/short formatting lines. |
| PARSE-07 | Parser splits multi-day lesson plans on `## Day N` boundaries | Day boundary regex: `^##\s*Day\s+(\d+)\s*(?::\s*(.+))?$` (case-insensitive). Splits input into day sections. No day headers = single implicit Day 1. |
| PARSE-08 | Parser returns typed `ScriptedParseResult` with blocks, days, and parse statistics | Output type includes: `days: DaySection[]`, `totalBlocks: number`, `totalDays: number`, `warnings: string[]`, and per-day block counts for verification. |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.8.2 | Type-safe parser output, discriminated unions for block types | Already in project; typed output is non-negotiable for downstream consumers |
| Jest | ^30.2.0 | Unit tests for pure-function parser | Already in project; `phaseDetector.test.ts` and `detector.test.ts` are the test pattern templates |

### Supporting

No supporting libraries needed. This is pure TypeScript string processing with RegExp.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written regex parser | `unified`/`remark` Markdown AST parser | Massively over-engineered. Lesson plan markers are simple line-anchored patterns. Regex handles them in <100 lines. Adding a Markdown AST parser (~15 transitive deps) for string matching adds dependency surface for no benefit. |
| Hand-written regex parser | `pegjs`/`chevrotain` parser generators | Lesson plans are natural-language documents with conventions, not formal languages. Formal grammar cannot handle the fuzzy boundaries well. Regex with line-anchoring (proven in `phasePatterns.ts`) is the right tool. |
| Line-by-line state machine | Single-pass regex on full text | Full-text regex is brittle for multi-line blocks and interleaved markers. Line-by-line gives clear state transitions and is easier to debug/test. |

**Installation:**
```bash
# No new dependencies needed
```

---

## Architecture Patterns

### Recommended Project Structure

```
services/
  scriptedParser/
    scriptedParser.ts        # Main parser: parseScriptedLessonPlan()
    scriptedParser.test.ts   # Comprehensive unit tests
    types.ts                 # ScriptedBlock, DaySection, ScriptedParseResult, etc.
```

This follows the `phaseDetection/` directory pattern (`phaseDetector.ts` + `phasePatterns.ts` + `phaseDetector.test.ts`).

### Pattern 1: Line-by-Line State Machine Parser

**What:** Process input text line by line, maintaining a "current block" state. Each line is tested against marker patterns, heading patterns, and day boundary patterns. Lines matching a new marker close the current block and start a new one. Unmarked lines are accumulated into the current block.

**When to use:** Always -- this is the core parsing strategy.

**Why:** The existing `phaseDetector.ts` uses full-text regex scanning (good for phase boundary detection where you need character offsets). But the scripted parser needs multi-line block accumulation where a single `Say:` marker owns all subsequent lines until the next marker. This requires sequential state tracking, which a line-by-line approach handles cleanly.

**Example:**

```typescript
// Source: Recommended pattern based on codebase analysis
type ParserState = {
  currentBlock: PartialBlock | null;
  currentDay: PartialDay;
  days: DaySection[];
  warnings: string[];
};

function parseScriptedLessonPlan(text: string): ScriptedParseResult {
  const lines = text.split('\n');
  const state: ParserState = {
    currentBlock: null,
    currentDay: { dayNumber: 1, title: null, blocks: [], section: null },
    days: [],
    warnings: [],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Priority 1: Day boundary
    const dayMatch = matchDayBoundary(line);
    if (dayMatch) {
      flushCurrentBlock(state);
      flushCurrentDay(state);
      state.currentDay = { dayNumber: dayMatch.dayNumber, title: dayMatch.title, blocks: [], section: null };
      continue;
    }

    // Priority 2: Section heading
    const sectionMatch = matchSectionHeading(line);
    if (sectionMatch) {
      flushCurrentBlock(state);
      state.currentDay.section = sectionMatch.section;
      state.currentDay.blocks.push({
        type: 'section-heading',
        markerType: 'section-heading',
        content: sectionMatch.section,
        lineNumber,
        section: sectionMatch.section,
      });
      continue;
    }

    // Priority 3: Explicit marker (Say:, Ask:, Write on board:, Activity:)
    const markerMatch = matchMarker(line);
    if (markerMatch) {
      flushCurrentBlock(state);
      state.currentBlock = {
        type: markerMatch.type,
        content: markerMatch.content,
        lineNumber,
        section: state.currentDay.section,
      };
      continue;
    }

    // Priority 4: Blank line handling
    if (line.trim() === '') {
      if (state.currentBlock) {
        // Preserve blank lines within blocks (paragraph breaks)
        state.currentBlock.content += '\n';
      }
      // Blank lines between blocks are ignored (formatting whitespace)
      continue;
    }

    // Priority 5: Unmarked prose -> implicit Say: block or continuation
    if (state.currentBlock) {
      // Continue accumulating into current block
      state.currentBlock.content += '\n' + line;
    } else if (line.trim().length >= 20) {
      // Start implicit Say: block (PARSE-06: 20+ chars threshold)
      state.currentBlock = {
        type: 'say',
        content: line,
        lineNumber,
        section: state.currentDay.section,
        implicit: true,
      };
    }
    // Lines < 20 chars with no current block are ignored (formatting noise)
  }

  flushCurrentBlock(state);
  flushCurrentDay(state);

  return buildResult(state);
}
```

### Pattern 2: Regex Marker Matching (follow `phasePatterns.ts`)

**What:** Each marker type has a regex pattern anchored to line start. Patterns are case-insensitive. The captured group extracts content after the colon.

**When to use:** For all 4 explicit markers plus section headings and day boundaries.

**Why:** Proven pattern. `phasePatterns.ts` uses the exact same approach for 6 phase types with structural + content pattern tiers. The scripted parser simplifies this (no content-tier patterns needed since we only match at line start per user decision).

**Example:**

```typescript
// Source: Pattern derived from phasePatterns.ts (line 40-134)
interface MarkerPattern {
  type: ScriptedBlockType;
  regex: RegExp;
}

// Order matters: longest match first to prevent partial matches
const MARKER_PATTERNS: MarkerPattern[] = [
  { type: 'write-on-board', regex: /^Write\s+on\s+board\s*:\s*(.*)/i },
  { type: 'activity',       regex: /^Activity\s*:\s*(.*)/i },
  { type: 'ask',            regex: /^Ask\s*:\s*(.*)/i },
  { type: 'say',            regex: /^Say\s*:\s*(.*)/i },
];

const DAY_BOUNDARY_PATTERN = /^##\s*Day\s+(\d+)\s*(?::\s*(.+))?$/i;

const SECTION_HEADING_PATTERN = /^#{2,3}\s*(Hook|I\s+Do|We\s+Do|You\s+Do|Plenary)\s*$/i;
```

### Pattern 3: Typed Output with Discriminated Unions

**What:** Use TypeScript discriminated unions for block types, ensuring downstream consumers can switch exhaustively on block type.

**When to use:** For the `ScriptedBlock` type definition.

**Why:** The codebase uses discriminated unions extensively: `GameState` (types.ts line 217), `EditAction` (types.ts line 439), `PresentationMessage` (types.ts line 245). This is the established pattern for type-safe variant handling.

**Example:**

```typescript
// Source: Codebase pattern from types.ts discriminated unions

// Block types that the parser can produce
type ScriptedBlockType = 'say' | 'ask' | 'write-on-board' | 'activity' | 'section-heading';

// Section labels from detected headings
type SectionLabel = 'Hook' | 'I Do' | 'We Do' | 'You Do' | 'Plenary';

interface ScriptedBlock {
  type: ScriptedBlockType;
  content: string;           // The text content after the marker (trimmed, multi-line preserved)
  lineNumber: number;        // 1-indexed line where the block starts
  section: SectionLabel | null;  // The section this block belongs to (null if no heading detected)
  implicit: boolean;         // true if this was unmarked prose treated as implicit Say:
}

interface DaySection {
  dayNumber: number;         // 1-indexed day number
  title: string | null;      // Optional title from "## Day 1: Title"
  blocks: ScriptedBlock[];   // All blocks in this day
}

interface ScriptedParseResult {
  days: DaySection[];
  totalBlocks: number;       // Sum of blocks across all days (excluding section-heading blocks)
  totalDays: number;         // days.length
  warnings: string[];        // e.g., "Day 3 has no content blocks"
  stats: ParseStats;
}

interface ParseStats {
  sayCount: number;
  askCount: number;
  writeOnBoardCount: number;
  activityCount: number;
  sectionHeadingCount: number;
  implicitSayCount: number;  // Subset of sayCount that were implicit
  totalLines: number;        // Input line count
  parsedLines: number;       // Lines that produced blocks
}
```

### Pattern 4: Normalize to Title Case on Output

**What:** Regardless of input casing (say:, SAY:, Say:), the output `type` field uses the canonical lowercase enum value, and any display labels use Title Case.

**When to use:** During block creation in the parser.

**Why:** User decision: "normalize to Title Case in output". The `type` field should be the lowercase TypeScript union value (`'say'`, `'ask'`, etc.) for programmatic use. Display labels are a separate concern (like `PHASE_DISPLAY_LABELS` in `phasePatterns.ts` line 140).

```typescript
// Display labels (like PHASE_DISPLAY_LABELS in phasePatterns.ts)
const BLOCK_TYPE_LABELS: Record<ScriptedBlockType, string> = {
  'say': 'Say',
  'ask': 'Ask',
  'write-on-board': 'Write On Board',
  'activity': 'Activity',
  'section-heading': 'Section Heading',
};
```

### Anti-Patterns to Avoid

- **Multi-pass full-text regex scanning:** The existing `phaseDetector.ts` scans the full text with global regex for each pattern. This works for phase detection (finding boundaries at character offsets) but is wrong for the scripted parser. The scripted parser needs sequential line-by-line processing to handle multi-line block accumulation. Do not copy the phaseDetector's scanning approach directly.

- **Parsing the marker prefix into the content:** When matching `Say: Hello class`, the content should be `"Hello class"`, not `"Say: Hello class"`. The regex capture group must exclude the marker and colon.

- **Treating blank lines as block terminators:** User decision states blank lines are preserved within blocks (paragraph breaks). Only new markers, headings, and day boundaries terminate blocks. A blank line in the middle of a multi-line `Say:` block is part of the content.

- **Enforcing section heading order:** User decision: "any order accepted". The parser must NOT reject or warn if headings appear in non-standard order (e.g., Plenary before Hook). It detects boundaries, it does not enforce pedagogy.

- **Mutating input:** Follow the codebase pattern (phaseDetector.ts line 152: "never mutates input"). All returned objects must be new instances.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown AST parsing | Custom Markdown tokenizer | Simple regex for `##`/`###` heading detection | Only need heading level detection, not full Markdown parsing. Two regex patterns suffice. |
| Case-insensitive matching | Manual `.toLowerCase()` + string comparison | RegExp `/i` flag | Built into the language, already used throughout codebase (`phasePatterns.ts` uses `/mi` flags extensively) |
| Title Case normalization | Custom titleCase() function | Lookup table (`BLOCK_TYPE_LABELS`) | Only 5 fixed values to map. A lookup is simpler and more explicit than a general-purpose function. |
| Multi-line text splitting | Custom character-by-character scanner | `text.split('\n')` + line-by-line iteration | The standard approach used by `estimateBulletCount` in `detector.ts` (line 558). Handles all newline variants when text comes from standard extraction pipelines. |

**Key insight:** The scripted parser's problem domain is well-understood text processing. Every sub-problem (regex matching, line splitting, state accumulation, type-safe output) has a proven solution in the existing codebase. The parser is a composition of existing patterns, not an invention.

---

## Common Pitfalls

### Pitfall 1: Multi-Line Block Truncation

**What goes wrong:** The parser captures only the first line after a `Say:` marker, dropping the remaining lines of a multi-paragraph teaching script.

**Why it happens:** Using a single-line regex like `/^Say:\s*(.+)/` which captures only to end-of-line. If the developer tests with single-line inputs, truncation goes undetected.

**How to avoid:** The state machine approach accumulates ALL subsequent lines into the current block until a new marker, heading, or day boundary is encountered. The regex only starts the block; line-by-line accumulation extends it.

**Warning signs:** Test fixture with a 3-paragraph Say: block produces a block with only the first paragraph. Success criteria #2 explicitly tests this.

### Pitfall 2: "Write on board" Partial Match

**What goes wrong:** The `Write on board:` marker has spaces in it. A naive pattern list that checks `Write:` before `Write on board:` will match `Write:` and leave `on board: content` as unmarked text.

**Why it happens:** Pattern matching order matters. Shorter patterns can consume the prefix of longer patterns.

**How to avoid:** Check `Write on board:` BEFORE any hypothetical `Write:` pattern. In the locked decisions, the only canonical markers are `Say`, `Ask`, `Write on board`, `Activity` -- and there is no `Write:` abbreviation. But the regex for `Write on board` must be robust: `/^Write\s+on\s+board\s*:\s*/i` handles flexible whitespace between words.

**Warning signs:** Blocks with content starting with "on board:" appear in the output.

### Pitfall 3: Day Boundary False Positives

**What goes wrong:** Text like "On Day 1 of the experiment..." inside a Say: block is incorrectly matched as a `## Day 1` boundary, splitting the lesson plan at the wrong point.

**Why it happens:** If the day boundary regex is too permissive (e.g., `/Day\s+\d+/i` without line-start anchor or heading prefix requirement).

**How to avoid:** The user decision locks the format to `## Day N`. The regex must require the `##` heading prefix: `/^##\s*Day\s+(\d+)/i`. This is structurally unambiguous -- `## Day 1` at line start is always a heading, never body text. The `##` prefix acts as a reliable discriminator, similar to how `phasePatterns.ts` uses `^[\s*\-#]*` line-start anchoring.

**Warning signs:** A single-day lesson plan that mentions "Day 2 of the project" produces a multi-day parse result.

### Pitfall 4: Section Heading vs. Day Heading Collision

**What goes wrong:** `## Hook` is a section heading (PARSE-05) and `## Day 1` is a day boundary (PARSE-07). Both start with `##`. If heading detection runs before day detection, `## Day 1` might be treated as a section heading and not split the plan into days.

**Why it happens:** Both use `##` prefix. If section heading regex is too permissive (e.g., matching any `##` line), day boundaries get consumed.

**How to avoid:** Check day boundaries BEFORE section headings in the priority chain. The day boundary regex specifically matches `Day N`; the section heading regex specifically matches the 5 canonical headings (Hook, I Do, We Do, You Do, Plenary). They are mutually exclusive by content, but priority ordering provides defense-in-depth.

**Warning signs:** Day section count is wrong because `## Day N` lines were classified as section headings.

### Pitfall 5: Implicit Say: Block Threshold Edge Cases

**What goes wrong:** Short formatting lines (e.g., `---`, `***`, `* * *`) that are between 20-30 characters get treated as implicit Say: blocks.

**Why it happens:** The 20-character threshold (PARSE-06) only checks length, not content quality.

**How to avoid:** In addition to the 20-char minimum, filter out lines that are purely formatting: lines consisting only of `-`, `*`, `=`, `#`, or whitespace characters. A simple regex: `/^[\s\-*=#]+$/` identifies formatting-only lines.

**Warning signs:** Blocks with content like `---` or `* * *` appear as Say: blocks in the output.

### Pitfall 6: Trailing Whitespace in Block Content

**What goes wrong:** Multi-line blocks accumulate trailing spaces and newlines, producing content like `"Hello class\n\n\n"` instead of `"Hello class"`.

**Why it happens:** Blank lines within blocks are preserved (user decision), but trailing blank lines at the end of a block before the next marker should be trimmed.

**How to avoid:** When flushing a block (before starting a new one), trim trailing whitespace from the content. Preserve internal blank lines (paragraph breaks) but not trailing ones. Use `.replace(/\s+$/, '')` or `.trimEnd()`.

**Warning signs:** Block content ends with multiple newlines. Tests comparing exact string equality fail due to trailing whitespace.

---

## Code Examples

### Example 1: Marker Regex Patterns

```typescript
// Source: Derived from phasePatterns.ts structural pattern style

// Case-insensitive, line-start anchored, flexible whitespace after colon
const MARKER_PATTERNS: Array<{ type: ScriptedBlockType; regex: RegExp }> = [
  // Longest multi-word marker first to prevent partial matches
  { type: 'write-on-board', regex: /^Write\s+on\s+board\s*:\s*(.*)/i },
  { type: 'activity',       regex: /^Activity\s*:\s*(.*)/i },
  { type: 'ask',            regex: /^Ask\s*:\s*(.*)/i },
  { type: 'say',            regex: /^Say\s*:\s*(.*)/i },
];

// Day boundary: ## Day N with optional title
const DAY_BOUNDARY = /^##\s*Day\s+(\d+)\s*(?::\s*(.+))?$/i;

// Section headings: ## or ### followed by canonical heading name
const SECTION_HEADING = /^#{2,3}\s*(Hook|I\s+Do|We\s+Do|You\s+Do|Plenary)\s*$/i;
```

### Example 2: Section Label Normalization

```typescript
// Source: Codebase pattern from PHASE_DISPLAY_LABELS (phasePatterns.ts line 140)

// Normalize detected heading text to canonical SectionLabel
function normalizeSectionLabel(raw: string): SectionLabel {
  const lower = raw.trim().toLowerCase();
  const SECTION_MAP: Record<string, SectionLabel> = {
    'hook': 'Hook',
    'i do': 'I Do',
    'we do': 'We Do',
    'you do': 'You Do',
    'plenary': 'Plenary',
  };
  return SECTION_MAP[lower] ?? 'Hook'; // fallback should never happen with validated regex
}
```

### Example 3: Test Structure (following phaseDetector.test.ts)

```typescript
// Source: Pattern from phaseDetector.test.ts and detector.test.ts

import { describe, it, expect } from '@jest/globals';
import { parseScriptedLessonPlan } from './scriptedParser';

describe('parseScriptedLessonPlan', () => {
  describe('PARSE-01: Say marker detection', () => {
    it('detects Say: at line start with content after colon', () => {
      const text = 'Say: Good morning class, today we are learning about fractions.';
      const result = parseScriptedLessonPlan(text);

      expect(result.days).toHaveLength(1);
      expect(result.days[0].blocks).toHaveLength(1);
      expect(result.days[0].blocks[0].type).toBe('say');
      expect(result.days[0].blocks[0].content).toBe(
        'Good morning class, today we are learning about fractions.'
      );
    });

    it('captures multi-line Say: block until next marker', () => {
      const text = `Say: Welcome to today's lesson.
This is going to be really exciting.
We'll explore fractions in depth.

Ask: What do you already know about fractions?`;
      const result = parseScriptedLessonPlan(text);

      expect(result.days[0].blocks).toHaveLength(2);
      expect(result.days[0].blocks[0].type).toBe('say');
      expect(result.days[0].blocks[0].content).toContain('really exciting');
      expect(result.days[0].blocks[0].content).toContain("explore fractions");
      expect(result.days[0].blocks[1].type).toBe('ask');
    });

    it('handles case-insensitive matching: say:, SAY:, Say:', () => {
      const text = `say: lowercase test
SAY: uppercase test
Say: title case test`;
      const result = parseScriptedLessonPlan(text);

      expect(result.days[0].blocks).toHaveLength(3);
      result.days[0].blocks.forEach(block => {
        expect(block.type).toBe('say');
      });
    });
  });

  describe('PARSE-07: Multi-day splitting', () => {
    it('splits on ## Day N boundaries with accurate block counts', () => {
      const text = `## Day 1: Intro
Say: Welcome to day one.
Ask: What is a fraction?

## Day 2: Practice
Say: Let's practice fractions.
Activity: Complete the worksheet.`;
      const result = parseScriptedLessonPlan(text);

      expect(result.totalDays).toBe(2);
      expect(result.days[0].dayNumber).toBe(1);
      expect(result.days[0].title).toBe('Intro');
      expect(result.days[0].blocks).toHaveLength(2); // Say + Ask
      expect(result.days[1].dayNumber).toBe(2);
      expect(result.days[1].blocks).toHaveLength(2); // Say + Activity
    });
  });
});
```

### Example 4: Empty Day Warning

```typescript
// Source: Pattern from generationPipeline.ts warnings array (line 104)

// During day finalization:
function flushCurrentDay(state: ParserState): void {
  const contentBlocks = state.currentDay.blocks.filter(
    b => b.type !== 'section-heading'
  );
  if (contentBlocks.length === 0) {
    state.warnings.push(
      `Day ${state.currentDay.dayNumber} has no content blocks`
    );
  }
  state.days.push({
    dayNumber: state.currentDay.dayNumber,
    title: state.currentDay.title,
    blocks: state.currentDay.blocks,
  });
}
```

---

## Heading Level Detection (Claude's Discretion -- Recommendation)

The user left heading level detection as Claude's discretion. Here is the recommendation:

**Recognize both `##` and `###` for section headings.** Rationale:

1. Claude-generated lesson plans (from Phase 73 prompt template) will use `##` for day headers and `###` for section headings. This is the expected primary input format.
2. Hand-written lesson plans may use `##` for both days and sections, or `###` for sections. Accepting both levels catches more real-world formats.
3. The day boundary regex requires `## Day N` specifically (not `###`), so there is no ambiguity: `## Day 1` is always a day boundary, `## Hook` or `### Hook` are always section headings.

**Regex:** `/^#{2,3}\s*(Hook|I\s+Do|We\s+Do|You\s+Do|Plenary)\s*$/i`

This matches:
- `## Hook`
- `### I Do`
- `## We Do`
- `###  You Do` (extra space)
- `## Plenary`

It does NOT match:
- `# Hook` (h1 -- too broad)
- `#### Hook` (h4 -- too nested)
- `## Day 1` (not a canonical heading name)

---

## Data Structure Design (Claude's Discretion -- Recommendation)

### Recommended Type Hierarchy

```
ScriptedParseResult
  +-- days: DaySection[]
  |     +-- dayNumber: number
  |     +-- title: string | null
  |     +-- blocks: ScriptedBlock[]
  |           +-- type: ScriptedBlockType
  |           +-- content: string
  |           +-- lineNumber: number
  |           +-- section: SectionLabel | null
  |           +-- implicit: boolean
  +-- totalBlocks: number
  +-- totalDays: number
  +-- warnings: string[]
  +-- stats: ParseStats
        +-- sayCount, askCount, writeOnBoardCount, activityCount
        +-- sectionHeadingCount, implicitSayCount
        +-- totalLines, parsedLines
```

**Key design decisions:**
- `ScriptedBlock.section` links a block to its nearest preceding section heading. This enables downstream phases to group blocks by section without re-parsing.
- `ScriptedBlock.implicit` distinguishes explicitly-marked Say: blocks from inferred ones (unmarked prose). Downstream can display these differently.
- `ParseStats` enables the import preview (MODE-03) to show "12 Say blocks, 5 Ask blocks, 3 activities detected across 2 days".
- `warnings` is a string array (same pattern as `PipelineResult.warnings` in `generationPipeline.ts` line 53). Non-fatal issues are surfaced without blocking parsing.
- Section headings ARE included in the `blocks` array with type `'section-heading'`. This preserves ordering information and lets the downstream mapper know where slide boundaries should be.

---

## Whitespace Normalization (Claude's Discretion -- Recommendation)

1. **Leading whitespace on content lines:** Trim leading spaces/tabs from each content line. Indentation in the source text is formatting, not semantic.
2. **Trailing whitespace on blocks:** `.trimEnd()` when flushing a block.
3. **Internal blank lines:** Preserve as `\n\n` within block content (paragraph breaks per user decision).
4. **Content after colon:** Trim leading whitespace. `Say:  text` and `Say:text` both produce content `"text"`.
5. **Between blocks:** Blank lines between blocks are consumed by the state machine without action (they neither extend the previous block nor start a new one, since the previous block was already flushed by the new marker).

---

## Error/Warning Format (Claude's Discretion -- Recommendation)

Follow the `PipelineResult.warnings` pattern (string array):

```typescript
// Warning format: descriptive sentence, not error codes
warnings: string[]

// Examples:
"Day 3 has no content blocks"
"No day headers detected, treating entire input as Day 1"
"Line 42: Unrecognized text shorter than 20 characters was skipped"
```

No error codes. No error objects. Warnings are human-readable strings displayed in the UI via the existing Toast component. The parser NEVER throws -- it always returns a result, even if the result has warnings and zero blocks.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full-text regex scan (phaseDetector pattern) | Line-by-line state machine | This phase | Enables multi-line block accumulation which full-text regex cannot handle cleanly |
| AI-assisted parsing | Deterministic pure-function parsing | This phase | 100% predictable, instant, zero token cost, easily testable |
| Content preservation via `<preserve>` tags | Direct verbatim mapping (no AI to constrain) | This phase | Scripted mode bypasses content preservation entirely since there is no AI content generation |

**Deprecated/outdated:**
- Using `unified`/`remark` for simple marker detection: Over-engineered for this use case.
- The v6.0 pre-research considered `resource` and `timing` marker types (STACK-v6.0 line 62). These were scoped OUT in the CONTEXT.md -- only 4 canonical markers. `resource` and `timing` are future requirements (PARSE-F01, PARSE-F02).

---

## Open Questions

1. **Section heading as content vs. boundary-only**
   - What we know: Section headings create slide boundaries (PARSE-05). They need to appear in the blocks array for ordering.
   - What's unclear: Should the heading text become the slide title in the parser output, or is that a mapper concern (Phase 70)?
   - Recommendation: Include section headings as blocks with `type: 'section-heading'`. Let the mapper (Phase 70) decide how to use them for slide titles. This keeps the parser's responsibility clean: detect and extract, don't map to slides.

2. **`## Day N` with section heading on same line**
   - What we know: Format is `## Day 1: Introduction to Fractions` (day + optional title).
   - What's unclear: Can a day header also serve as a section heading? E.g., `## Day 1: Hook` -- is "Hook" a day title or a section?
   - Recommendation: Treat it purely as a day title. If the teacher wants a Hook section, they write it as a separate `## Hook` or `### Hook` line after the day header. The `## Day N` regex captures everything after the colon as a title string, not as a section label. This keeps parsing unambiguous.

3. **Content before any marker or heading**
   - What we know: Unmarked prose >= 20 chars becomes implicit Say: (PARSE-06).
   - What's unclear: What about content before the first day header or section heading? E.g., a lesson plan that starts with "This lesson covers fractions for Year 6."
   - Recommendation: Treat it as part of Day 1 (the default day). It becomes an implicit Say: block at the start of the lesson. No special handling needed -- the state machine naturally accumulates it into the first day's blocks.

---

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `services/phaseDetection/phaseDetector.ts` -- pure function parser pattern (289 lines, 7 test files)
- Codebase analysis: `services/phaseDetection/phasePatterns.ts` -- structural pattern definitions with regex (161 lines)
- Codebase analysis: `services/contentPreservation/detector.ts` -- marker detection with confidence levels (672 lines)
- Codebase analysis: `services/contentPreservation/types.ts` -- typed detection output pattern (61 lines)
- Codebase analysis: `services/generationPipeline.ts` -- pipeline orchestration, mode gating, warnings pattern (329 lines)
- Codebase analysis: `types.ts` -- Slide interface, LessonPhase type, discriminated unions (615 lines)
- Codebase analysis: `jest.config.js` -- ESM preset with ts-jest, test pattern `**/*.test.ts`
- Codebase analysis: `package.json` -- TypeScript 5.8, Jest 30, no parsing library dependencies
- Phase context: `.planning/phases/69-scripted-parser/69-CONTEXT.md` -- locked decisions
- Requirements: `.planning/REQUIREMENTS.md` -- PARSE-01 through PARSE-08
- v6.0 research: `.planning/research/STACK-v6.0-scripted-import.md` -- stack verification
- v6.0 research: `.planning/research/ARCHITECTURE-v6.0-scripted-import.md` -- architecture patterns
- v6.0 research: `.planning/research/PITFALLS-v6.0-scripted-import.md` -- domain pitfalls

### Secondary (MEDIUM confidence)
- None needed. All findings verified against codebase source files.

### Tertiary (LOW confidence)
- None. No external web searches required for this phase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all patterns verified in existing codebase
- Architecture: HIGH -- line-by-line state machine is a well-understood approach, and the codebase has two production-proven pure-function parsers to model after
- Pitfalls: HIGH -- identified from real codebase analysis and v6.0 pre-research pitfall document
- Type design: HIGH -- follows established codebase patterns (discriminated unions, typed results, warnings arrays)

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable -- no external dependencies that could change)
