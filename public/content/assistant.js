"use strict";
(() => {
  // src/content/contentScript.ts
  (function() {
    const TAG = "[PibbleContent]";
    console.debug(TAG, "loaded on", location.href);
    function ensureBridgeInjected() {
      if (window.__pibbleBridgeInjected) return;
      const s = document.createElement("script");
      s.src = chrome.runtime.getURL("injected/pageBridge.js");
      s.onload = () => s.remove();
      window.__pibbleBridgeInjected = true;
      document.documentElement.appendChild(s);
    }
    const pending = /* @__PURE__ */ new Map();
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "PBRIDGE_RESPONSE" || data.type === "PBRIDGE_PONG") {
        const resolver = pending.get(data.requestId);
        if (resolver) {
          console.debug(TAG, "received", data.type, data.info ?? "");
          resolver({ text: data.text, error: data.error, info: data.info });
          pending.delete(data.requestId);
        }
      }
    });
    function bridgePrompt(userText) {
      ensureBridgeInjected();
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error("Timed out"));
        }, 3e4);
        pending.set(requestId, (resp) => {
          clearTimeout(timeout);
          if (resp?.error) reject(new Error(resp.error));
          else resolve(String(resp?.text ?? ""));
        });
        window.postMessage(
          { type: "PBRIDGE_REQUEST", requestId, payload: { userText } },
          "*"
        );
      });
    }
    function getSelectionInfo() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return { text: "" };
      return { text: sel.toString(), range: sel.getRangeAt(0) };
    }
    function buildPrompt(mode, src) {
      return mode === "proofread" ? `Proofread the following text. Fix grammar, spelling, and clarity. Keep meaning and tone. Return only the corrected text.

---
${src}` : `Rewrite the following text to be clearer and more concise while preserving meaning and voice. Return only the rewritten text.

---
${src}`;
    }
    async function replaceSelection(range, newText) {
      const editableRoot = range.commonAncestorContainer instanceof Element ? range.commonAncestorContainer.closest?.('[contenteditable="true"]') : null;
      if (editableRoot) {
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));
        return true;
      }
      const active = document.activeElement;
      if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT" && active.type === "text")) {
        const start = active.selectionStart ?? 0;
        const end = active.selectionEnd ?? start;
        const value = active.value;
        active.value = value.slice(0, start) + newText + value.slice(end);
        active.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
      return false;
    }
    async function handle(mode) {
      try {
        const { text, range } = getSelectionInfo();
        if (!text.trim()) return;
        const answer = await bridgePrompt(buildPrompt(mode, text));
        const ok = range ? await replaceSelection(range, answer) : false;
        if (!ok) await navigator.clipboard.writeText(answer);
      } catch (e) {
        console.warn("[PibbleAssistant]", e);
      }
    }
    function postWithReply(type, payload, sendResponse) {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      pending.set(requestId, sendResponse);
      console.debug(TAG, "forwarding", type, "requestId=", requestId);
      window.postMessage({ type, requestId, payload }, "*");
    }
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === "PROMPT_TEXT") {
        postWithReply("PBRIDGE_REQUEST", {
          userText: msg.userText,
          systemPrompt: msg.systemPrompt ?? null,
          temperature: msg.temperature ?? 0.7
        }, sendResponse);
        return true;
      }
      if (msg?.type === "BRIDGE_PING") {
        postWithReply("PBRIDGE_PING", {}, sendResponse);
        return true;
      }
      if (msg?.type === "AI_PROOFREAD") handle("proofread");
      if (msg?.type === "AI_REWRITE") handle("rewrite");
    });
  })();
})();
