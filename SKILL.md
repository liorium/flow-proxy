---
name: flow-proxy
description: >
  Generate images with Google Imagen 4 and Nano Banana for free via Flow API.
  No API key, no paid subscription — just a Google account and Chrome extension.
  Use when the user asks to generate, create, or make an image, picture, illustration, logo, banner, or avatar.
  Triggers: generate image, create picture, make illustration, нарисуй, сгенерируй картинку, создай изображение.
  Do NOT use for image editing, upscaling, background removal, video generation, or non-Google AI models (DALL-E, Midjourney, Stable Diffusion).
---

# Flow Image Generator

Generate images using **Google Imagen 4, Nano Banana, and Reference-to-Image** for free. No API key — uses Chrome extension for OAuth and reCAPTCHA.

## Quick Start

```bash
# First run — provide project ID once (saved automatically)
node {baseDir}/scripts/generate.mjs -p "a cat astronaut floating in space" --project-id YOUR_UUID

# Subsequent runs
node {baseDir}/scripts/generate.mjs -p "a cat astronaut floating in space"

# Nano Banana (fast, creative)
node {baseDir}/scripts/generate.mjs -p "abstract painting in neon colors" -m banana

# Reference-to-Image (style transfer)
node {baseDir}/scripts/generate.mjs -p "watercolor portrait" -m r2i

# Portrait format, 1 image
node {baseDir}/scripts/generate.mjs -p "anime girl with headphones" -r 9:16 -c 1

# Save to specific folder
node {baseDir}/scripts/generate.mjs -p "sunset over mountains" -o ./images
```

## Models

| Model | Flag | Best for |
|-------|------|----------|
| Imagen 4 | `-m imagen4` (default) | Highest quality, photorealistic |
| Nano Banana | `-m banana` | Fast, creative generation |
| Reference-to-Image | `-m r2i` | Style transfer |

## Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | required | Image description (English works best) |
| `--model` | `-m` | `imagen4` | Model: imagen4, banana, r2i |
| `--count` | `-c` | `4` | Number of images (1-4) |
| `--ratio` | `-r` | `1:1` | Aspect ratio: `1:1`, `16:9`, `9:16`, `4:3`, `3:4` |
| `--output` | `-o` | `.` | Output directory |
| `--seed` | `-s` | random | Seed for reproducibility |
| `--project-id` | `-j` | saved | Flow project UUID (required on first run only) |

## Aspect Ratios

- `1:1` (1024x1024) — avatars, icons, social posts
- `16:9` (1365x768) — banners, covers, YouTube thumbnails
- `9:16` (768x1365) — stories, reels, vertical posters
- `4:3` — classic landscape
- `3:4` — classic portrait

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
- Images saved as PNG
- Do NOT read generated PNG files into context — they consume thousands of tokens

## Agent Instructions

1. Check token status with `status.mjs` first
2. If expired: run `generate.mjs` and tell the user to click "Connect" in the extension
3. Ensure the user has `labs.google/fx/tools/flow` open in Chrome
4. Run `generate.mjs` with an appropriate English prompt
