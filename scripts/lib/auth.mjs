/**
 * Flow Proxy — Auth module
 * Token management + persistent HTTP server for auth and reCAPTCHA
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createServer } from 'http';

const TOKEN_DIR = join(homedir(), '.flow-proxy');
const TOKEN_FILE = join(TOKEN_DIR, 'token.json');
const PORT = 3847;

// Server state
let _server = null;
let _authResolve = null;

// reCAPTCHA state
let _recaptchaNeeded = false;
let _recaptchaResolve = null;
let _recaptchaReject = null;
let _recaptchaPromise = null; // cached pending promise

// ─── Token file helpers ────────────────────────────────────────────────────

export function readToken() {
  if (!existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveToken(data) {
  mkdirSync(TOKEN_DIR, { recursive: true });
  writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
}

// ─── Token validation & refresh ───────────────────────────────────────────

export async function refreshToken(sessionCookie) {
  const res = await fetch('https://labs.google/fx/api/auth/session', {
    headers: { 'Cookie': `__Secure-next-auth.session-token=${sessionCookie}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || data.accessToken || null;
}

export async function getValidToken() {
  const data = readToken();
  if (!data) return null;

  // Token still valid (5 min buffer)
  if (data.accessToken && data.expiresAt && data.expiresAt > Date.now() + 300000) {
    return data.accessToken;
  }

  // Auto-refresh via session cookie
  if (data.sessionCookie) {
    const newToken = await refreshToken(data.sessionCookie);
    if (newToken) {
      saveToken({ ...data, accessToken: newToken, expiresAt: Date.now() + 3600000 });
      console.log('Token auto-refreshed via session cookie.');
      return newToken;
    }
    console.error('Session cookie expired. Please reconnect the extension.');
  }

  return null;
}

// ─── HTTP server ───────────────────────────────────────────────────────────

function handleRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  // Status
  if (req.method === 'GET' && req.url === '/status') {
    const token = readToken();
    const connected = !!(token?.accessToken && token.expiresAt > Date.now());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ connected, message: connected ? 'Token valid' : 'Waiting for connection' }));
    return;
  }

  // OAuth token from extension
  if (req.method === 'POST' && req.url === '/auth') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { accessToken, sessionCookie } = JSON.parse(body);
        if (!accessToken || !accessToken.startsWith('ya29')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid token' }));
          return;
        }
        saveToken({ accessToken, sessionCookie: sessionCookie || null, expiresAt: Date.now() + 3600000 });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Connected!' }));
        if (_authResolve) {
          console.log('Token received! Proceeding...\n');
          const resolve = _authResolve;
          _authResolve = null;
          resolve(accessToken);
        }
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // reCAPTCHA need check (polled by extension background.js)
  if (req.method === 'GET' && req.url === '/need-recaptcha') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ needed: _recaptchaNeeded }));
    return;
  }

  // reCAPTCHA token from extension
  if (req.method === 'POST' && req.url === '/recaptcha-token') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { token, error } = JSON.parse(body);
        _recaptchaNeeded = false;
        const resolve = _recaptchaResolve;
        const reject = _recaptchaReject;
        _recaptchaResolve = null;
        _recaptchaReject = null;
        // _recaptchaPromise is cleared via .finally() in getRecaptchaToken

        if (error && reject) {
          reject(new Error(error));
        } else if (token && resolve) {
          resolve(token);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400); res.end('Bad request');
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
}

/**
 * Start the persistent HTTP server.
 * Returns the server instance, or null if port is already in use.
 */
export function startServer() {
  return new Promise((resolve) => {
    const srv = createServer(handleRequest);

    srv.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Another instance is already running — still usable for reCAPTCHA
        resolve(null);
      } else {
        console.error('Server error:', err.message);
        resolve(null);
      }
    });

    srv.listen(PORT, '127.0.0.1', () => {
      _server = srv;
      resolve(srv);
    });
  });
}

export function stopServer() {
  if (_server) {
    _server.close();
    _server = null;
  }
}

// ─── Auth flow ─────────────────────────────────────────────────────────────

/**
 * Wait for the user to click "Connect" in the Chrome extension.
 * Server must already be running.
 */
function waitForAuthToken() {
  return new Promise((resolve, reject) => {
    _authResolve = resolve;

    console.log('');
    console.log('='.repeat(60));
    console.log('  ACTION REQUIRED:');
    console.log('  1. Open Chrome: https://labs.google/fx/tools/flow');
    console.log('  2. Click the Flow Proxy extension icon');
    console.log('  3. Click "Connect"');
    console.log('='.repeat(60));
    console.log('');

    // Also poll token file (catches tokens saved before server started)
    const pollInterval = setInterval(async () => {
      const token = await getValidToken();
      if (token && _authResolve) {
        clearInterval(pollInterval);
        const r = _authResolve;
        _authResolve = null;
        console.log('Token found! Proceeding...\n');
        r(token);
      }
    }, 2000);

    setTimeout(() => {
      if (_authResolve) {
        clearInterval(pollInterval);
        _authResolve = null;
        reject(new Error('Auth timeout (10 minutes). Try again.'));
      }
    }, 600000);
  });
}

/**
 * Ensure a valid OAuth token exists. Starts the server if needed.
 */
export async function ensureToken() {
  const token = await getValidToken();
  if (token) return token;
  return waitForAuthToken();
}

// ─── reCAPTCHA ─────────────────────────────────────────────────────────────

/**
 * Request a reCAPTCHA token from the Chrome extension.
 * Concurrent calls share the same pending promise (idempotent).
 * Requires the server to be running and Chrome with labs.google tab open.
 */
export function getRecaptchaToken() {
  if (_recaptchaPromise) return _recaptchaPromise;

  _recaptchaPromise = new Promise((resolve, reject) => {
    _recaptchaNeeded = true;
    _recaptchaResolve = resolve;
    _recaptchaReject = reject;

    process.stdout.write('Getting reCAPTCHA token from extension...');

    setTimeout(() => {
      if (_recaptchaNeeded) {
        _recaptchaNeeded = false;
        _recaptchaResolve = null;
        _recaptchaReject = null;
        reject(new Error(
          '\nreCAPTCHA timeout. Make sure Chrome is open with the labs.google/fx/tools/flow tab.'
        ));
        // _recaptchaPromise is cleared via .finally() below
      }
    }, 30000);
  }).finally(() => {
    _recaptchaPromise = null;
  });

  return _recaptchaPromise;
}
