---
created: 2026-01-21T12:00
title: Teleprompter verbosity mode (concise vs detailed)
area: ui
files: []
---

## Problem

The teleprompter currently generates clear, concise scripts based on uploaded lesson plans. This works well for many teachers, but some teachers prefer:
- More detailed, in-depth scripts
- Additional context and explanation
- More thorough coverage of the material

Different teaching styles and experience levels benefit from different amounts of guidance. A new teacher might want a detailed script they can follow closely, while an experienced teacher might prefer concise bullet points.

## Solution

Add a teleprompter verbosity toggle during generation:

- **Concise mode (current default):** Brief, clear scripts with key points
- **Detailed mode:** More thorough scripts with:
  - Fuller explanations of concepts
  - Suggested transitions and elaborations
  - Additional context and teaching notes
  - Still appropriate for the student grade level

This is a generation-time option that affects how the AI produces the teleprompter content.
