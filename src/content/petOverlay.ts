/* global chrome */
(() => {
    const TAG = '[PetOverlay]';
    const HOST_ID = 'pibble-pet-overlay';
    const POS_KEY = 'pibble-pet-overlay-pos';

    // Toggle: if already injected, remove and exit
    const existing = document.getElementById(HOST_ID);
    if (existing) {
        console.debug(TAG, 'removed');
        existing.remove();
        return;
    }

    // Host element
    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = `
    position: fixed; right: 20px; bottom: 20px; width: 120px; height: 120px;
    z-index: 2147483647; pointer-events: auto; background: transparent;
  `;

    // Restore last position if saved
    try {
        const saved = localStorage.getItem(POS_KEY);
        if (saved) {
            const { x, y } = JSON.parse(saved) as { x: number; y: number };
            host.style.left = `${x}px`;
            host.style.top = `${y}px`;
            host.style.right = 'auto';
            host.style.bottom = 'auto';
        }
    } catch { }

    const shadow = host.attachShadow({ mode: 'open' });

    // Styles (scoped to shadow)
    const style = document.createElement('style')
    style.textContent = `
    :host { all: initial; }
    .wrap { position: relative; width: 100%; height: 100%; }
    .pet {
      position: absolute; inset: auto 0 0 0; margin: auto; width: 100%; height: auto;
      cursor: grab; user-select: none; -webkit-user-drag: none;
      filter: drop-shadow(0 8px 18px rgba(0,0,0,0.25));
      transition: transform .12s ease;
      touch-action: none;
      transform-origin: bottom center;              /* match petStyles */
      animation: rockingMotion 3s ease-in-out infinite; /* rock back/forth */
    }
    .pet:active { transform: translateY(1px) scale(0.99); cursor: grabbing; }

    /* Same keyframes as petStyles.css */
    @keyframes rockingMotion {
      0%   { transform: rotate(-2deg); }
      50%  { transform: rotate(2deg); }
      100% { transform: rotate(-2deg); }
    }

    @media (prefers-reduced-motion: reduce) {
      .pet { animation: none; }
    }

    .bubble {
      position: absolute;
      bottom: 110%;
      left: 50%;
      transform: translateX(-50%);
      min-width: 220px;
      max-width: 280px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 14px 36px rgba(0,0,0,0.22);
      padding: 10px;
      display: none;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      color: #2c3e50;
    }
    .bubble[data-open="true"] { display: block; }
    .bubble::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-top-color: #ffffff;
    }
    .row { display: flex; gap: 8px; }
    .btn {
      flex: 1 1 0;
      padding: 8px 10px;
      border-radius: 8px;
      border: none;
      background: #4A90E2;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
    }
    .btn:hover { background: #357ABD; }
    .title { font-weight: 700; font-size: 13px; margin: 0 0 8px 0; }
    .close {
      position: absolute; top: 6px; right: 8px; border: none; background: transparent;
      font-size: 16px; cursor: pointer; color: #999;
    }
  `
    shadow.appendChild(style);

    // Structure
    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    shadow.appendChild(wrap);

    // Pet image
    const img = document.createElement('img');
    img.className = 'pet';
    img.alt = 'Pibble';
    img.src = chrome.runtime.getURL('assets/pibble_neutral.png'); // ensure assets/* in web_accessible_resources
    wrap.appendChild(img);

    // Popup bubble
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = `
    <button class="close" title="Close">×</button>
    <div class="title">Need help with text?</div>
    <div class="row">
      <button class="btn" id="proof">Proofread</button>
      <button class="btn" id="rewrite">Rewrite</button>
    </div>
    <div style="margin-top:6px; font-size:12px; opacity:.8;">
      Select text on the page first. If direct replace fails, the result is copied to clipboard.
    </div>
  `;
    wrap.appendChild(bubble);

    // Messaging
    type Mode = 'proofread' | 'rewrite';
    const send = (mode: Mode) => chrome.runtime.sendMessage({ type: 'AI_ACTION', mode });

    (bubble.querySelector('#proof') as HTMLButtonElement | null)?.addEventListener('click', (e) => {
        e.stopPropagation();
        send('proofread');
    });
    (bubble.querySelector('#rewrite') as HTMLButtonElement | null)?.addEventListener('click', (e) => {
        e.stopPropagation();
        send('rewrite');
    });
    (bubble.querySelector('.close') as HTMLButtonElement | null)?.addEventListener('click', (e) => {
        e.stopPropagation();
        bubble.setAttribute('data-open', 'false');
    });

    // Drag vs click handling
    let pointerDown = false;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let offX = 0;
    let offY = 0;
    const DRAG_THRESHOLD = 3; // px

    const clamp = (x: number, y: number) => {
        const maxX = Math.max(0, window.innerWidth - host.offsetWidth);
        const maxY = Math.max(0, window.innerHeight - host.offsetHeight);
        return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
    };

    img.addEventListener('pointerdown', (e: PointerEvent) => {
        pointerDown = true;
        dragging = false;
        startX = e.clientX;
        startY = e.clientY;
        img.setPointerCapture?.(e.pointerId);
        const rect = host.getBoundingClientRect();
        offX = startX - rect.left;
        offY = startY - rect.top;
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
        if (!pointerDown) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) dragging = true;
        if (!dragging) return;

        let x = e.clientX - offX;
        let y = e.clientY - offY;
        const next = clamp(x, y);
        host.style.left = `${next.x}px`;
        host.style.top = `${next.y}px`;
        host.style.right = 'auto';
        host.style.bottom = 'auto';
    });

    window.addEventListener('pointerup', () => {
        if (!pointerDown) return;
        pointerDown = false;

        if (dragging) {
            // Save position after drag
            dragging = false;
            try {
                const rect = host.getBoundingClientRect();
                localStorage.setItem(POS_KEY, JSON.stringify({ x: rect.left, y: rect.top }));
            } catch { }
        } else {
            // Treat as click: toggle popup
            const open = bubble.getAttribute('data-open') === 'true';
            bubble.setAttribute('data-open', open ? 'false' : 'true');
        }
    });

    document.documentElement.appendChild(host);
    console.debug(TAG, 'injected on', location.href);
})();

