/* global chrome */
(function () {
    let bridgeReady = false;

    function ensureBridgeInjected() {
        if ((window as any).__pibbleBridgeInjected) return;
        const s = document.createElement('script');
        s.src = chrome.runtime.getURL('injected/pageBridge.js');
        s.onload = () => {
            s.remove();
            setTimeout(() => {
                bridgeReady = true;
            }, 500);
        };
        s.onerror = () => { };
        (window as any).__pibbleBridgeInjected = true;
        document.documentElement.appendChild(s);
    }

    ensureBridgeInjected();

    const pending = new Map<string, (resp: { text?: string; error?: string }) => void>();

    window.addEventListener('message', (event: MessageEvent) => {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'PBRIDGE_RESPONSE' && data.requestId) {
            const resolver = pending.get(data.requestId);
            if (resolver) {
                resolver({ text: data.text, error: data.error });
                pending.delete(data.requestId);
            }
        }
    });

    function bridgePrompt(text: string, mode: 'proofread' | 'rewrite' | 'summarize'): Promise<string> {
        const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                pending.delete(requestId);
                reject(new Error('AI timeout'));
            }, 60000);

            pending.set(requestId, (resp) => {
                clearTimeout(timeout);
                if (resp.error) {
                    reject(new Error(resp.error));
                } else {
                    resolve(String(resp.text ?? ''));
                }
            });

            window.postMessage({
                type: 'PBRIDGE_REQUEST',
                requestId,
                payload: {
                    userText: text,
                    mode: mode
                }
            }, '*');
        });
    }

    async function getSelectionText(): Promise<string> {
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim()) {
                return text.trim();
            }
        } catch (e) { }
        return '';
    }

    function extractPageText(): string {
        const main = document.querySelector('main, article, [role="main"]');
        const target = (main || document.body) as HTMLElement;
        const text = target.innerText || target.textContent || '';
        return text.trim();
    }

    async function handleAIAction(mode: 'proofread' | 'rewrite' | 'summarize') {
        try {
            if (!bridgeReady) {
                window.postMessage({ type: 'PIBBLE_STATUS', message: '⏳ Initializing AI...' }, '*');

                let attempts = 0;
                while (!bridgeReady && attempts < 20) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                if (!bridgeReady) {
                    throw new Error('AI initialization timeout');
                }
            }

            let selectedText = '';

            if (mode === 'summarize') {
                selectedText = extractPageText();

                if (!selectedText) {
                    throw new Error('No text found on page');
                }
            } else {
                selectedText = await getSelectionText();

                if (!selectedText) {
                    window.postMessage({ type: 'PIBBLE_STATUS', message: '⚠️ Please copy text first' }, '*');
                    return;
                }
            }

            const statusMsg = mode === 'proofread' ? 'Proofreading' : mode === 'rewrite' ? 'Rewriting' : 'Summarizing page';
            window.postMessage({ type: 'PIBBLE_STATUS', message: `⚙️ ${statusMsg}...` }, '*');
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'PIBBLE_STATUS', message: `⚙️ ${statusMsg}...` }, '*');
            }

            const result = await bridgePrompt(selectedText, mode);

            window.postMessage({ type: 'PIBBLE_RESULT', text: result, mode: mode }, '*');
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'PIBBLE_RESULT', text: result, mode: mode }, '*');
            }

            window.postMessage({ type: 'PIBBLE_STATUS', message: '✅ Done! Click copy to use result' }, '*');
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'PIBBLE_STATUS', message: '✅ Done! Click copy to use result' }, '*');
            }

        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            window.postMessage({ type: 'PIBBLE_STATUS', message: `❌ ${errorMsg}` }, '*');
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'PIBBLE_STATUS', message: `❌ ${errorMsg}` }, '*');
            }
        }
    }

    window.addEventListener('message', (event: MessageEvent) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'PIBBLE_ACTION') {
            const mode = data.mode;
            if (mode === 'proofread' || mode === 'rewrite' || mode === 'summarize') {
                handleAIAction(mode);
            }
        }
    });
})();