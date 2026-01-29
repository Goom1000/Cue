---
created: 2026-01-30T05:54
title: Add art style selector and custom style references
area: ui
files: []
---

## Problem

Currently the app produces only one art style for image generation. Teachers need variety to match their lesson content and classroom aesthetics. Two capabilities are needed:

1. **Predefined style selector** — Give users a choice of styles like:
   - Minimal/clean
   - Realistic
   - Professional cartoon
   - Comic book
   - Watercolor
   - Flat/vector illustration
   - Anime/manga
   - Sketch/hand-drawn
   - etc.

2. **Custom style references** — Allow users to upload their own reference image (JPEG, PNG, etc.) and have the AI analyze it to extract:
   - Art style characteristics (anime, watercolor, etc.)
   - Color palette/tones (e.g., "pink and purple tones")
   - Visual mood and texture

   The AI would then apply these extracted characteristics when generating new images.

3. **Save custom styles** — If a generation using a reference image produces good results, save that style profile for reuse on future generations.

## Solution

TBD — Approach considerations:
- Predefined styles: Could be prompt modifiers or style presets passed to image generation
- Custom references: Need multimodal AI to analyze uploaded image and extract style descriptors
- Storage: Save style profiles with name, source image (optional), and extracted descriptors
- UI: Style picker dropdown/grid + drag-and-drop upload zone for custom references
- Integration: Pass style context to image generation API alongside the content prompt
