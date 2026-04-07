#!/usr/bin/env node
/**
 * Flow Proxy — Image Generator
 * Generate images via Google Flow (Imagen 4, Nano Banana, Reference-to-Image)
 * No API key, no npm install — just Node.js 18+ and Chrome
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { parseArgs } from 'util';
import { randomUUID } from 'crypto';
import {
  ensureToken,
  getRecaptchaToken,
  startServer,
  stopServer,
  readToken,
  saveToken,
} from './lib/auth.mjs';

const ENDPOINT_BASE = 'https://aisandbox-pa.googleapis.com/v1';

const MODELS = {
  'imagen4': 'IMAGEN_3_5',
  'banana':  'GEM_PIX',
  'r2i':     'R2I',
};

const ASPECT_MAP = {
  '1:1':  'IMAGE_ASPECT_RATIO_SQUARE',
  '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
  '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
  '4:3':  'IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE',
  '3:4':  'IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR',
};

const { values } = parseArgs({
  options: {
    prompt:     { type: 'string',  short: 'p' },
    model:      { type: 'string',  short: 'm', default: 'imagen4' },
    ratio:      { type: 'string',  short: 'r', default: '1:1' },
    output:     { type: 'string',  short: 'o', default: '.' },
    count:      { type: 'string',  short: 'c', default: '4' },
    seed:       { type: 'string',  short: 's' },
    'project-id': { type: 'string', short: 'j' },
    help:       { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help || !values.prompt) {
  console.log(`Flow Image Generator

Usage: node generate.mjs -p "prompt" [options]

Options:
  -p, --prompt       Image description (English works best)      [required]
  -m, --model        Model: imagen4, banana, r2i                 [default: imagen4]
  -r, --ratio        Aspect ratio: 1:1, 16:9, 9:16, 4:3, 3:4   [default: 1:1]
  -o, --output       Output directory                            [default: .]
  -c, --count        Number of images per request (1-4)          [default: 4]
  -s, --seed         Random seed (for reproducibility)
  -j, --project-id   Google Flow project ID (saved on first use)
  -h, --help         Show this help

Models:
  imagen4      Imagen 4 (highest quality, default)
  banana       Nano Banana (fast, creative)
  r2i          Reference-to-Image (style transfer)`);
  process.exit(values.help ? 0 : 1);
}

/**
 * Resolve project ID: CLI flag > token.json > error
 */
function resolveProjectId() {
  if (values['project-id']) {
    const data = readToken() || {};
    if (data.projectId !== values['project-id']) {
      saveToken({ ...data, projectId: values['project-id'] });
    }
    return values['project-id'];
  }
  const data = readToken();
  if (data?.projectId) return data.projectId;

  console.error(`
Error: Project ID not found.

Find your project ID:
  1. Open https://labs.google/fx/tools/flow in Chrome
  2. Open any project — the URL will look like:
     https://labs.google/fx/tools/flow/project/YOUR_UUID
  3. Copy the UUID from the URL

Then run with: node generate.mjs -p "..." --project-id YOUR_UUID
(Saved automatically for future runs)
`);
  process.exit(1);
}

async function generate(prompt, model, ratio, count, seed, token, projectId, recaptchaToken) {
  const sessionId = ';' + Date.now();
  const batchId = randomUUID();
  const clientCtx = {
    recaptchaContext: { token: recaptchaToken, applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB' },
    projectId,
    tool: 'PINHOLE',
    sessionId,
  };

  const payload = {
    clientContext: clientCtx,
    mediaGenerationContext: { batchId },
    useNewMedia: true,
    requests: Array.from({ length: count }, () => ({
      clientContext: clientCtx,
      imageModelName: MODELS[model] || 'IMAGEN_3_5',
      imageAspectRatio: ASPECT_MAP[ratio] || 'IMAGE_ASPECT_RATIO_SQUARE',
      structuredPrompt: { parts: [{ text: prompt }] },
      seed: seed ?? Math.floor(Math.random() * 2147483647),
      imageInputs: [],
    })),
  };

  const res = await fetch(
    `${ENDPOINT_BASE}/projects/${projectId}/flowMedia:batchGenerateImages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://labs.google',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return extractImages(data);
}

/**
 * Extract base64 images from the response.
 * Handles Flow (media[]) and legacy ImageFX (imagePanels) formats.
 */
function extractImages(data) {
  // Flow format: { media: [{ image: { generatedImage: { fifeUrl | encodedImage } } }] }
  if (Array.isArray(data.media) && data.media.length > 0) {
    const results = [];
    for (const item of data.media) {
      const g = item.image?.generatedImage;
      if (!g) continue;
      if (g.fifeUrl) {
        results.push({ type: 'url', url: g.fifeUrl });
      } else {
        const b64 = g.encodedImage || g.imageBytes;
        if (b64) results.push({ type: 'base64', data: b64 });
      }
    }
    if (results.length > 0) return results;

    console.error('\nCould not find image data. Response structure:');
    console.error(JSON.stringify(data.media[0], null, 2));
    throw new Error('Image data not found in response');
  }

  // Legacy ImageFX format: { imagePanels: [{ generatedImages: [{ encodedImage }] }] }
  if (data.imagePanels) {
    const panels = data.imagePanels;
    if (panels.length > 0 && panels[0].generatedImages?.length > 0) {
      return panels[0].generatedImages.map(img => ({ type: 'base64', data: img.encodedImage }));
    }
  }

  // Unknown format
  console.error('\nUnexpected response structure:');
  console.error(JSON.stringify(data, null, 2).slice(0, 800));
  throw new Error('Could not extract images from response');
}

async function main() {
  await startServer();

  const token = await ensureToken();
  const projectId = resolveProjectId();
  const outputDir = values.output;
  const count = Math.min(Math.max(parseInt(values.count) || 4, 1), 4);
  const model = values.model;
  const seed = values.seed ? parseInt(values.seed) : undefined;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const modelLabel = model in MODELS ? model : 'imagen4';
  console.log(`\nGenerating ${count} image(s): "${values.prompt}" [${modelLabel}, ${values.ratio}]`);

  try {
    const recaptchaToken = await getRecaptchaToken();
    console.log(' OK');

    const images = await generate(
      values.prompt, model, values.ratio, count, seed,
      token, projectId, recaptchaToken
    );

    const ts = Date.now();
    for (let i = 0; i < images.length; i++) {
      const filepath = join(outputDir, `flow_${ts}_${i}.png`);
      const item = images[i];
      if (item.type === 'url') {
        const imgRes = await fetch(item.url);
        if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
        const buf = Buffer.from(await imgRes.arrayBuffer());
        writeFileSync(filepath, buf);
      } else {
        writeFileSync(filepath, Buffer.from(item.data, 'base64'));
      }
      console.log(`Saved: ${filepath}`);
    }

    console.log(`\nDone! ${images.length} image(s) saved.`);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    stopServer();
    process.exit(1);
  }

  stopServer();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  stopServer();
  process.exit(1);
});
