---
name: flow-proxy
description: >
  Generate images and videos with Google Imagen, Nano Banana 2 / Pro, and Veo via Flow API.
  No API key, no paid subscription — just a Google account and Chrome extension.
  Use when the user asks to generate, create, or make an image, picture, illustration, logo, banner, avatar, video, clip, animation, or fly-through.
  Triggers: generate image, create picture, make illustration, generate video, create video, make clip, animate image, нарисуй, сгенерируй картинку, создай изображение.
  Do NOT use for image/video editing, standalone upscaling, background removal, or non-Google AI models (DALL-E, Midjourney, Stable Diffusion).
---

# Flow Image & Video Generator

Generate images and videos using **Google Imagen 4, Nano Banana 2, Nano Banana Pro, and Veo** for free. No API key — uses Chrome extension for OAuth and reCAPTCHA.

This installed skill now covers both image generation via `scripts/generate.mjs` and video generation via `scripts/generate-video.mjs`.

## Quick Start

```bash
# First run — provide project ID once (saved automatically)
node {baseDir}/scripts/generate.mjs -p "a cat astronaut floating in space" --project-id YOUR_UUID

# Subsequent runs
node {baseDir}/scripts/generate.mjs -p "a cat astronaut floating in space"

# Nano Banana 2
node {baseDir}/scripts/generate.mjs -p "abstract painting in neon colors" -m banana2

# Nano Banana Pro
node {baseDir}/scripts/generate.mjs -p "editorial fashion portrait with dramatic studio light" -m banana-pro

# Reference image mode
node {baseDir}/scripts/generate.mjs -m banana2 -i ./examples/example-cyberpunk-city.jpg -p "Transform this reference into a rainy neon-night variation"

# Portrait format, 1 image
node {baseDir}/scripts/generate.mjs -p "anime girl with headphones" -r 9:16 -c 1

# Save to specific folder
node {baseDir}/scripts/generate.mjs -p "sunset over mountains" -o ./images

# Text-to-video
node {baseDir}/scripts/generate-video.mjs -p "cinematic river at dawn"

# Image-to-video
node {baseDir}/scripts/generate-video.mjs -m veo-r2v -i ./examples/example-cyberpunk-city.jpg -p "slow cinematic fly-through"
```

## Models

| Type | Model | Flag | Best for |
|------|-------|------|----------|
| Image | Imagen 4 | `-m imagen4` (default) | Highest quality, photorealistic |
| Image | Nano Banana 2 | `-m banana2` | Latest Nano Banana image generation |
| Image | Nano Banana Pro | `-m banana-pro` | Higher-tier Nano Banana generation |
| Video | Veo 3.1 Text-to-Video | `-m veo` (video CLI default) | Prompt-only video generation |
| Video | Veo 3.1 Image-to-Video | `-m veo-r2v` | Animate a reference image |

## Model Selection Guide for Agents

Choose models according to the input type and the user’s intent.

### Current implementation status

- **Text-only mode**: validated with **Imagen 4**, **Nano Banana 2**, and **Nano Banana Pro**
- **Reference-image mode (`--image`)**: validated with **Nano Banana 2** and **Nano Banana Pro**
- **Imagen 4 + reference-image mode**: currently **not recommended for automatic selection** in this project, because repeated real runs returned `API Error 500: INTERNAL`

### Text-only prompts (zero-base generation)

- **Imagen 4** — use when exact text rendering, complex logical placement, or multi-object instruction-following is critical.
- **Nano Banana 2** — use when the goal is concept expansion, style exploration, or vibe consistency across iterations.
- **Nano Banana Pro** — use when photorealism, cinematic lighting, and premium material detail matter most.

### Reference-image workflows

- **Nano Banana 2** — strongest default for preserving character identity, art style, and visual continuity from a reference image.
- **Nano Banana Pro** — best when the reference should be reinterpreted at a more realistic, high-end, or polished quality level.
- **Imagen 4** — theoretically the best fit when the reference also needs precise logical edits such as object replacement, text insertion, or composition-aware correction, **but in this project it is currently experimental in reference-image mode and should not be auto-selected by default**.
- **Reference image mode** — if a reference image is provided, keep the chosen model (`imagen4`, `banana2`, or `banana-pro`) and add the image as an input rather than switching models.

### Agent Decision Tree

1. If exact text insertion is required → **Imagen 4**
2. If a reference image’s character or style must stay consistent → **Nano Banana 2**
3. If the result should be much more realistic / premium than the reference → **Nano Banana Pro**
4. If the prompt is highly complex and logical layout accuracy matters, but there is **no** reference image → **Imagen 4**
5. If the task is primarily style transfer instead of free reinterpretation → keep the best-fit validated model and provide `--image`

### Priority Rule

If the user says that **consistency and descriptive accuracy matter more than speed**, prefer:
- **Imagen 4** for text / logic / layout accuracy
- **Nano Banana 2** for style or character continuity
- **Nano Banana Pro** for realism and material fidelity

### Auto-pick rule for this repo

When choosing automatically in the current implementation:

- **No reference image**
  - text / layout / logic → **Imagen 4**
  - style / continuity / concept expansion → **Nano Banana 2**
  - realism / premium finish → **Nano Banana Pro**

- **Reference image provided**
  - preserve character / style / composition → **Nano Banana 2**
  - premium / realistic reinterpretation → **Nano Banana Pro**
  - **do not auto-pick Imagen 4 with `--image`** unless the user explicitly wants an experiment

### Reference Image Example

```bash
node {baseDir}/scripts/generate.mjs -m banana2 -i ./examples/example-cyberpunk-city.jpg -p "Transform this reference into a rainy neon-night variation"
```

## Mode Rules

- **Text-only image mode**: use `scripts/generate.mjs` without `--image`
- **Reference-image mode**: use `scripts/generate.mjs` with `--image <path>` and keep the selected image model (`imagen4`, `banana2`, or `banana-pro`)
- **Text-to-video mode**: use `scripts/generate-video.mjs -m veo`
- **Image-to-video mode**: use `scripts/generate-video.mjs -m veo-r2v -i <path>`
- **Current implementation note**: `imagen4 + --image` is still experimental in this repo; default automatic reference-image picks should prefer `banana2` or `banana-pro`

## Image CLI Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | required | Image description (English works best) |
| `--model` | `-m` | `imagen4` | Model: imagen4, banana2, banana-pro |
| `--image` | `-i` | optional | Reference image path (enables reference-image mode) |
| `--count` | `-c` | `1` | Number of images (1-4) |
| `--ratio` | `-r` | `16:9` | Aspect ratio: `1:1`, `16:9`, `9:16`, `4:3`, `3:4` |
| `--output` | `-o` | `.` | Output directory |
| `--seed` | `-s` | random | Seed for reproducibility |
| `--project-id` | `-j` | saved | Flow project UUID (required on first run only) |

## Video CLI Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | required | Video description (English works best) |
| `--model` | `-m` | `veo` | Video model: veo, veo-r2v |
| `--ratio` | `-r` | `16:9` | Aspect ratio: `16:9`, `9:16`, `1:1` |
| `--image` | `-i` | required for `veo-r2v` | Reference image path for image-to-video mode |
| `--output` | `-o` | `.` | Output directory |
| `--seed` | `-s` | random | Seed for reproducibility |
| `--project-id` | `-j` | saved | Flow project UUID (required on first run only) |

## Aspect Ratios

- `1:1` — square compositions, avatars, icons, social posts
- `16:9` — landscape compositions, banners, covers, YouTube thumbnails
- `9:16` — portrait compositions, stories, reels, vertical posters
- `4:3` — classic landscape framing
- `3:4` — classic portrait framing

Exact pixel dimensions may vary by Flow model and returned media format.

## Authentication

Token stored in `~/.flow-proxy/token.json`. OAuth and reCAPTCHA are handled automatically by the Chrome extension.

### Check token status

```bash
node {baseDir}/scripts/status.mjs
```

### First-time setup

1. Install the Chrome extension from `{baseDir}/extension/` (load unpacked in chrome://extensions)
2. Open https://labs.google/fx/tools/flow and sign in with Google
3. Open any project in Flow — the URL will be `https://labs.google/fx/tools/flow/project/{YOUR_UUID}`. Copy the UUID.
4. Run: `node {baseDir}/scripts/generate.mjs -p "test" --project-id YOUR_UUID`
5. Click the Flow Proxy extension icon → "Connect"

Project ID and token are saved automatically for future runs.

### Ongoing usage

- **OAuth token**: auto-refreshes via session cookie (~30 days). After expiry, run generate.mjs and click "Connect" in the extension.
- **reCAPTCHA**: handled automatically — no user action needed, as long as Chrome has a labs.google/fx/tools/flow tab open.

### If token is expired

Run `generate.mjs` — it will start the auth server and wait. Click "Connect" in the extension. No manual token copying needed.

## Important

- Prompts in **English** produce best results
- Chrome must have the `labs.google/fx/tools/flow` tab open during generation (for automatic reCAPTCHA)
- The API is free but rate-limited (Google account level)
- Images are saved using the actual format returned by Flow (for example JPG, PNG, or WebP)
- Videos are saved as MP4 when Flow returns a downloadable result
- Video generation supports aspect ratio selection, but exact encoded pixel resolution may vary by Flow model/output
- Do NOT read generated image files into context — they consume thousands of tokens

## Agent Instructions

1. Check token status with `status.mjs` first
2. If expired: run the relevant generator and tell the user to click "Connect" in the extension
3. Ensure the user has `labs.google/fx/tools/flow` open in Chrome
4. For images, run `generate.mjs` with an appropriate English prompt
5. For videos, run `generate-video.mjs` with `veo` or `veo-r2v` as appropriate
