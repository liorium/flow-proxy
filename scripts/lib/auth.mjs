/**
 * Flow Proxy — Auth module
 * Token management + embedded HTTP auth server
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createServer } from 'http';

const TOKEN_DIR = join(homedir(), '.flow-proxy');
const TOKEN_FILE = join(TOKEN_DIR, 'token.json');
const PORT = 3847;

/**
 * Read saved token data
 */
export function readToken() {
  if (!existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Save token data to disk
 */
export function saveToken(data) {
  mkdirSync(TOKEN_DIR, { recursive: true });
  writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
}

/**
 * Try to refresh access token using stored session cookie
 */
export async function refreshToken(sessionCookie) {
  const res = await fetch('https://labs.google/fx/api/auth/session', {
    headers: {
      'Cookie': `__Secure-next-auth.session-token=${sessionCookie}`,
    },
  });

  if (!res.ok) return null;

  const data = await res.json();
  const accessToken = data.access_token || data.accessToken;
  if (!accessToken) return null;

  return accessToken;
}

/**
 * Get a valid access token — reads from file, auto-refreshes if expired
 */
export async function getValidToken() {
  const data = readToken();
  if (!data) return null;

  // Check if access token is still valid (5 min buffer)
  if (data.accessToken && data.expiresAt && data.expiresAt > Date.now() + 300000) {
    return data.accessToken;
  }

  // Try auto-refresh via session cookie
  if (data.sessionCookie) {
    const newToken = await refreshToken(data.sessionCookie);
    if (newToken) {
      saveToken({
        ...data,
        accessToken: newToken,
        expiresAt: Date.now() + 3600000,
      });
      console.log('Token auto-refreshed via session cookie.');
      return newToken;
    }
    console.error('Session cookie expired. Please reconnect the extension.');
  }

  return null;
}

/**
 * Start local auth server and wait for the Chrome extension to send a token.
 * Returns the access token.
 */
export function startAuthServer() {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const server = createServer((req, res) => {
      // CORS headers for extension requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Status endpoint
      if (req.method === 'GET' && req.url === '/status') {
        const token = readToken();
        const connected = token?.accessToken && token.expiresAt > Date.now();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          connected,
          message: connected ? 'Token valid' : 'Waiting for connection',
        }));
        return;
      }

      // Auth endpoint — receives token from extension
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

            saveToken({
              accessToken,
              sessionCookie: sessionCookie || null,
              expiresAt: Date.now() + 3600000,
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, message: 'Connected!' }));

            if (!resolved) {
              resolved = true;
              console.log('Token received! Proceeding...\n');
              setTimeout(() => {
                server.close();
                resolve(accessToken);
              }, 200);
            }
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid request' }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Server already running — another script instance is handling auth
        reject(new Error('Auth server already running on port ' + PORT));
      } else {
        reject(err);
      }
    });

    // Poll token file every 2s — catches tokens saved before server started
    const pollInterval = setInterval(async () => {
      if (resolved) { clearInterval(pollInterval); return; }
      const token = await getValidToken();
      if (token && !resolved) {
        resolved = true;
        clearInterval(pollInterval);
        console.log('Token found! Proceeding...\n');
        server.close();
        resolve(token);
      }
    }, 2000);

    server.listen(PORT, '127.0.0.1', () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('  ACTION REQUIRED:');
      console.log('  1. Open Chrome: https://labs.google/fx/tools/flow');
      console.log('  2. Click the Flow Proxy extension icon');
      console.log('  3. Click "Connect"');
      console.log('='.repeat(60));
      console.log('');
    });

    // Timeout 10 minutes
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearInterval(pollInterval);
        server.close();
        reject(new Error('Auth timeout (10 minutes). Try again.'));
      }
    }, 600000);
  });
}

/**
 * Ensure we have a valid token. If not, start auth server and wait.
 * Returns access token string.
 */
export async function ensureToken() {
  // 1. Try reading existing token
  const token = await getValidToken();
  if (token) return token;

  // 2. No valid token — start auth server and wait for extension
  return startAuthServer();
}
