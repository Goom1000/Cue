# Domain Pitfalls: Smart Generation Pipeline (v5.0)

**Domain:** Multi-pass AI slide generation with resource integration and lesson phase detection
**Researched:** 2026-02-14
**Confidence:** HIGH for pipeline pitfalls (well-documented patterns), MEDIUM for phase detection (novel territory)

## Critical Pitfalls

Mistakes that cause rewrites, broken generation, or teacher distrust.

### Pitfall 1: Gap Slide Index Shifting During Insertion

**What goes wrong:** Gap analysis returns `suggestedPosition` values relative to the ORIGINAL deck (e.g., gap A at position 3, gap B at position 7). If you insert gap A first at position 3, the deck now has one extra slide, making gap B's position 7 actually position 8 in the modified array. Naive sequential insertion produces wrong ordering.

**Why it happens:** Array index math is easy to get wrong with insertions. The existing `generateSlideFromGap()` returns a single slide; the caller is responsible for placement.

**Consequences:** Slides appear in wrong positions. "Success Criteria" gap slide ends up between "Hook" and "I Do" instead of at the end. Teacher loses trust in generation quality.

**Prevention:** Insert gap slides in reverse order (highest position first) so earlier insertions don't affect later positions. Alternatively, collect all gap slides with their positions, then build the final array in a single pass:

```typescript
// SAFE: Single-pass merge
const insertions = gaps.map((gap, slide) => ({ position: gap.suggestedPosition, slide }));
insertions.sort((a, b) => a.position - b.position);

const result: Slide[] = [];
let insertIdx = 0;
for (let i = 0; i <= originalSlides.length; i++) {
  while (insertIdx < insertions.length && insertions[insertIdx].position === i) {
    result.push(insertions[insertIdx].slide);
    insertIdx++;
  }
  if (i < originalSlides.length) result.push(originalSlides[i]);
}
```

**Detection:** Write a test that inserts 3 gap slides and verifies the original slide order is preserved and gaps appear at correct positions.

### Pitfall 2: Pipeline Error Cascading (Pass 2 Failure Kills Everything)

**What goes wrong:** If gap analysis (Pass 2) throws an error -- rate limit, parse error, timeout -- the entire pipeline fails and the teacher sees no slides at all, even though Pass 1 (generation) succeeded.

**Why it happens:** Default try/catch around the full pipeline treats any error as fatal.

**Consequences:** Teacher waited 15+ seconds for generation, then gets "Error" with nothing to show. Worst possible UX. Teacher retries, uses more API quota, still might fail on Pass 2.

**Prevention:** Implement partial result recovery. Each pass has its own try/catch. If Pass 2 or 3 fails, return the slides from Pass 1 with a warning: "Slides generated, but gap analysis was skipped due to an error."

```typescript
// Pipeline with graceful degradation
const slides = await pass1Generate(...);  // Fatal if fails (no fallback)

let gapResult: GapAnalysisResult | null = null;
try {
  gapResult = await pass2Analyze(slides, ...);
} catch (e) {
  console.warn('[Pipeline] Pass 2 failed, continuing without gap analysis:', e);
}

let filledSlides = slides;
if (gapResult && gapResult.gaps.length > 0) {
  try {
    filledSlides = await pass3Fill(slides, gapResult.gaps, ...);
  } catch (e) {
    console.warn('[Pipeline] Pass 3 failed, returning unfilled deck:', e);
  }
}
```

**Detection:** In progress UI, show which passes succeeded/failed: "Slides generated. Gap analysis failed (retry available)."

### Pitfall 3: Stale Phase Detection From Truncated Lesson Plans

**What goes wrong:** `buildGapAnalysisContext()` truncates lesson plan text at 8,000 characters (`MAX_LESSON_PLAN_CHARS`). If the "You Do" section is at the end of a 12,000-character plan, it gets truncated. Phase detection never sees it. Generated slides have no "You Do" phase.

**Why it happens:** Token limits require truncation. Phase detection runs on the same text that goes to AI. If truncation cuts off a phase, both regex detection and AI miss it.

**Consequences:** Teacher's lesson plan clearly has a "You Do" section, but the generated slides don't include it. Teacher thinks the AI is bad at understanding their plan.

**Prevention:** Run phase detection on the FULL lesson plan text BEFORE truncation. Pass the phase map to the AI alongside the (possibly truncated) plan text:

```
The full lesson plan contains these phases:
- Hook (paragraph 1-2)
- I Do (paragraph 3-6)
- We Do (paragraph 7-10)
- You Do (paragraph 11-14)  <-- this might be truncated below
- Plenary (paragraph 15)

[Lesson plan text, possibly truncated at 8000 chars]
```

This way the AI knows all phases exist even if the text is cut.

**Detection:** Test with a lesson plan where the last phase starts after the 8,000-char mark.

### Pitfall 4: PPTX XML Namespace Handling

**What goes wrong:** PPTX XML uses namespaces extensively (`a:t`, `p:sp`, `a:p`). DOMParser in the browser creates namespace-aware DOM. Using `querySelector('t')` won't find `<a:t>` elements. You need `getElementsByTagNameNS()` or namespace-aware selectors.

**Why it happens:** Developers test with simple XML and forget that real PPTX files have complex namespace declarations.

**Consequences:** PPTX processor returns empty text. All uploaded PowerPoint resources appear as blank content.

**Prevention:** Use namespace-aware DOM methods:

```typescript
const NS = {
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
};

// CORRECT: namespace-aware
const textElements = doc.getElementsByTagNameNS(NS.a, 't');

// WRONG: won't match <a:t>
const textElements = doc.querySelectorAll('t');
```

**Detection:** Test with a real PPTX file (not hand-crafted XML). Export a simple deck from PowerPoint and verify text extraction.

## Moderate Pitfalls

### Pitfall 5: AI Ignoring lessonPhase in Structured Output

**What goes wrong:** The AI schema includes `lessonPhase` as an enum field, but the AI assigns it inconsistently or defaults everything to one phase.

**Why it happens:** Adding a new field to a large JSON schema dilutes the AI's attention across more output requirements. The phase field is low-priority compared to title, content, speakerNotes.

**Prevention:** Two-pronged approach:
1. Include explicit phase assignment instructions in the system prompt (not just schema)
2. Post-process: if AI returns slides without phases, apply phases based on PhaseDetector results (heuristic fallback)

### Pitfall 6: Resource Content Overwhelming the Generation Prompt

**What goes wrong:** Teacher uploads a 10-page PDF as a supplementary resource. The extracted text is 15,000+ characters. Combined with the lesson plan, the prompt exceeds the effective context for quality generation.

**Why it happens:** More context does NOT always mean better output. AI models have a "lost in the middle" problem where important information in the middle of long prompts gets less attention.

**Prevention:** Hard cap resource text at 2,000 characters per resource, 6,000 characters total. Truncate with summary note: "[Resource truncated: showing first 2000 characters of 15000]". Place resource context AFTER the lesson plan (which is more important) and BEFORE the generation instructions (recency bias helps).

### Pitfall 7: Phase Detection False Positives in Body Text

**What goes wrong:** The lesson plan contains the phrase "I do not recommend..." in a teaching note. The phase detector matches "I Do" within "I do not recommend" and incorrectly marks a phase boundary.

**Why it happens:** Naive regex matching without context awareness. "I Do" as a phrase appears in natural English text.

**Prevention:** Require phase markers to be structural, not inline:
- Must be at the start of a line (or after a newline)
- Must be followed by colon, dash, newline, or end-of-line
- Case-sensitive: "I Do" (title case) matches, "I do" (lower case) does not
- Require word boundary: `\bI Do\b` not just `I Do`

```typescript
// Pattern: Phase label at start of line, followed by punctuation or newline
const I_DO_PATTERN = /^[\s*-]*(?:I\s+Do|Modelling|Direct\s+Instruction|Main\s+Teaching)\s*[:\-–—]/mi;
```

### Pitfall 8: PPTX with No Text (Image-Only Slides)

**What goes wrong:** Teacher uploads a PPTX where slides are mostly images (diagrams, infographics) with minimal text. The PPTX processor extracts almost no text, making the resource appear empty.

**Why it happens:** Not all PPTX content is in `<a:t>` text elements. SmartArt, charts, and embedded images carry information visually.

**Prevention:** Extract both text AND images from PPTX. For image extraction: read `ppt/media/` directory from the ZIP. If text extraction yields less than 50 characters but images exist, flag the resource as "image-based" and send images to multimodal AI instead of text.

## Minor Pitfalls

### Pitfall 9: Non-Standard Phase Labels

**What goes wrong:** Australian/UK lesson plans use varied terminology. A plan might say "Explicit Teaching" instead of "I Do", or "Application" instead of "You Do". The detector misses these.

**Prevention:** Build a comprehensive synonym dictionary. Research actual lesson plan templates used by Australian teachers:
- I Do: "Modelling", "Explicit Teaching", "Direct Instruction", "Teacher Demonstration", "Main Teaching"
- We Do: "Guided Practice", "Joint Activity", "Together Time", "Collaborative Practice", "Shared Writing"
- You Do: "Independent Practice", "Application", "Student Activity", "On Your Own", "Applying"

### Pitfall 10: Pipeline Cancellation Mid-Pass

**What goes wrong:** Teacher clicks "Cancel" during Pass 3 (gap filling). Pass 3 has already generated 2 of 3 gap slides. What happens to the partially filled deck?

**Prevention:** Support `AbortSignal` throughout the pipeline (existing pattern from document enhancement). On cancel, return the most complete partial result: slides from Pass 1 + any gap slides generated before cancellation.

### Pitfall 11: Duplicate Content Between Resource and Lesson Plan

**What goes wrong:** Teacher uploads a worksheet PDF that contains the same math problems listed in the lesson plan. AI generates duplicate slides -- one from the lesson plan mention and one from the resource content.

**Prevention:** Prompt instruction: "If a topic appears in both the lesson plan and a supplementary resource, create ONE slide covering it. Reference the resource with '[See: ResourceName]' rather than duplicating content." This is a prompt-level solution, not a code-level deduplication.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| PPTX Processor | XML namespace handling (#4) | Use getElementsByTagNameNS, test with real PPTX files |
| Phase Detection | False positives (#7), non-standard labels (#9) | Structural matching (start-of-line), comprehensive synonym dict |
| Pipeline Orchestrator | Index shifting (#1), error cascading (#2) | Single-pass merge, partial result recovery |
| Resource Integration | Context overflow (#6), duplicates (#11) | Hard token caps, prompt-level dedup instruction |
| AI Schema Extension | Phase field ignored (#5) | Explicit prompt instructions + heuristic fallback |
| Lesson Plan Truncation | Stale phase detection (#3) | Detect phases on FULL text before truncation |

## Testing Recommendations

| Test Area | What to Test | Priority |
|-----------|-------------|----------|
| Gap slide insertion | Multiple gaps at various positions, verify deck order preserved | Critical |
| Pipeline degradation | Pass 2 failure returns Pass 1 slides, Pass 3 partial failure returns partial fills | Critical |
| Phase detection accuracy | Real lesson plans from 5+ different templates | High |
| Phase detection edge cases | "I do not recommend...", "We do have...", phase at end of truncated text | High |
| PPTX extraction | Real PPTX from PowerPoint, Google Slides export, Keynote export | High |
| Resource context capping | Upload 10-page PDF, verify prompt stays under cap | Medium |
| Pipeline cancellation | Cancel at each pass, verify partial results returned | Medium |

## Sources

- Codebase analysis: existing gap analysis insertion logic, enhancement state machine, upload service
- [Office Open XML SDK documentation](https://learn.microsoft.com/en-us/office/open-xml/) -- PPTX XML structure (HIGH confidence, training data)
- [DOMParser namespace handling](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser) -- Browser XML parsing (HIGH confidence)
- Existing pitfalls files in `.planning/research/PITFALLS-*.md` -- consistent patterns for this codebase
- [Lost in the Middle paper](https://arxiv.org/abs/2307.03172) -- LLM attention degradation in long contexts (HIGH confidence)
