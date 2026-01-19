---
created: 2026-01-20T00:00
title: Fix slide preview cutoff in teacher view
area: ui
files: []
---

## Problem

**Bug:** In the teacher/presenter view (the one with the teleprompter), the slide preview showing what students see is not sized correctly — the content gets cut off.

From the screenshot provided:
- The slide on the left shows "Objectives" with bullet points
- The last bullet point "Write clear, focused topic..." is cut off at the bottom
- The teacher cannot see the full slide as students would see it

**Why this matters:** Teachers need to see exactly what students are seeing while following the teleprompter. If the preview is cut off, they can't verify the student view is displaying correctly.

**Expected behavior:** The slide preview in teacher view should be scaled to fit entirely within its container, showing the complete slide content without any cutoff.

**Current behavior:** Slide preview overflows its container and text/content is cut off at the bottom.

## Solution

TBD — likely need to:
- Add proper scaling (CSS transform: scale or object-fit) to the slide preview
- Calculate aspect ratio and fit within available space
- Ensure the preview maintains correct proportions while fitting the container
