---
created: 2026-02-01T14:00
title: Show lesson phase headers (I Do/We Do/You Do) on slides
area: ui
files: []
---

## Problem

Teachers can't easily see which **phase of the lesson** they're in without looking at their physical plan. The whole point of the app is that the plan should be embedded in the presentation — "the plan reimagined."

**Lesson phases and their meaning:**
- **I Do** — Teacher fully leads; students observe (minimal interaction)
- **We Do** — Teacher scaffolds; lots of interaction between teacher and students
- **We Do Together** — Students work with partners; less teacher scaffolding
- **You Do** — Independent work with differentiation options

**Why this matters:**
- Visual reminder of HOW to conduct each section
- Helps teacher adjust their interaction level appropriately
- Makes transitions between phases explicit
- Removes need to reference the original lesson plan during teaching

## Solution

TBD — Approach considerations:

**Detection:**
- Parse lesson plan for phase markers (I Do, We Do, You Do, etc.)
- Associate slide content with its phase

**Display options:**
1. Small label/badge in corner of slide (subtle but visible)
2. Header bar at top of slide
3. Visual theme change per phase (different accent color?)
4. Icon-based indicators

**Teleprompter integration:**
- Should phase also appear in teleprompter view?
- Could show phase + expected interaction style as a reminder

**Edge cases:**
- What if lesson plan doesn't use these exact terms?
- Should we detect equivalent phases (e.g., "Guided Practice" = We Do)?
