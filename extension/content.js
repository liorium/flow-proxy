/**
 * Flow Proxy — Content Script (MAIN world)
 * Polls local server for reCAPTCHA token requests and fulfills them.
 * Runs in the page's main execution context — has direct access to grecaptcha.
 */

const PROXY_URL = 'http://localhost:3847';
const SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
const POLL_INTERVAL = 1500;

let isProviding = false;

async function poll() {
  if (isProviding) return;

  try {
    const res = await fetch(`${PROXY_URL}/need-recaptcha`, {
      signal: AbortSignal.timeout(1000),
    });
    if (!res.ok) return;

    const { needed } = await res.json();
    if (!needed) return;

    isProviding = true;
    try {
      if (typeof grecaptcha === 'undefined' || !grecaptcha.enterprise) {
        throw new Error('reCAPTCHA not loaded yet on this page.');
      }
      const token = await grecaptcha.enterprise.execute(SITE_KEY, { action: 'IMAGE_GENERATION' });
      await fetch(`${PROXY_URL}/recaptcha-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch (e) {
      await fetch(`${PROXY_URL}/recaptcha-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: e.message }),
      });
    } finally {
      isProviding = false;
    }
  } catch {
    // Server not running — no-op
  }
}

setInterval(poll, POLL_INTERVAL);
