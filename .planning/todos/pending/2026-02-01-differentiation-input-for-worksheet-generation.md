---
created: 2026-02-01T13:47
title: Differentiation input for worksheet generation
area: ui
files:
  - components/WorksheetGenerator.tsx (or equivalent)
  - services/worksheetService.ts (TBD)
---

## Problem

Teachers create detailed differentiation sections in their lesson plans specifying how activities should be adapted for different ability levels. Currently, the worksheet generator doesn't have a way to accept this differentiation information directly.

The workflow issue:
1. Teacher uploads lesson plan (which contains differentiation notes)
2. Slides are generated including the independent task
3. Worksheet generator creates worksheets starting from selected slides
4. **Gap:** No way to explicitly tell the worksheet generator what differentiation is needed

Even though the lesson plan was uploaded, the differentiation context may not carry through to worksheet generation. Teachers want to:
- Paste/input their differentiation notes directly into the worksheet section
- Have the differentiation explicitly linked to the independent task in the slides
- Generate worksheets that accurately reflect their planned differentiation

## Solution

Add a differentiation input section to the worksheet generator UI:

1. **Differentiation text field** — Allow teachers to paste their differentiation notes from their lesson plan (e.g., "Lower ability: scaffold with sentence starters; Higher ability: open-ended extension questions")

2. **Link to independent task** — The worksheet generator should identify the independent task slide (if the lesson plan was followed, this should be in the slide deck) and generate differentiated versions that directly support that task

3. **Generate linked resources** — Output could be multiple worksheet variants (e.g., "Support", "Core", "Extension") that are clearly linked to the original activity

This complements existing preserve-content work by adding explicit teacher input at the resource generation stage.
