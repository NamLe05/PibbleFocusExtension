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
            target: { tabId: tab.id, allFrames: false },
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
      chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
        if (!tab?.id) {
          sendResponse({ ok: false });
          return;
        }
        const actionType = msg.mode === "rewrite" ? "AI_REWRITE" : "AI_PROOFREAD";
        console.log("[BG] relaying", actionType, "to tab", tab.id);
        try {
          const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
          console.log("[BG] found", frames?.length || 0, "frames");
          for (const frame of frames || []) {
            try {
              await chrome.tabs.sendMessage(tab.id, { type: actionType }, { frameId: frame.frameId });
              console.log("[BG] sent to frameId", frame.frameId);
            } catch (e) {
              console.debug("[BG] frame", frame.frameId, "not ready:", e);
            }
          }
          sendResponse({ ok: true });
        } catch (e) {
          console.error("[BG] relay failed", e);
          sendResponse({ ok: false, error: String(e) });
        }
      });
      return true;
    }
    if (msg?.type === "AWARD_COINS") {
      chrome.storage.local.get(["user"], (data) => {
        const user = data.user || { coins: 0 };
        user.coins = (user.coins || 0) + (msg.amount || 0);
        chrome.storage.local.set({ user }, () => {
          sendResponse({ ok: true });
        });
      });
      return true;
    }
  });
})();
