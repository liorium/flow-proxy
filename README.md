# Whisk Proxy

**Generate images and videos with Google Flow — completely free. No API key, no paid subscription.**

Uses Google Labs Flow API with your regular Google account. Chrome extension for one-click auth, CLI scripts for generation.

## What is this?

A lightweight CLI tool and AI Agent Skill that generates images and videos using Google's latest models through the Flow API (labs.google).

**Key features:**
- **Free** — only needs a Google account
- **No dependencies** — just Node.js 18+ and Chrome
- **One-click auth** — Chrome extension handles tokens automatically
- **Auto-refresh** — session cookie lasts ~30 days, no hourly re-auth
- **Multiple models** — Imagen 4, Nano Banana, Reference-to-Image
- **Video generation** — experimental (Veo 3.1)
- **AI Agent Skill** — works with Claude Code, Codex, and other AI agents

## Quick Start

### 1. Install the Chrome Extension

1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension/` folder from this project

### 2. Connect your Google account

1. Open [labs.google/fx/tools/flow](https://labs.google/fx/tools/flow) in Chrome
2. Sign in with your Google account
3. Click the **Flow Proxy** extension icon in the toolbar
4. Click **"Connect"**

That's it! Token auto-refreshes for ~30 days.

### 3. Generate images

```bash
# Default model (Imagen 4), 4 images
node scripts/generate.mjs -p "a cat astronaut floating in space"

# Nano Banana (fast, creative)
node scripts/generate.mjs -p "abstract painting in neon colors" -m banana

# Landscape banner
node scripts/generate.mjs -p "futuristic city skyline at sunset" -r 16:9

# Portrait for stories
node scripts/generate.mjs -p "anime girl with headphones" -r 9:16

# Save to specific folder
node scripts/generate.mjs -p "abstract background" -o ./my-images
```

### 4. Generate videos (experimental)

```bash
# Landscape video (default)
node scripts/video.mjs -p "a robot walking through a garden"

# Vertical video for reels
node scripts/video.mjs -p "ocean waves on a beach" -r 9:16
```

> Video generation may require Google AI Pro ($20/mo) or free credits. The video endpoint is experimental and may not work.

## Image Models

| Model | Flag | Best for |
|-------|------|----------|
| **Imagen 4** | `-m imagen4` | Highest quality, photorealistic (default) |
| **Nano Banana** | `-m banana` | Fast, creative generation |
| **Reference-to-Image** | `-m r2i` | Style transfer |

## CLI Options

### generate.mjs

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | required | Image description (English works best) |
| `--model` | `-m` | `imagen4` | Model name (see table above) |
| `--count` | `-c` | `4` | Number of images per request (1-4) |
| `--ratio` | `-r` | `1:1` | Aspect ratio (see below) |
| `--output` | `-o` | `.` | Output directory |
| `--seed` | `-s` | random | Seed for reproducibility |

### video.mjs

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | required | Video description |
| `--ratio` | `-r` | `16:9` | `16:9` or `9:16` |
| `--output` | `-o` | `.` | Output directory |

## Aspect Ratios

| Ratio | Resolution | Best for |
|-------|-----------|----------|
| `1:1` | 1024x1024 | Avatars, icons, social posts |
| `16:9` | 1365x768 | Banners, covers, YouTube thumbnails |
| `9:16` | 768x1365 | Stories, reels, vertical posters |
| `4:3` | Classic | Presentations, photos |
| `3:4` | Classic | Portraits |

## Check Token Status

```bash
node scripts/status.mjs
```

## How It Works

```
Chrome Extension              CLI Scripts
     |                             |
     | 1. User clicks "Connect"    |
     |                             |
     +--> extracts access_token    |
     |    from labs.google session |
     |                             |
     +--> extracts session cookie  |
     |    (~30 day lifetime)       |
     |                             |
     +--> POST to localhost:3847 --+
     |                             |
     |    2. Token saved to        |
     |    ~/.flow-proxy/token.json |
     |                             |
     |    3. generate.mjs sends    |
     |    request to Google API    |
     |                             |
     |    4. When token expires,   |
     |    auto-refreshes via       |
     |    session cookie           |
```

**API endpoint:** `https://aisandbox-pa.googleapis.com/v1:runImageFx`

**Auth:** OAuth Bearer token from Google Labs session, auto-refreshed via session cookie

## Use as AI Agent Skill

This project follows the **Agent Skills** standard. Copy the folder to your skills directory:

```bash
cp -r whisk-proxy ~/.claude/skills/flow-image-gen
```

The AI agent will automatically discover the skill and use it when you ask to generate images or videos.

## Security

- All tokens are stored **locally** on your machine only (`~/.flow-proxy/token.json`)
- The Chrome extension only communicates with `localhost:3847`
- No data is sent to any third-party servers
- The auth server only binds to `127.0.0.1` (not accessible from network)

## Troubleshooting

### "No valid token found"
Install the Chrome extension and click "Connect" on the Flow page.

### "Token expired" + no auto-refresh
Session cookie may have expired (~30 days). Click "Connect" again.

### "API Error 403"
Your Google account may not have access. Use a personal Google account (not workspace).

### "API Error 429"
Rate limited. Wait a few minutes and try again.

### Extension says "Proxy server not running"
Run `generate.mjs` or `video.mjs` first — the auth server starts automatically.

## Requirements

- **Node.js 18+** (uses native `fetch`)
- **Google Chrome** (for the extension)
- **Google account** with access to [labs.google](https://labs.google)
- No npm dependencies, no build step

## License

MIT
