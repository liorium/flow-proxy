# Flow Proxy

**Generate images with Google Imagen 4 and Nano Banana — completely free. No API key, no paid subscription.**

Uses Google Labs Flow API with your regular Google account. Chrome extension handles OAuth and reCAPTCHA automatically.

## What is this?

A lightweight CLI tool and AI Agent Skill that generates images using Google's latest models through the Flow API (labs.google).

**Key features:**
- **Free** — only needs a Google account
- **No dependencies** — just Node.js 18+ and Chrome
- **Fully automatic auth** — OAuth token + reCAPTCHA handled by Chrome extension
- **Auto-refresh** — session cookie lasts ~30 days, no hourly re-auth
- **3 models** — Imagen 4, Nano Banana, Reference-to-Image
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
3. Run `node scripts/generate.mjs -p "test" --project-id YOUR_PROJECT_ID` (see below)
4. Click the **Flow Proxy** extension icon → **"Connect"**

Token auto-refreshes for ~30 days. After that, repeat step 4.

### 3. Find your Project ID (one-time)

1. Open [labs.google/fx/tools/flow](https://labs.google/fx/tools/flow) in Chrome
2. Open DevTools → **Network** tab
3. Generate any image on the page
4. Find the request named `batchGenerateImages`
5. Copy the UUID from the URL: `/v1/projects/{THIS_UUID}/flowMedia:batchGenerateImages`

The project ID is saved automatically on first use — no need to provide it again.

### 4. Generate images

```bash
# First run — provide project ID once (saved for future runs)
node scripts/generate.mjs -p "a cat astronaut floating in space" --project-id YOUR_UUID

# Subsequent runs — no project ID needed
node scripts/generate.mjs -p "a cat astronaut floating in space"

# Nano Banana (fast, creative)
node scripts/generate.mjs -p "abstract painting in neon colors" -m banana

# Landscape banner
node scripts/generate.mjs -p "futuristic city skyline at sunset" -r 16:9

# Single image, save to specific folder
node scripts/generate.mjs -p "abstract background" -c 1 -o ./my-images
```

**Requirement:** Chrome must be open with the `labs.google/fx/tools/flow` tab — the extension handles reCAPTCHA automatically in the background.

## Models

| Model | Flag | Best for |
|-------|------|----------|
| **Imagen 4** | `-m imagen4` | Highest quality, photorealistic (default) |
| **Nano Banana** | `-m banana` | Fast, creative generation |
| **Reference-to-Image** | `-m r2i` | Style transfer |

## CLI Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | required | Image description (English works best) |
| `--model` | `-m` | `imagen4` | Model: imagen4, banana, r2i |
| `--count` | `-c` | `4` | Number of images per request (1-4) |
| `--ratio` | `-r` | `1:1` | Aspect ratio (see below) |
| `--output` | `-o` | `.` | Output directory |
| `--seed` | `-s` | random | Seed for reproducibility |
| `--project-id` | `-j` | saved | Flow project UUID (required on first run) |

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
Chrome Extension (background)     CLI Script
        |                              |
        | content.js runs on           |
        | labs.google tab at all times |
        |                              |
        |   1. generate.mjs starts     |
        |      local server :3847      |
        |                              |
        |   2. server requests         |
        |      reCAPTCHA token  <------+
        |                              |
        +--> calls grecaptcha.execute()|
        |    in labs.google tab        |
        |                              |
        +--> POST token to :3847 ------+
        |                              |
        |   3. generate.mjs sends      |
        |      request to Flow API     |
        |      with OAuth + reCAPTCHA  |
        |                              |
        |   4. signed image URL        |
        |      downloaded & saved      |
        |                              |
        |   5. OAuth auto-refreshes    |
        |      via session cookie      |
        |      (~30 days)              |
```

**API endpoint:** `https://aisandbox-pa.googleapis.com/v1/projects/{projectId}/flowMedia:batchGenerateImages`

**Auth:** OAuth Bearer token from Google Labs session, auto-refreshed via session cookie

**reCAPTCHA:** Handled automatically by the Chrome extension content script

## Use as AI Agent Skill

This project follows the **Agent Skills** standard. Copy the folder to your skills directory:

```bash
cp -r flow-proxy ~/.claude/skills/flow-proxy
```

The AI agent will automatically discover the skill and use it when you ask to generate images.

## Security

- All tokens are stored **locally** on your machine only (`~/.flow-proxy/token.json`)
- The Chrome extension only communicates with `localhost:3847`
- No data is sent to any third-party servers
- The auth server only binds to `127.0.0.1` (not accessible from network)

## Troubleshooting

### "No valid token found" / "Auth timeout"
Run `generate.mjs` and click "Connect" in the Flow Proxy extension while on labs.google/fx/tools/flow.

### "reCAPTCHA timeout"
Make sure Chrome is open with the `labs.google/fx/tools/flow` tab. The extension's content script must be active.

### "Token expired" + no auto-refresh
Session cookie may have expired (~30 days). Run `generate.mjs` and click "Connect" again.

### "API Error 403"
Your Google account may not have access. Use a personal Google account (not Workspace).

### "API Error 429"
Rate limited. Wait a few minutes and try again.

### Extension popup shows "Not connected"
Sign into Google on labs.google/fx/tools/flow, then click "Connect" in the extension while `generate.mjs` is running.

## Requirements

- **Node.js 18+** (uses native `fetch`)
- **Google Chrome** (for the extension)
- **Google account** with access to [labs.google](https://labs.google)
- **labs.google/fx/tools/flow tab open** during generation (for reCAPTCHA)
- No npm dependencies, no build step

## License

MIT
