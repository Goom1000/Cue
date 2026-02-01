---
created: 2026-02-01T13:56
title: Click-to-generate contextual AI questions on slide components
area: ui
files: []
---

## Problem

Currently, slides often present information and answers directly to students without prompting them to think first. Teachers want an easy way to inject thinking opportunities at key points during a lesson.

**Example scenario:**
- Slide shows: "Matt spent $51 but only has $50 — he's over budget"
- Next component says: "He could remove some items"
- Final component gives the answers

**Desired behavior:** Teacher clicks on the "remove some items" component and AI generates contextual questions like:
- "What items could Matt leave out?"
- "What effect would removing items have on his budget?"
- "Would he have any money left over?"

The AI should understand the **context of all components that came before** on that slide to generate intelligent, pedagogically appropriate questions.

## Solution

TBD — Approach considerations:

**Interaction model (two options):**
1. **Presentation mode:** Click component during presentation → question appears inline
2. **Edit mode (main page):** Click component in slide preview → question generated and inserted

Edit mode may be simpler since presentation mode would require teleprompter reload to sync new content.

**Technical requirements:**
- AI needs context of: current component + all preceding components on slide
- Generated questions should be age-appropriate and aligned with learning objective
- Consider: single question vs. multiple question options for teacher to choose
- May need a "generate question here" affordance (button/icon on hover?)

**UX considerations:**
- Quick action (shouldn't interrupt flow)
- Teacher approval before insertion (preview before commit)
- Visual indicator of where questions have been added
- Teleprompter sync if adding in presentation mode
