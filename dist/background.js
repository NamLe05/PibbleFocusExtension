/* global chrome */
"use strict";
(() => {
  const TAG = '[Background]';
  console.log(TAG, 'service worker initialized at', new Date().toISOString());

  // Keep alive mechanism
  let keepAliveInterval;
  function setupKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(() => {
      console.log(TAG, 'keepAlive ping', new Date().toISOString());
    }, 20000);
  }
  setupKeepAlive();

  async function ensureOffscreen() {
    const hasOffscreen = typeof chrome.offscreen !== 'undefined';
    if (!hasOffscreen) {
      console.warn(TAG, 'offscreen API not available');
      return false;
    }

    try {
      const existing = await chrome.offscreen.hasDocument();
      if (existing) {
        console.debug(TAG, 'offscreen document already exists');
        return true;
      }

      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['CLIPBOARD'],
        justification: 'Write AI-processed text to clipboard reliably'
      });
      console.log(TAG, '✅ Offscreen document created');
      return true;
    } catch (e) {
      console.error(TAG, '❌ Offscreen create failed:', e);
      return false;
    }
  }

  async function writeClipboardViaOffscreen(text) {
    const ok = await ensureOffscreen();
    if (!ok) {
      console.warn(TAG, 'Cannot use offscreen, falling back');
      return { ok: false, error: 'offscreen unavailable' };
    }

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'OFFSCREEN_WRITE_CLIPBOARD', text },
        (resp) => {
          if (chrome.runtime.lastError) {
            console.error(TAG, 'Offscreen message error:', chrome.runtime.lastError.message);
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(resp || { ok: false, error: 'no response' });
        }
      );
    });
  }

  async function getAllFrames(tabId) {
    return new Promise((resolve) =>
      chrome.webNavigation.getAllFrames({ tabId }, (frames) => {
        console.log(TAG, 'getAllFrames callback, frames:', frames?.length || 0);
        resolve(frames || []);
      })
    );
  }

  async function sendToFrame(tabId, frameId, message) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, { frameId }, (response) => {
        if (chrome.runtime.lastError) {
          console.debug(TAG, `Frame ${frameId} error:`, chrome.runtime.lastError.message);
          resolve(null);
          return;
        }
        console.log(TAG, `Frame ${frameId} response:`, response);
        resolve(response || null);
      });
    });
  }

  // CRITICAL: Listen to messages
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log(TAG, '📨 ===== MESSAGE RECEIVED =====');
    console.log(TAG, 'Type:', msg?.type);
    console.log(TAG, 'From tab:', sender.tab?.id, 'frame:', sender.frameId);
    console.log(TAG, 'Full message:', JSON.stringify(msg));
    console.log(TAG, '==============================');

    if (!msg || !msg.type) {
      console.warn(TAG, '⚠️ Invalid message format');
      return false;
    }

    if (msg.type === 'PING_BG') {
      console.log(TAG, '🏓 PING received, responding...');
      sendResponse({ ok: true, ts: Date.now() });
      return false;
    }

    if (msg.type === "GET_SELECTION") {
      console.log(TAG, '🔍 ===== GET_SELECTION HANDLER =====');
      const tabId = sender.tab?.id;

      if (!tabId) {
        console.error(TAG, '❌ GET_SELECTION: no tabId');
        sendResponse({ ok: false, error: 'No tabId' });
        return false;
      }

      console.log(TAG, 'Starting async selection retrieval for tab:', tabId);

      (async () => {
        try {
          console.log(TAG, 'Step 1: Getting all frames...');
          const frames = await getAllFrames(tabId);
          console.log(TAG, `Step 2: Found ${frames.length} frames`);

          // Try window.getSelection() first
          for (let i = 0; i < frames.length; i++) {
            const f = frames[i];
            console.log(TAG, `Step 3.${i}: Checking frame ${f.frameId} for selection...`);

            const resp = await sendToFrame(tabId, f.frameId, { type: 'FRAME_GET_SELECTION' });

            if (resp?.text && resp.text.trim()) {
              console.log(TAG, `✅ SUCCESS! Selection found in frame ${f.frameId}`);
              console.log(TAG, `Length: ${resp.text.length}, Preview: ${resp.text.slice(0, 100)}`);
              sendResponse({ ok: true, text: resp.text.trim(), frameId: f.frameId });
              return;
            } else {
              console.log(TAG, `Frame ${f.frameId}: no selection (${resp?.text?.length || 0} chars)`);
            }
          }

          // Fallback: copy to clipboard
          console.log(TAG, 'Step 4: No direct selection, trying clipboard fallback...');
          for (let i = 0; i < frames.length; i++) {
            const f = frames[i];
            console.log(TAG, `Step 4.${i}: Trying clipboard copy in frame ${f.frameId}...`);

            const resp = await sendToFrame(tabId, f.frameId, { type: 'FRAME_COPY_SELECTION' });

            if (resp?.text && resp.text.trim()) {
              console.log(TAG, `✅ SUCCESS! Clipboard selection from frame ${f.frameId}`);
              console.log(TAG, `Length: ${resp.text.length}`);
              sendResponse({ ok: true, text: resp.text.trim(), frameId: f.frameId });
              return;
            }
          }

          console.error(TAG, '❌ FAILED: No selection found in any frame');
          sendResponse({ ok: false, text: '' });
        } catch (e) {
          console.error(TAG, '❌ ERROR in GET_SELECTION:', e);
          sendResponse({ ok: false, error: String(e) });
        }
      })();

      console.log(TAG, 'GET_SELECTION: returning true to keep channel open');
      return true; // Keep channel open for async
    }

    if (msg.type === "AI_ACTION") {
      console.log(TAG, '🤖 AI_ACTION received');
      const tabId = sender.tab?.id;
      const frameId = sender.frameId;
      const text = (msg.text || '').trim();
      const mode = msg.mode;

      console.log(TAG, `Mode: ${mode}, text length: ${text.length}, tab: ${tabId}, frame: ${frameId}`);

      if (!tabId || !text) {
        sendResponse({ success: false, error: 'Missing tabId or text' });
        return false;
      }

      const messageType = mode === 'proofread' ? 'AI_PROOFREAD' : 'AI_REWRITE';
      console.log(TAG, `Forwarding to content script: ${messageType}`);

      chrome.tabs.sendMessage(
        tabId,
        { type: messageType, text: text },
        frameId != null ? { frameId } : undefined,
        () => {
          if (chrome.runtime.lastError) {
            console.error(TAG, 'Send message error:', chrome.runtime.lastError.message);
          } else {
            console.log(TAG, 'Message forwarded successfully');
          }
        }
      );

      sendResponse({ success: true });
      return false;
    }

    if (msg.type === 'WRITE_CLIPBOARD') {
      console.log(TAG, '📋 WRITE_CLIPBOARD received, length:', (msg.text || '').length);

      (async () => {
        const result = await writeClipboardViaOffscreen(msg.text);
        console.log(TAG, 'Clipboard result:', result.ok ? '✅ SUCCESS' : '❌ FAILED');
        sendResponse(result);
      })();

      return true;
    }

    if (msg.type === "TOGGLE_PET_OVERLAY") {
      console.log(TAG, '🐾 TOGGLE_PET_OVERLAY received');
      chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
        if (!tab?.id) {
          sendResponse({ ok: false, error: "No active tab" });
          return;
        }
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content/petOverlay.js"]
          });
          console.log(TAG, 'Injected petOverlay.js into tab', tab.id);
          sendResponse({ ok: true });
        } catch (e) {
          console.error(TAG, 'Inject failed:', e);
          sendResponse({ ok: false, error: String(e) });
        }
      });
      return true;
    }

    console.warn(TAG, '⚠️ Unknown message type:', msg.type);
    return false;
  });

  console.log(TAG, '✅ Message listener registered successfully');
})();
