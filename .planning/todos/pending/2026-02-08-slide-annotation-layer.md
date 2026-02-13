---
created: 2026-02-08T00:00
title: Slide annotation layer (images + arrows overlay)
area: feature
files: []
---

## Problem

Teachers need micro-control over slide visuals — paste specific images and add arrows pointing at things — without leaving Cue. The full canvas editor / PowerPoint clone approach was considered and rejected as too risky (scope explosion, UX will feel clunky vs PowerPoint, destabilizes 35k LOC).

## Solution

Lightweight annotation layer on top of existing AI-generated slides:

- **Annotation mode** — enter via "Annotate" button on slide editor
- **Image paste/drop** — paste from clipboard or drag-drop, position and resize freely
- **Arrows** — click start → click end with arrowhead
- **Select/move/resize/delete** — interact with placed annotations
- **Renders in presentation** — student view shows annotations on top of normal slide
- **Persists in .cue file** — annotations array on Slide data model
- **Included in PPTX/PDF export**

Architecture: `annotations: AnnotationElement[]` overlay on existing Slide model. Existing layout system untouched. Annotations render as a positioned layer on top.

## Deferred

Full canvas editor, shapes beyond arrows, text boxes, animation timeline — all deferred. This is the minimum useful version.
