(()=>{const y="pibble-pet-overlay",w="pibble-pet-overlay-pos",v=document.getElementById(y);if(v){v.remove();return}const n=document.createElement("div");n.id=y,n.style.cssText="position:fixed;right:20px;bottom:20px;width:120px;height:120px;z-index:2147483647;pointer-events:auto;background:transparent;";try{const t=localStorage.getItem(w);if(t){const{x:e,y:o}=JSON.parse(t);n.style.left=`${e}px`,n.style.top=`${o}px`,n.style.right="auto",n.style.bottom="auto"}}catch{}const k=n.attachShadow({mode:"open"}),C=document.createElement("style");C.textContent=`
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
    .title::before{content:'✨';font-size:18px}
    .close{border:none;background:rgba(255,255,255,0.15);width:28px;height:28px;border-radius:50%;font-size:18px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;transition:all .2s;padding:0}
    .close:hover{background:rgba(255,255,255,0.25);transform:rotate(90deg)}
    .bubble-body{padding:20px}
    .hint{font-size:12px;opacity:0.85;line-height:1.4;background:rgba(255,255,255,0.1);padding:10px 12px;border-radius:8px;text-align:center;margin-bottom:16px}
    .summarize-btn{width:100%;padding:12px 16px;border-radius:12px;border:none;background:rgba(255,255,255,0.95);color:#667eea;cursor:pointer;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s;box-shadow:0 4px 12px rgba(0,0,0,0.1);margin-bottom:12px}
    .summarize-btn:hover{background:#fff;transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.15)}
    .summarize-btn:active{transform:translateY(0)}
    .summarize-btn.loading{pointer-events:none;opacity:0.7}
    .summarize-icon{font-size:18px}
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
    .action-btn.loading .action-icon,.summarize-btn.loading .summarize-icon{animation:spin 1s linear infinite}
  `,k.appendChild(C);const l=document.createElement("div");l.className="wrap",k.appendChild(l);const s=document.createElement("img");s.className="pet",s.alt="Pibble",s.src=chrome.runtime.getURL("assets/pibble_neutral.png"),l.appendChild(s);const a=document.createElement("div");a.className="bubble",a.innerHTML=`
    <div class="bubble-header">
      <div class="title">AI Writing Assistant</div>
      <button class="close" title="Close">×</button>
    </div>
    <div class="bubble-body">
      <div class="hint">Copy text or click Summarize for page summary</div>
      <button class="summarize-btn" data-mode="summarize">
        <span class="summarize-icon">📄</span>
        <span>Summarize Page</span>
      </button>
      <div class="action-grid">
        <button class="action-btn" data-mode="proofread">
          <span class="action-icon">📝</span>
          <span>Proofread</span>
        </button>
        <button class="action-btn" data-mode="rewrite">
          <span class="action-icon">✍️</span>
          <span>Rewrite</span>
        </button>
      </div>
      <div class="result-container">
        <div class="result-header">
          <div class="result-title">Result</div>
          <button class="copy-btn">
            <span>📋</span>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        <div class="result-content"></div>
      </div>
    </div>
    <div class="status"></div>
  `,l.appendChild(a);const b=a.querySelector(".status"),T=a.querySelector(".close"),z=a.querySelector(".result-container"),B=a.querySelector(".result-content"),P=a.querySelector(".result-title"),S=a.querySelector(".copy-btn"),m=S.querySelector(".copy-text"),c=a.querySelector(".summarize-btn");let d="";function g(t,e=2e3){b.textContent=t,b.classList.add("show"),setTimeout(()=>b.classList.remove("show"),e)}function R(t,e){d=t,B.textContent=t;const o={proofread:"Proofread Result",rewrite:"Rewrite Result",summarize:"Page Summary"};P.textContent=o[e]||"Result",z.classList.add("show"),m.textContent="Copy"}function p(){z.classList.remove("show"),d=""}window.addEventListener("message",t=>{var e,o;if(t.source===window){if(((e=t.data)==null?void 0:e.type)==="PIBBLE_STATUS"){const r=t.data.message;(r.startsWith("⚠️")||r.startsWith("❌"))&&p(),g(r,3e3)}if(((o=t.data)==null?void 0:o.type)==="PIBBLE_RESULT"){const{text:r,mode:h}=t.data;R(r,h)}}}),S.addEventListener("click",async t=>{if(t.stopPropagation(),!!d)try{await navigator.clipboard.writeText(d),m.textContent="✓ Copied!",g("✅ Copied to clipboard!",2e3),setTimeout(()=>{m.textContent="Copy"},2e3)}catch{g("❌ Copy failed",2e3)}}),c.addEventListener("click",t=>{t.stopPropagation(),c.classList.add("loading");const e=c.querySelector(".summarize-icon"),o=e.textContent;e.textContent="⚙️",p(),window.postMessage({type:"PIBBLE_ACTION",mode:"summarize"},"*"),setTimeout(()=>{c.classList.remove("loading"),e.textContent=o},1e3)}),a.querySelectorAll(".action-btn").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const o=t.dataset.mode;t.classList.add("loading");const r=t.querySelector(".action-icon"),h=r.textContent;r.textContent="⚙️",p(),window.postMessage({type:"PIBBLE_ACTION",mode:o},"*"),setTimeout(()=>{t.classList.remove("loading"),r.textContent=h},1e3)})}),T.addEventListener("click",t=>{t.stopPropagation(),a.setAttribute("data-open","false"),p()});let u=!1,i=!1,x=0,f=0,E=0,L=0;const I=5,q=(t,e)=>{const o=Math.max(0,window.innerWidth-n.offsetWidth),r=Math.max(0,window.innerHeight-n.offsetHeight);return{x:Math.min(Math.max(0,t),o),y:Math.min(Math.max(0,e),r)}};s.addEventListener("pointerdown",t=>{var o;u=!0,i=!1,x=t.clientX,f=t.clientY,(o=s.setPointerCapture)==null||o.call(s,t.pointerId);const e=n.getBoundingClientRect();E=x-e.left,L=f-e.top}),window.addEventListener("pointermove",t=>{if(!u)return;const e=t.clientX-x,o=t.clientY-f;if(!i&&Math.hypot(e,o)>I&&(i=!0),!i)return;const r=q(t.clientX-E,t.clientY-L);n.style.left=`${r.x}px`,n.style.top=`${r.y}px`,n.style.right="auto",n.style.bottom="auto"}),window.addEventListener("pointerup",()=>{if(u)if(u=!1,i){i=!1;try{const t=n.getBoundingClientRect();localStorage.setItem(w,JSON.stringify({x:t.left,y:t.top}))}catch{}}else{const t=a.getAttribute("data-open")==="true";a.setAttribute("data-open",t?"false":"true")}}),document.documentElement.appendChild(n)})();
