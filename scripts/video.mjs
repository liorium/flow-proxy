#!/usr/bin/env node
/**
 * Flow Proxy — Video Generator
 * Generate videos via Google Flow (Veo 3.1)
 * Requires Google AI Pro ($20/mo) or free credits
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { parseArgs } from 'util';
import { ensureToken } from './lib/auth.mjs';

const ENDPOINT = 'https://aisandbox-pa.googleapis.com/v1:runVideoFx';

const ASPECT_MAP = {
  '16:9': 'VIDEO_ASPECT_RATIO_LANDSCAPE',
  '9:16': 'VIDEO_ASPECT_RATIO_PORTRAIT',
};

const { values } = parseArgs({
  options: {
    prompt: { type: 'string', short: 'p' },
    ratio:  { type: 'string', short: 'r', default: '16:9' },
    output: { type: 'string', short: 'o', default: '.' },
    help:   { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help || !values.prompt) {
  console.log(`Flow Video Generator (Veo 3.1)

Usage: node video.mjs -p "prompt" [options]

Options:
  -p, --prompt   Video description (English works best)  [required]
  -r, --ratio    Aspect ratio: 16:9 or 9:16              [default: 16:9]
  -o, --output   Output directory                        [default: .]
  -h, --help     Show this help

Note: Video generation requires Google AI Pro subscription ($20/mo)
or free credits (100 initial + 50 daily).`);
  process.exit(values.help ? 0 : 1);
}

async function generateVideo(prompt, ratio, token) {
  const payload = {
    userInput: {
      prompts: [prompt],
      seed: Math.floor(Math.random() * 2147483647),
    },
    clientContext: {
      sessionId: ';' + Date.now(),
      tool: 'VIDEO_FX',
    },
    aspectRatio: ASPECT_MAP[ratio] || 'VIDEO_ASPECT_RATIO_LANDSCAPE',
    duration: 'VIDEO_DURATION_FIVE',
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

  // Video generation is async — returns operation ID
  if (data.name) {
    return { operationId: data.name, status: 'pending' };
  }

  // Direct response with video
  if (data.videoPanels?.length > 0) {
    const videos = data.videoPanels[0].generatedVideos || [];
    if (videos.length > 0) {
      return { video: videos[0].encodedVideo, status: 'done' };
    }
  }

  throw new Error('Unexpected response format');
}

async function pollOperation(operationId, token) {
  const pollUrl = `https://aisandbox-pa.googleapis.com/v1/${operationId}`;
  const maxAttempts = 60; // 5 minutes max

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));
    process.stdout.write('.');

    const res = await fetch(pollUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://labs.google',
      },
    });

    if (!res.ok) continue;

    const data = await res.json();

    if (data.done) {
      if (data.error) {
        throw new Error(`Generation failed: ${data.error.message}`);
      }
      const videos = data.response?.videoPanels?.[0]?.generatedVideos || [];
      if (videos.length > 0) {
        return videos[0].encodedVideo;
      }
      throw new Error('No video in response');
    }
  }

  throw new Error('Video generation timed out (5 minutes)');
}

async function main() {
  const token = await ensureToken();
  const outputDir = values.output;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\nGenerating video: "${values.prompt}" [${values.ratio}]`);
  console.log('This may take 1-3 minutes...');

  try {
    const result = await generateVideo(values.prompt, values.ratio, token);

    let videoBase64;

    if (result.status === 'pending') {
      process.stdout.write('Waiting');
      videoBase64 = await pollOperation(result.operationId, token);
      console.log(' done!');
    } else {
      videoBase64 = result.video;
    }

    const ts = Date.now();
    const filename = `flow_${ts}.mp4`;
    const filepath = join(outputDir, filename);
    writeFileSync(filepath, Buffer.from(videoBase64, 'base64'));
    console.log(`\nSaved: ${filepath}`);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
