"use strict";
(() => {
  // src/content/contentScript.ts
  (function() {
    let bridgeReady = false;
    function ensureBridgeInjected() {
      if (window.__pibbleBridgeInjected) return;
      const s = document.createElement("script");
      s.src = chrome.runtime.getURL("injected/pageBridge.js");
      s.onload = () => {
        s.remove();
        setTimeout(() => {
          bridgeReady = true;
        }, 500);
      };
      s.onerror = () => {
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
        const resolver = pending.get(data.requestId);
        if (resolver) {
          resolver({ text: data.text, error: data.error });
          pending.delete(data.requestId);
        }
      }
    });
    function bridgePrompt(text, mode) {
      const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error("AI timeout"));
        }, 6e4);
        pending.set(requestId, (resp) => {
          clearTimeout(timeout);
          if (resp.error) {
            reject(new Error(resp.error));
          } else {
            resolve(String(resp.text ?? ""));
          }
        });
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
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          return text.trim();
        }
      } catch (e) {
      }
      return "";
    }
    function extractPageText() {
      const main = document.querySelector('main, article, [role="main"]');
      const target = main || document.body;
      const text = target.innerText || target.textContent || "";
      return text.trim();
    }
    async function handleAIAction(mode) {
      try {
        if (!bridgeReady) {
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
        let selectedText = "";
        if (mode === "summarize") {
          selectedText = extractPageText();
          if (!selectedText) {
            throw new Error("No text found on page");
          }
        } else {
          selectedText = await getSelectionText();
          if (!selectedText) {
            window.postMessage({ type: "PIBBLE_STATUS", message: "\u26A0\uFE0F Please copy text first" }, "*");
            return;
          }
        }
        const statusMsg = mode === "proofread" ? "Proofreading" : mode === "rewrite" ? "Rewriting" : "Summarizing page";
        window.postMessage({ type: "PIBBLE_STATUS", message: `\u2699\uFE0F ${statusMsg}...` }, "*");
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "PIBBLE_STATUS", message: `\u2699\uFE0F ${statusMsg}...` }, "*");
        }
        const result = await bridgePrompt(selectedText, mode);
        window.postMessage({ type: "PIBBLE_RESULT", text: result, mode }, "*");
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "PIBBLE_RESULT", text: result, mode }, "*");
        }
        window.postMessage({ type: "PIBBLE_STATUS", message: "\u2705 Done! Click copy to use result" }, "*");
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "PIBBLE_STATUS", message: "\u2705 Done! Click copy to use result" }, "*");
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        window.postMessage({ type: "PIBBLE_STATUS", message: `\u274C ${errorMsg}` }, "*");
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "PIBBLE_STATUS", message: `\u274C ${errorMsg}` }, "*");
        }
      }
    }
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "PIBBLE_ACTION") {
        const mode = data.mode;
        if (mode === "proofread" || mode === "rewrite" || mode === "summarize") {
          handleAIAction(mode);
        }
      }
    });
  })();
})();
