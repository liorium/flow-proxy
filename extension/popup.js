/**
 * Flow Proxy Auth - Chrome Extension
 * Connects Google Flow to CLI scripts for image generation
 */

const PROXY_URL = 'http://localhost:3847';
const FLOW_URL = 'https://labs.google/fx/tools/flow';
const AUTH_SESSION_URL = 'https://labs.google/fx/api/auth/session';
const SESSION_COOKIE_NAME = '__Secure-next-auth.session-token';

const statusEl = document.getElementById('status');
const statusTextEl = document.getElementById('statusText');
const infoEl = document.getElementById('info');
const connectBtn = document.getElementById('connectBtn');
const openFlowBtn = document.getElementById('openFlowBtn');
const errorEl = document.getElementById('error');

function showError(message) {
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

function hideError() {
  errorEl.style.display = 'none';
}

function updateStatus(connected, message) {
  statusEl.className = `status ${connected ? 'connected' : 'disconnected'}`;
  statusTextEl.textContent = message;
}

function setLoading(loading) {
  if (loading) {
    statusEl.className = 'status loading';
    statusTextEl.textContent = 'Connecting...';
    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting...';
  } else {
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect';
  }
}

async function checkSessionStatus() {
  try {
    const res = await fetch(AUTH_SESSION_URL, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || data.accessToken || null;
  } catch {
    return null;
  }
}

/**
 * Get access token via content script injection.
 * executeScript with async func returns a Promise-wrapped value,
 * so we must use the proper callback pattern.
 */
async function getTokenFromTab(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: async () => {
      try {
        const res = await fetch('https://labs.google/fx/api/auth/session');
        if (!res.ok) return null;
        const data = await res.json();
        return data.access_token || data.accessToken || null;
      } catch {
        return null;
      }
    }
  });

  if (results && results[0] && results[0].result) {
    return results[0].result;
  }
  return null;
}

/**
 * Get session cookie for long-lived auto-refresh (~30 days)
 */
async function getSessionCookie() {
  const cookie = await chrome.cookies.get({
    url: 'https://labs.google',
    name: SESSION_COOKIE_NAME
  });
  return cookie ? cookie.value : null;
}

/**
 * Send token + session cookie to the local auth server
 */
async function sendAuthToProxy(accessToken, sessionCookie) {
  const response = await fetch(`${PROXY_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, sessionCookie })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to send token');
  }

  return response.json();
}

async function handleConnect() {
  hideError();
  setLoading(true);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) throw new Error('No active tab found');

    if (!tab.url || !tab.url.includes('labs.google')) {
      throw new Error('Open labs.google/fx/tools/flow first');
    }

    // Get access token from page context
    const accessToken = await getTokenFromTab(tab.id);
    if (!accessToken) {
      throw new Error('Not logged in. Sign into Google on the Flow page first.');
    }

    // Get session cookie for auto-refresh
    const sessionCookie = await getSessionCookie();

    // Send to local proxy server (must be running via generate.mjs)
    try {
      await sendAuthToProxy(accessToken, sessionCookie);
    } catch {
      throw new Error('CLI server not running. Run generate.mjs first, then click Connect.');
    }

    updateStatus(true, 'Connected');
    infoEl.textContent = (sessionCookie ? 'Token auto-refreshes for ~30 days.' : 'Token valid for ~1 hour.') + '  reCAPTCHA: auto';
    connectBtn.textContent = 'Reconnect';

  } catch (error) {
    showError(error.message);
    updateStatus(false, 'Connection failed');
  } finally {
    setLoading(false);
  }
}

async function handleOpenFlow() {
  chrome.tabs.create({ url: FLOW_URL });
}

async function init() {
  const token = await checkSessionStatus();

  if (token) {
    updateStatus(true, 'Connected');
    infoEl.textContent = 'OAuth ✓  |  reCAPTCHA: auto';
    connectBtn.textContent = 'Reconnect';
  } else {
    updateStatus(false, 'Not connected');
    infoEl.textContent = 'Open labs.google/fx/tools/flow, sign in, then click Connect.';
  }

  connectBtn.disabled = false;
}

connectBtn.addEventListener('click', handleConnect);
openFlowBtn.addEventListener('click', handleOpenFlow);
document.getElementById('githubLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://github.com/liorium/flow-proxy' });
});

init();
