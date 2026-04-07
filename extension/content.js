/**
 * Flow Proxy — Content Script (MAIN world)
 * Polls local server for reCAPTCHA token requests and fulfills them.
 *
 * WHY MAIN world (not ISOLATED): content scripts normally run in an isolated
 * JS context and cannot access page variables like `grecaptcha`. We need
 * grecaptcha.enterprise.execute() to generate tokens that Google accepts.
 * ISOLATED world content scripts dispatching CustomEvents to page-injected
 * scripts lose event.detail across the world boundary in Chrome MV3.
 * Running in MAIN world gives us direct access to grecaptcha while still
 * keeping the script alive as long as the tab is open (unlike service workers,
 * which Chrome can suspend at any time, breaking setInterval-based polling).
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
