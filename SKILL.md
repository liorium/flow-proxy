---
name: whisk-proxy
description: >
  Generate images and videos with Google Flow (Imagen 4, Nano Banana, Veo 3.1) for free.
  No API key, no paid subscription — just a Google account and Chrome extension.
  Use when the user asks to generate, create, or make an image, picture, illustration, logo, banner, avatar, or video.
  Triggers: generate image, create picture, make illustration, generate video, нарисуй, сгенерируй картинку, создай изображение, сделай видео.
  Do NOT use for image editing, upscaling, background removal, or non-Google AI models (DALL-E, Midjourney, Stable Diffusion).
---

# Flow Image & Video Generator

Generate images and videos using **Google Flow** for free. No API key — uses Chrome extension for OAuth.

## Quick Start

```bash
# Generate images (Imagen 4, default)
node {baseDir}/scripts/generate.mjs -p "a cat astronaut floating in space"

# Nano Banana (fast, creative)
node {baseDir}/scripts/generate.mjs -p "abstract painting in neon colors" -m banana

# Portrait format, 4 images
node {baseDir}/scripts/generate.mjs -p "anime girl with headphones" -r 9:16 -c 4

# Save to specific folder
node {baseDir}/scripts/generate.mjs -p "sunset over mountains" -o ./images

# Generate video (experimental, may require AI Pro or free credits)
node {baseDir}/scripts/video.mjs -p "a robot walking through a garden"
```

## Image Models

| Model | Flag | Best for |
|-------|------|----------|
| Imagen 4 | `-m imagen4` (default) | Highest quality, photorealistic |
| Nano Banana | `-m banana` | Fast, creative generation |
| Reference-to-Image | `-m r2i` | Style transfer |

## Image Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | required | Image description (English works best) |
| `--model` | `-m` | `imagen4` | Model: imagen4, banana, r2i |
| `--count` | `-c` | `4` | Number of images (1-4) |
| `--ratio` | `-r` | `1:1` | Aspect ratio: `1:1`, `16:9`, `9:16`, `4:3`, `3:4` |
| `--output` | `-o` | `.` | Output directory |
| `--seed` | `-s` | random | Seed for reproducibility |

## Video Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | required | Video description |
| `--ratio` | `-r` | `16:9` | Aspect ratio: `16:9`, `9:16` |
| `--output` | `-o` | `.` | Output directory |

## Aspect Ratios

- `1:1` (1024x1024) — avatars, icons, social posts
- `16:9` (1365x768) — banners, covers, YouTube thumbnails
- `9:16` (768x1365) — stories, reels, vertical posters
- `4:3` — classic landscape
- `3:4` — classic portrait

## Authentication

Token stored in `~/.flow-proxy/token.json`. The Chrome extension handles auth automatically.

### Check token status

```bash
node {baseDir}/scripts/status.mjs
```

### First-time setup

1. Install the Chrome extension from `{baseDir}/extension/` (load unpacked)
2. Open https://labs.google/fx/tools/flow
3. Sign in with Google
4. Click the Flow Proxy extension icon → "Connect"

Token auto-refreshes via session cookie (~30 days). After that, repeat step 4.

### If token is expired

The CLI scripts auto-detect expired tokens and start a local auth server.
Just click "Connect" in the Chrome extension — no manual token copying needed.

The agent should check `status.mjs` first. If token is expired, run `generate.mjs` — it will start the auth server and wait for the extension. Tell the user to click "Connect" in the extension.

## Important

- Prompts in **English** produce best results
- The API is free but rate-limited (Google account level)
- Images saved as PNG, videos as MP4
- Do NOT read generated PNG/MP4 files into context — they consume thousands of tokens
- Video generation is experimental and may not work
