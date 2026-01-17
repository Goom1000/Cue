---
created: 2026-01-18T00:00
title: Add flexible image generation with model switching
area: api
files: []
---

## Problem

Currently all image generation is tied to the Gemini API. Using Nano/Banana Pro for image generation will get expensive quickly. Need:

1. **Encrypted API key management** — ability to add/store different API keys securely so we can switch between models
2. **Modular image generation** — separate image generation from the main API flow so different backends can be used
3. **Model switching** — option to use Gemini/Nano for paid generation OR switch to open-source models (e.g., Stable Diffusion, local models) for free generation

This enables cost control and experimentation with different image generation approaches.

## Solution

TBD — Research phase needed:
- Investigate open-source image generation options (Stable Diffusion API, Replicate, local models)
- Design secure API key storage (encryption at rest)
- Architect a provider abstraction layer for image generation
- Consider UI for model selection/switching
