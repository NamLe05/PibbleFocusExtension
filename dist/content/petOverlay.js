"use strict";
(() => {
  // src/content/petOverlay.ts
  (() => {
    const TAG = "[PetOverlay]";
    const HOST_ID = "pibble-pet-overlay";
    const POS_KEY = "pibble-pet-overlay-pos";
    const existing = document.getElementById(HOST_ID);
    if (existing) {
      existing.remove();
      return;
    }
    const host = document.createElement("div");
    host.id = HOST_ID;
    host.style.cssText = `position:fixed;right:20px;bottom:20px;width:120px;height:120px;z-index:2147483647;pointer-events:auto;background:transparent;`;
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        host.style.left = `${x}px`;
        host.style.top = `${y}px`;
        host.style.right = "auto";
        host.style.bottom = "auto";
      }
    } catch {
    }
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
    :host{all:initial}*{box-sizing:border-box}
    .wrap{position:relative;width:100%;height:100%}
    .pet{position:absolute;inset:auto 0 0 0;margin:auto;width:100%;height:auto;cursor:grab;user-select:none;-webkit-user-drag:none;filter:drop-shadow(0 8px 18px rgba(0,0,0,0.25));transition:transform .12s ease;touch-action:none;transform-origin:bottom center;animation:rock 3s ease-in-out infinite}
    .pet:active{transform:translateY(1px) scale(0.99);cursor:grabbing}
    @keyframes rock{0%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}100%{transform:rotate(-2deg)}}
    .bubble{position:absolute;bottom:110%;left:50%;transform:translateX(-50%) scale(0.95);min-width:320px;max-width:420px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px;box-shadow:0 20px 60px rgba(102,126,234,0.4),0 0 0 1px rgba(255,255,255,0.1) inset;padding:0;display:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fff;opacity:0;transition:opacity .2s,transform .2s}
    .bubble[data-open="true"]{display:block;opacity:1;transform:translateX(-50%) scale(1)}
    .bubble::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:10px solid transparent;border-top-color:#764ba2}
    .bubble-header{padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:space-between}
    .title{font-weight:600;font-size:15px;margin:0;display:flex;align-items:center;gap:8px}
    .title::before{content:'\u2728';font-size:18px}
    .close{border:none;background:rgba(255,255,255,0.15);width:28px;height:28px;border-radius:50%;font-size:18px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;transition:all .2s;padding:0}
    .close:hover{background:rgba(255,255,255,0.25);transform:rotate(90deg)}
    .bubble-body{padding:20px}
    .hint{font-size:12px;opacity:0.85;line-height:1.4;background:rgba(255,255,255,0.1);padding:10px 12px;border-radius:8px;text-align:center;margin-bottom:16px}
    .action-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
    .action-btn{padding:14px 16px;border-radius:12px;border:none;background:rgba(255,255,255,0.95);color:#667eea;cursor:pointer;font-size:14px;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:6px;transition:all .2s;box-shadow:0 4px 12px rgba(0,0,0,0.1)}
    .action-btn:hover{background:#fff;transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.15)}
    .action-btn:active{transform:translateY(0)}
    .action-btn.loading{pointer-events:none;opacity:0.7}
    .action-icon{font-size:20px}
    .result-container{display:none;margin-top:16px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)}
    .result-container.show{display:block}
    .result-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(102,126,234,0.1);border-bottom:1px solid rgba(102,126,234,0.1)}
    .result-title{font-size:13px;font-weight:600;color:#667eea;margin:0}
    .copy-btn{border:none;background:rgba(102,126,234,0.1);color:#667eea;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all .2s}
    .copy-btn:hover{background:rgba(102,126,234,0.2)}
    .copy-btn:active{transform:scale(0.95)}
    .result-content{padding:16px;max-height:200px;overflow-y:auto;font-size:13px;line-height:1.6;color:#333;white-space:pre-wrap;word-wrap:break-word}
    .result-content::-webkit-scrollbar{width:6px}
    .result-content::-webkit-scrollbar-track{background:rgba(0,0,0,0.05);border-radius:3px}
    .result-content::-webkit-scrollbar-thumb{background:rgba(102,126,234,0.3);border-radius:3px}
    .result-content::-webkit-scrollbar-thumb:hover{background:rgba(102,126,234,0.5)}
    .status{position:absolute;top:-40px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .2s}
    .status.show{opacity:1}
    @keyframes spin{to{transform:rotate(360deg)}}
    .action-btn.loading .action-icon{animation:spin 1s linear infinite}
  `;
    shadow.appendChild(style);
    const wrap = document.createElement("div");
    wrap.className = "wrap";
    shadow.appendChild(wrap);
    const img = document.createElement("img");
    img.className = "pet";
    img.alt = "Pibble";
    img.src = chrome.runtime.getURL("assets/pibble_neutral.png");
    wrap.appendChild(img);
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = `
    <div class="bubble-header">
      <div class="title">AI Writing Assistant</div>
      <button class="close" title="Close">\xD7</button>
    </div>
    <div class="bubble-body">
      <div class="hint">Copy text, then click an action below</div>
      <div class="action-grid">
        <button class="action-btn" data-mode="proofread">
          <span class="action-icon">\u{1F4DD}</span>
          <span>Proofread</span>
        </button>
        <button class="action-btn" data-mode="rewrite">
          <span class="action-icon">\u270D\uFE0F</span>
          <span>Rewrite</span>
        </button>
      </div>
      <div class="result-container">
        <div class="result-header">
          <div class="result-title">Result</div>
          <button class="copy-btn">
            <span>\u{1F4CB}</span>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        <div class="result-content"></div>
      </div>
    </div>
    <div class="status"></div>
  `;
    wrap.appendChild(bubble);
    const statusEl = bubble.querySelector(".status");
    const closeBtn = bubble.querySelector(".close");
    const resultContainer = bubble.querySelector(".result-container");
    const resultContent = bubble.querySelector(".result-content");
    const resultTitle = bubble.querySelector(".result-title");
    const copyBtn = bubble.querySelector(".copy-btn");
    const copyText = copyBtn.querySelector(".copy-text");
    let currentResult = "";
    function showStatus(msg, ms = 2e3) {
      statusEl.textContent = msg;
      statusEl.classList.add("show");
      setTimeout(() => statusEl.classList.remove("show"), ms);
    }
    function showResult(text, mode) {
      currentResult = text;
      resultContent.textContent = text;
      resultTitle.textContent = mode === "proofread" ? "Proofread Result" : "Rewrite Result";
      resultContainer.classList.add("show");
      copyText.textContent = "Copy";
    }
    function hideResult() {
      resultContainer.classList.remove("show");
      currentResult = "";
    }
    window.addEventListener("message", (e) => {
      if (e.source !== window) return;
      if (e.data?.type === "PIBBLE_STATUS") {
        const msg = e.data.message;
        if (msg.startsWith("\u26A0\uFE0F") || msg.startsWith("\u274C")) {
          hideResult();
        }
        showStatus(msg, 3e3);
      }
      if (e.data?.type === "PIBBLE_RESULT") {
        const { text, mode } = e.data;
        showResult(text, mode);
      }
    });
    copyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!currentResult) return;
      try {
        await navigator.clipboard.writeText(currentResult);
        copyText.textContent = "\u2713 Copied!";
        showStatus("\u2705 Copied to clipboard!", 2e3);
        setTimeout(() => {
          copyText.textContent = "Copy";
        }, 2e3);
      } catch (err) {
        showStatus("\u274C Copy failed", 2e3);
      }
    });
    bubble.querySelectorAll(".action-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const mode = btn.dataset.mode;
        btn.classList.add("loading");
        const icon = btn.querySelector(".action-icon");
        const orig = icon.textContent;
        icon.textContent = "\u2699\uFE0F";
        hideResult();
        window.postMessage({ type: "PIBBLE_ACTION", mode }, "*");
        setTimeout(() => {
          btn.classList.remove("loading");
          icon.textContent = orig;
        }, 1e3);
      });
    });
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      bubble.setAttribute("data-open", "false");
      hideResult();
    });
    let down = false;
    let drag = false;
    let sx = 0;
    let sy = 0;
    let ox = 0;
    let oy = 0;
    const THRESH = 5;
    const clamp = (x, y) => {
      const mx = Math.max(0, window.innerWidth - host.offsetWidth);
      const my = Math.max(0, window.innerHeight - host.offsetHeight);
      return { x: Math.min(Math.max(0, x), mx), y: Math.min(Math.max(0, y), my) };
    };
    img.addEventListener("pointerdown", (e) => {
      down = true;
      drag = false;
      sx = e.clientX;
      sy = e.clientY;
      img.setPointerCapture?.(e.pointerId);
      const r = host.getBoundingClientRect();
      ox = sx - r.left;
      oy = sy - r.top;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!drag && Math.hypot(dx, dy) > THRESH) drag = true;
      if (!drag) return;
      const next = clamp(e.clientX - ox, e.clientY - oy);
      host.style.left = `${next.x}px`;
      host.style.top = `${next.y}px`;
      host.style.right = "auto";
      host.style.bottom = "auto";
    });
    window.addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      if (drag) {
        drag = false;
        try {
          const r = host.getBoundingClientRect();
          localStorage.setItem(POS_KEY, JSON.stringify({ x: r.left, y: r.top }));
        } catch {
        }
      } else {
        const open = bubble.getAttribute("data-open") === "true";
        bubble.setAttribute("data-open", open ? "false" : "true");
      }
    });
    document.documentElement.appendChild(host);
  })();
})();
