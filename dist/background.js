"use strict";
(() => {
  // src/background.ts
  console.log("background service worker loaded");
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "PING_BG") {
      sendResponse({ ok: true, ts: Date.now() });
      return;
    }
    if (msg?.type === "TOGGLE_PET_OVERLAY") {
      chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
        if (!tab?.id) return sendResponse({ ok: false, error: "No active tab" });
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content/petOverlay.js"]
            // must exist in public/
          });
          console.log("[BG] injected petOverlay.js into tab", tab.id);
          sendResponse({ ok: true });
        } catch (e) {
          console.error("[BG] inject failed", e);
          sendResponse({ ok: false, error: String(e) });
        }
      });
      return true;
    }
    if (msg?.type === "AI_ACTION") {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: msg.mode === "rewrite" ? "AI_REWRITE" : "AI_PROOFREAD"
          });
        }
        sendResponse({ ok: true });
      });
      return true;
    }
  });
})();
