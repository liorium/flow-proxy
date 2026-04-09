# Flow Proxy

**Generate images and videos with Google Imagen, Nano Banana 2 / Pro, and Veo — completely free. No API key, no paid subscription.**

Uses Google Labs Flow API with your regular Google account. Chrome extension handles OAuth and reCAPTCHA automatically.

## What is this?

A lightweight CLI tool and AI Agent Skill that generates images and videos using Google's latest models through the Flow API (labs.google).

**Key features:**
- **Free** — only needs a Google account
- **No dependencies** — just Node.js 18+ and Chrome
- **Fully automatic auth** — OAuth token + reCAPTCHA handled by Chrome extension
- **Auto-refresh** — session cookie lasts ~30 days, no hourly re-auth
- **Image + video generation** — Imagen 4, Nano Banana 2, Nano Banana Pro, Reference-to-Image, Veo, and Veo r2v
- **AI Agent Skill** — works with Claude Code, Codex, and other AI agents
- **Dedicated video CLI included** — `scripts/generate-video.mjs` for Veo / Veo r2v runs

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
2. Open any project (or create one)
3. The URL will look like: `https://labs.google/fx/tools/flow/project/7c2f1287-513a-461d-8650-d53082e5949b`
4. Copy the UUID at the end — that's your project ID

The project ID is saved automatically on first use — no need to provide it again.

### 4. Generate images or videos

```bash
# First run — provide project ID once (saved for future runs)
node scripts/generate.mjs -p "a cat astronaut floating in space" --project-id YOUR_UUID

# Subsequent runs — no project ID needed
node scripts/generate.mjs -p "a cat astronaut floating in space"

# Nano Banana 2
node scripts/generate.mjs -p "abstract painting in neon colors" -m banana2

# Nano Banana Pro
node scripts/generate.mjs -p "editorial fashion portrait with dramatic studio light" -m banana-pro

# Landscape banner
node scripts/generate.mjs -p "futuristic city skyline at sunset" -r 16:9

# Single image, save to specific folder
node scripts/generate.mjs -p "abstract background" -c 1 -o ./my-images

# Text-to-video
node scripts/generate-video.mjs -p "cinematic river at dawn"

# Image-to-video
node scripts/generate-video.mjs -m veo-r2v -i ./examples/example-cyberpunk-city.jpg -p "slow cinematic fly-through"
```

**Requirement:** Chrome must be open with the `labs.google/fx/tools/flow` tab — the extension content script handles reCAPTCHA automatically.

## Models

| Model | Flag | Best for |
|-------|------|----------|
| **Imagen 4** | `-m imagen4` | Highest quality, photorealistic (default) |
| **Nano Banana 2** | `-m banana2` | Latest Nano Banana image generation |
| **Nano Banana Pro** | `-m banana-pro` | Higher-tier Nano Banana generation |
| **Reference-to-Image** | `-m r2i` | Style transfer |

## Model Selection Guide for Agents

Use the following guide when choosing an image model automatically.

### 1. Text-only prompts (zero-base generation)

- **Imagen 4** — choose this when the prompt contains required text, complex object relationships, or logically precise composition.
  - Example: “A is looking at B, and the billboard in the background says ‘SALE’.”
- **Nano Banana 2** — choose this when the goal is concept expansion, style exploration, or keeping a strong overall vibe across multiple prompt variants.
  - Best for mood-heavy prompts such as cyberpunk cityscapes or painterly atmosphere studies.
- **Nano Banana Pro** — choose this when raw visual quality, realism, lighting, and material detail are the main goal.
  - Best for metal, glass, skin, water, and cinematic lighting.

### 2. Reference-image workflows

- **Nano Banana 2** — best default when the user wants to preserve character identity, facial features, costume language, or a distinctive art style across new scenes.
- **Nano Banana Pro** — best when the reference composition is good but the output should look more premium, realistic, or physically polished.
- **Imagen 4** — best when the reference image also needs a precise logical edit, such as changing an object, adding text, or making composition-aware corrections.
- **Reference-to-Image (`r2i`)** — use when the task is primarily style transfer / image-to-image transformation through the dedicated Flow reference-image path.

### Decision Tree

1. Is exact text rendering required? → **Imagen 4**
2. Is there a reference image whose character or art style must stay consistent? → **Nano Banana 2**
3. Does the user want a much more realistic, luxurious, or cinematic reinterpretation of the reference? → **Nano Banana Pro**
4. Is the prompt extremely complex with many objects and precise logical placement? → **Imagen 4**
5. Is the goal primarily dedicated style transfer rather than free reinterpretation? → **r2i**

### Practical Tip

If the user says that **consistency and descriptive accuracy matter more than speed**, bias toward:
- **Imagen 4** for text / logic / layout
- **Nano Banana 2** for character or style continuity
- **Nano Banana Pro** for visual realism and material quality

## CLI Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | required | Image description (English works best) |
| `--model` | `-m` | `imagen4` | Model: imagen4, banana2, banana-pro, r2i |
| `--count` | `-c` | `1` | Number of images per request (1-4) |
| `--ratio` | `-r` | `16:9` | Aspect ratio (see below) |
| `--output` | `-o` | `.` | Output directory |
| `--seed` | `-s` | random | Seed for reproducibility |
| `--project-id` | `-j` | saved | Flow project UUID (required on first run) |

## Aspect Ratios

| Ratio | Resolution | Best for |
|-------|-----------|----------|
| `1:1` | Varies by Flow output | Avatars, icons, social posts |
| `16:9` | Varies by Flow output | Banners, covers, YouTube thumbnails |
| `9:16` | Varies by Flow output | Stories, reels, vertical posters |
| `4:3` | Varies by Flow output | Presentations, photos |
| `3:4` | Varies by Flow output | Portraits |

Exact pixel dimensions may vary by Flow model and the media format returned for a given generation.

## Check Token Status

```bash
node scripts/status.mjs
```

## Video Generation

This repository includes a dedicated video CLI, and the skill can be used for video generation requests too:

```bash
# Text-to-video
node scripts/generate-video.mjs -p "cinematic river at dawn"

# Image-to-video using the bundled example asset
node scripts/generate-video.mjs -m veo-r2v -i ./examples/example-cyberpunk-city.jpg -p "slow cinematic fly-through"
```

Video generation currently exposes aspect ratio selection, but exact encoded pixel resolution may vary by Flow model/output.

## How It Works

```
Chrome Extension (content script) CLI Script
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
        |   3. generate.mjs /          |
        |      generate-video.mjs send |
        |      requests to Flow API    |
        |      with OAuth + reCAPTCHA  |
        |                              |
        |   4. signed media URL        |
        |      downloaded & saved      |
        |                              |
        |   5. OAuth auto-refreshes    |
        |      via session cookie      |
        |      (~30 days)              |
```

**Image endpoint:** `https://aisandbox-pa.googleapis.com/v1/projects/{projectId}/flowMedia:batchGenerateImages`

**Video endpoints:** used by `scripts/generate-video.mjs` for text-to-video and image-to-video generation.

**Auth:** OAuth Bearer token from Google Labs session, auto-refreshed via session cookie

**reCAPTCHA:** Handled automatically by the Chrome extension content script

## Use as AI Agent Skill

This project follows the **Agent Skills** standard. Copy the folder to your skills directory:

```bash
cp -r flow-proxy ~/.claude/skills/flow-proxy
```

The AI agent will automatically discover the skill and use it when you ask to generate images or videos.

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
