#!/usr/bin/env node
/**
 * Flow Proxy — Image Generator
 * Generate images via Google Flow (Imagen 4)
 * No API key, no npm install — just Node.js 18+
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { parseArgs } from 'util';
import { ensureToken } from './lib/auth.mjs';

const ENDPOINT = 'https://aisandbox-pa.googleapis.com/v1:runImageFx';

const MODELS = {
  'imagen4': 'IMAGEN_3_5',
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
    prompt:  { type: 'string', short: 'p' },
    model:   { type: 'string', short: 'm', default: 'imagen4' },
    ratio:   { type: 'string', short: 'r', default: '1:1' },
    output:  { type: 'string', short: 'o', default: '.' },
    count:   { type: 'string', short: 'c', default: '4' },
    seed:    { type: 'string', short: 's' },
    help:    { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help || !values.prompt) {
  console.log(`Flow Image Generator

Usage: node generate.mjs -p "prompt" [options]

Options:
  -p, --prompt   Image description (English works best)      [required]
  -r, --ratio    Aspect ratio: 1:1, 16:9, 9:16, 4:3, 3:4   [default: 1:1]
  -o, --output   Output directory                            [default: .]
  -c, --count    Number of images per request (1-4)          [default: 4]
  -s, --seed     Random seed (for reproducibility)
  -h, --help     Show this help`);
  process.exit(values.help ? 0 : 1);
}

async function generate(prompt, model, ratio, count, seed, token) {
  const payload = {
    userInput: {
      candidatesCount: count,
      prompts: [prompt],
      seed: seed ?? Math.floor(Math.random() * 2147483647),
    },
    clientContext: {
      sessionId: ';' + Date.now(),
      tool: 'IMAGE_FX',
    },
    aspectRatio: ASPECT_MAP[ratio] || 'IMAGE_ASPECT_RATIO_SQUARE',
    modelInput: {
      modelNameType: MODELS[model] || 'IMAGEN_3_5',
    },
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Origin': 'https://labs.google',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const panels = data.imagePanels || [];

  if (panels.length > 0 && panels[0].generatedImages?.length > 0) {
    return panels[0].generatedImages.map(img => img.encodedImage);
  }

  throw new Error('No images in response');
}

async function main() {
  const token = await ensureToken();
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
    const images = await generate(values.prompt, model, values.ratio, count, seed, token);

    const ts = Date.now();
    const savedFiles = [];
    for (let i = 0; i < images.length; i++) {
      const filename = `flow_${ts}_${i}.png`;
      const filepath = join(outputDir, filename);
      writeFileSync(filepath, Buffer.from(images[i], 'base64'));
      savedFiles.push(filepath);
      console.log(`Saved: ${filepath}`);
    }

    console.log(`\nDone! ${savedFiles.length} image(s) saved.`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
