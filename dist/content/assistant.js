"use strict";
(() => {
  // src/content/contentScript.ts
  (function() {
    const TAG = "[PibbleContent]";
    const isTopFrame = window === window.top;
    console.log("\u{1F7E2} \u{1F7E2} \u{1F7E2} CONTENT SCRIPT LOADING \u{1F7E2} \u{1F7E2} \u{1F7E2}");
    console.log(TAG, "Script file executed!");
    console.log(TAG, "URL:", location.href);
    console.log(TAG, "Frame type:", isTopFrame ? "TOP FRAME" : "IFRAME");
    console.log(TAG, "Timestamp:", (/* @__PURE__ */ new Date()).toISOString());
    let bridgeReady = false;
    function ensureBridgeInjected() {
      if (window.__pibbleBridgeInjected) return;
      console.log(TAG, "Injecting page bridge script...");
      const s = document.createElement("script");
      s.src = chrome.runtime.getURL("injected/pageBridge.js");
      s.onload = () => {
        console.log(TAG, "\u2705 Page bridge script loaded");
        s.remove();
        setTimeout(() => {
          bridgeReady = true;
          console.log(TAG, "\u2705 Bridge ready for requests");
        }, 500);
      };
      s.onerror = () => {
        console.error(TAG, "\u274C Failed to load page bridge script");
      };
      window.__pibbleBridgeInjected = true;
      document.documentElement.appendChild(s);
    }
    ensureBridgeInjected();
    const pending = /* @__PURE__ */ new Map();
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "PBRIDGE_RESPONSE" && data.requestId) {
        console.log(TAG, "Received PBRIDGE_RESPONSE for", data.requestId);
        const resolver = pending.get(data.requestId);
        if (resolver) {
          resolver({ text: data.text, error: data.error });
          pending.delete(data.requestId);
        }
      }
    });
    function bridgePrompt(text, mode) {
      console.log(TAG, `bridgePrompt() called for ${mode}`);
      const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      console.log(TAG, `\u{1F916} Sending to AI, requestId: ${requestId}`);
      console.log(TAG, `\u{1F4DD} Mode: ${mode}, text length: ${text.length} chars`);
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(requestId);
          console.error(TAG, `\u274C AI timeout for requestId: ${requestId}`);
          reject(new Error("AI timeout"));
        }, 3e4);
        pending.set(requestId, (resp) => {
          clearTimeout(timeout);
          if (resp.error) {
            console.error(TAG, `\u274C AI error: ${resp.error}`);
            reject(new Error(resp.error));
          } else {
            console.log(TAG, `\u2705 AI response received for requestId: ${requestId}`);
            resolve(String(resp.text ?? ""));
          }
        });
        console.log(TAG, "Posting PBRIDGE_REQUEST to window");
        window.postMessage({
          type: "PBRIDGE_REQUEST",
          requestId,
          payload: {
            userText: text,
            mode
          }
        }, "*");
      });
    }
    async function getSelectionText() {
      console.log(TAG, "\u{1F50D} Getting text from clipboard...");
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          console.log(TAG, `\u2705 Got ${text.length} chars from clipboard`);
          console.log(TAG, `Preview: ${text.slice(0, 100)}...`);
          return text.trim();
        }
      } catch (e) {
        console.error(TAG, "\u274C Clipboard read failed:", e);
      }
      console.log(TAG, "\u274C No text in clipboard");
      return "";
    }
    async function handleAIAction(mode) {
      console.log(TAG, `
${"\u2550".repeat(80)}`);
      console.log(TAG, `\u{1F3AF} \u{1F3AF} \u{1F3AF} ${mode.toUpperCase()} ACTION TRIGGERED \u{1F3AF} \u{1F3AF} \u{1F3AF}`);
      console.log(TAG, `${"\u2550".repeat(80)}`);
      try {
        if (!bridgeReady) {
          console.warn(TAG, "\u26A0\uFE0F Bridge not ready yet, waiting...");
          window.postMessage({ type: "PIBBLE_STATUS", message: "\u23F3 Initializing AI..." }, "*");
          let attempts = 0;
          while (!bridgeReady && attempts < 20) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }
          if (!bridgeReady) {
            throw new Error("AI initialization timeout");
          }
        }
        const selectedText = await getSelectionText();
        if (!selectedText) {
          console.error(TAG, "\u274C \u274C \u274C NO TEXT IN CLIPBOARD!");
          console.log(TAG, "Please copy some text (Cmd+C / Ctrl+C) and try again.");
          window.postMessage({ type: "PIBBLE_STATUS", message: "\u26A0\uFE0F Please copy text first" }, "*");
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: "PIBBLE_STATUS", message: "\u26A0\uFE0F Please copy text first" }, "*");
          }
          return;
        }
        console.log(TAG, `\u2705 Got text: ${selectedText.length} characters`);
        const preview = selectedText.slice(0, 300) + (selectedText.length > 300 ? "..." : "");
        console.log(TAG, `\u{1F4C4} Text: ${preview}`);
        window.postMessage({ type: "PIBBLE_STATUS", message: `\u2699\uFE0F ${mode === "proofread" ? "Proofreading" : "Rewriting"}...` }, "*");
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "PIBBLE_STATUS", message: `\u2699\uFE0F ${mode === "proofread" ? "Proofreading" : "Rewriting"}...` }, "*");
        }
        console.log(TAG, `\u{1F916} Calling ${mode} API...`);
        const result = await bridgePrompt(selectedText, mode);
        console.log(TAG, `
${"\u2500".repeat(80)}`);
        console.log(TAG, `\u2728 \u2728 \u2728 ${mode.toUpperCase()} RESULT \u2728 \u2728 \u2728`);
        console.log(TAG, `Result length: ${result.length} characters`);
        console.log(TAG, `${"\u2500".repeat(80)}`);
        console.log(TAG, result);
        console.log(TAG, `${"\u2500".repeat(80)}
`);
        window.postMessage({ type: "PIBBLE_RESULT", text: result, mode }, "*");
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "PIBBLE_RESULT", text: result, mode }, "*");
        }
        window.postMessage({ type: "PIBBLE_STATUS", message: "\u2705 Done! Click copy to use result" }, "*");
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "PIBBLE_STATUS", message: "\u2705 Done! Click copy to use result" }, "*");
        }
      } catch (e) {
        console.error(TAG, "\u274C \u274C \u274C ERROR during AI action:", e);
        const errorMsg = e instanceof Error ? e.message : String(e);
        window.postMessage({ type: "PIBBLE_STATUS", message: `\u274C ${errorMsg}` }, "*");
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "PIBBLE_STATUS", message: `\u274C ${errorMsg}` }, "*");
        }
      } finally {
        console.log(TAG, `${"\u2550".repeat(80)}`);
        console.log(TAG, `\u2713 ${mode.toUpperCase()} ACTION COMPLETE`);
        console.log(TAG, `${"\u2550".repeat(80)}

`);
      }
    }
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "PIBBLE_ACTION") {
        const mode = data.mode;
        console.log(TAG, `\u{1F4E8} \u{1F4E8} \u{1F4E8} Received PIBBLE_ACTION message, mode: ${mode}`);
        if (mode === "proofread" || mode === "rewrite") {
          handleAIAction(mode);
        } else {
          console.warn(TAG, `\u26A0\uFE0F Unknown mode: ${mode}`);
        }
      }
    });
    console.log(TAG, "\u{1F3A7} Message listener registered for PIBBLE_ACTION");
    console.log(TAG, `\u2705 \u2705 \u2705 Content script FULLY READY (frame: ${isTopFrame ? "TOP" : "iframe"})`);
    console.log(TAG, "Waiting for PIBBLE_ACTION messages...");
  })();
})();
