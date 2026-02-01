---
created: 2026-02-01T14:00
title: Delay answer reveal with scaffolding strategy in teleprompter
area: api
files: []
---

## Problem

Currently when slides present concepts or examples, the **answer appears immediately on screen**. This prevents students from thinking and working things out themselves.

**Example scenario:**
- Lesson mentions: "A bag costs $55, and there's a 10% discount"
- Current behavior: Slide shows the problem AND the discounted price together
- Desired behavior:
  1. Slide shows ONLY the problem (no answer)
  2. Teleprompter shows the **strategy** for the teacher to scaffold students through
  3. Students work it out with teacher guidance
  4. NEXT component reveals the answer

**Core principle:** Concepts shouldn't just be told to children. They need a chance to work them out with scaffolding from the teacher.

**This affects all concept/challenge/example presentations throughout the deck.**

## Solution

TBD — Approach considerations:

**Prompt engineering changes:**
- AI must detect when content is a "concept to learn" vs "information to share"
- Split concept presentations into: problem → scaffolding (teleprompter only) → reveal
- Teleprompter must contain the **teaching strategy**, not just the answer

**Slide generation pattern:**
1. Component 1: Present the problem/challenge (no answer)
2. Component 2 (or teleprompter notes): Scaffolding strategy for teacher
3. Component 3: Answer reveal

**Detection signals:**
- Calculations, percentages, problem-solving scenarios
- "Work out", "calculate", "figure out" language in lesson plan
- Examples that have a clear answer/solution
