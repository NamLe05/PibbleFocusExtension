/* global chrome */
// MV3 background service worker (no Prompt API here; use window.ai in page contexts)
console.log('background service worker loaded');
export { };

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'PING_BG') {
    sendResponse({ ok: true, ts: Date.now() });
    return; // sync response
  }

  if (msg?.type === 'TOGGLE_PET_OVERLAY') {
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (!tab?.id) return sendResponse({ ok: false, error: 'No active tab' });
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/petOverlay.js'] // must exist in public/
        });
        console.log('[BG] injected petOverlay.js into tab', tab.id);
        sendResponse({ ok: true });
      } catch (e) {
        console.error('[BG] inject failed', e);
        sendResponse({ ok: false, error: String(e) });
      }
    });
    return true; // keep port open
  }

  if (msg?.type === 'AI_ACTION') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: msg.mode === 'rewrite' ? 'AI_REWRITE' : 'AI_PROOFREAD'
        });
      }
      sendResponse({ ok: true });
    });
    return true;
  }
});