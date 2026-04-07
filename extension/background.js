/**
 * Flow Proxy — Background Service Worker
 * Polls local server for reCAPTCHA token requests and fulfills them
 * using the real user session on labs.google
 */

const PROXY_URL = 'http://localhost:3847';
const RECAPTCHA_SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
const POLL_INTERVAL = 1500;

let isProviding = false;

async function pollForRecaptchaNeeds() {
  if (isProviding) return;

  try {
    const res = await fetch(`${PROXY_URL}/need-recaptcha`, {
      signal: AbortSignal.timeout(1000),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.needed) {
      isProviding = true;
      await provideRecaptchaToken();
      isProviding = false;
    }
  } catch {
    // Server not running or unreachable — ignore
  }
}

async function provideRecaptchaToken() {
  // Find a labs.google tab
  const tabs = await chrome.tabs.query({ url: 'https://labs.google/*' });

  if (tabs.length === 0) {
    await sendTokenResult({
      error: 'No labs.google tab found. Please open https://labs.google/fx/tools/flow in Chrome.',
    });
    return;
  }

  const tab = tabs[0];

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (siteKey) => {
        try {
          if (typeof grecaptcha === 'undefined' || !grecaptcha.enterprise) {
            return { error: 'reCAPTCHA not loaded. Make sure you are on labs.google/fx/tools/flow.' };
          }
          const token = await grecaptcha.enterprise.execute(siteKey, { action: 'IMAGE_GENERATION' });
          return { token };
        } catch (e) {
          return { error: e.message };
        }
      },
      args: [RECAPTCHA_SITE_KEY],
    });

    await sendTokenResult(results?.[0]?.result ?? { error: 'No result from tab' });
  } catch (e) {
    await sendTokenResult({ error: e.message });
  }
}

async function sendTokenResult(result) {
  try {
    await fetch(`${PROXY_URL}/recaptcha-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });
  } catch {
    // Server disappeared — ignore
  }
}

setInterval(pollForRecaptchaNeeds, POLL_INTERVAL);
