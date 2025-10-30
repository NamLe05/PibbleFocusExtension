/* global chrome */
(function () {
    const TAG = '[PibbleContent]';
    const isTopFrame = window === window.top;

    console.log('🟢 🟢 🟢 CONTENT SCRIPT LOADING 🟢 🟢 🟢');
    console.log(TAG, 'Script file executed!');
    console.log(TAG, 'URL:', location.href);
    console.log(TAG, 'Frame type:', isTopFrame ? 'TOP FRAME' : 'IFRAME');
    console.log(TAG, 'Timestamp:', new Date().toISOString());

    let bridgeReady = false;

    function ensureBridgeInjected() {
        if ((window as any).__pibbleBridgeInjected) return;
        console.log(TAG, 'Injecting page bridge script...');
        const s = document.createElement('script');
        s.src = chrome.runtime.getURL('injected/pageBridge.js');
        s.onload = () => {
            console.log(TAG, '✅ Page bridge script loaded');
            s.remove();
            setTimeout(() => {
                bridgeReady = true;
                console.log(TAG, '✅ Bridge ready for requests');
            }, 500);
        };
        s.onerror = () => {
            console.error(TAG, '❌ Failed to load page bridge script');
        };
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
            console.log(TAG, 'Received PBRIDGE_RESPONSE for', data.requestId);
            const resolver = pending.get(data.requestId);
            if (resolver) {
                resolver({ text: data.text, error: data.error });
                pending.delete(data.requestId);
            }
        }
    });

    function bridgePrompt(text: string, mode: 'proofread' | 'rewrite' | 'summarize'): Promise<string> {
        console.log(TAG, `bridgePrompt() called for ${mode}`);
        const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        console.log(TAG, `🤖 Sending to AI, requestId: ${requestId}`);
        console.log(TAG, `📝 Mode: ${mode}, text length: ${text.length} chars`);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                pending.delete(requestId);
                console.error(TAG, `❌ AI timeout for requestId: ${requestId}`);
                reject(new Error('AI timeout'));
            }, 60000); // 60s for summarize

            pending.set(requestId, (resp) => {
                clearTimeout(timeout);
                if (resp.error) {
                    console.error(TAG, `❌ AI error: ${resp.error}`);
                    reject(new Error(resp.error));
                } else {
                    console.log(TAG, `✅ AI response received for requestId: ${requestId}`);
                    resolve(String(resp.text ?? ''));
                }
            });

            console.log(TAG, 'Posting PBRIDGE_REQUEST to window');
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
        console.log(TAG, '🔍 Getting text from clipboard...');
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim()) {
                console.log(TAG, `✅ Got ${text.length} chars from clipboard`);
                return text.trim();
            }
        } catch (e) {
            console.error(TAG, '❌ Clipboard read failed:', e);
        }
        console.log(TAG, '❌ No text in clipboard');
        return '';
    }

    function extractPageText(): string {
        const main = document.querySelector('main, article, [role="main"]');
        const target = (main || document.body) as HTMLElement;
        const text = target.innerText || target.textContent || '';
        return text.trim();
    }

    async function handleAIAction(mode: 'proofread' | 'rewrite' | 'summarize') {
        console.log(TAG, `\n${'═'.repeat(80)}`);
        console.log(TAG, `🎯 🎯 🎯 ${mode.toUpperCase()} ACTION TRIGGERED 🎯 🎯 🎯`);
        console.log(TAG, `${'═'.repeat(80)}`);

        try {
            if (!bridgeReady) {
                console.warn(TAG, '⚠️ Bridge not ready yet, waiting...');
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
                console.log(TAG, '📄 Extracting page text for summarization...');
                selectedText = extractPageText();

                if (!selectedText) {
                    throw new Error('No text found on page');
                }

                console.log(TAG, `✅ Extracted ${selectedText.length} chars from page`);
            } else {
                selectedText = await getSelectionText();

                if (!selectedText) {
                    console.error(TAG, '❌ NO TEXT IN CLIPBOARD!');
                    window.postMessage({ type: 'PIBBLE_STATUS', message: '⚠️ Please copy text first' }, '*');
                    return;
                }

                console.log(TAG, `✅ Got text: ${selectedText.length} characters`);
            }

            const statusMsg = mode === 'proofread' ? 'Proofreading' : mode === 'rewrite' ? 'Rewriting' : 'Summarizing page';
            window.postMessage({ type: 'PIBBLE_STATUS', message: `⚙️ ${statusMsg}...` }, '*');
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'PIBBLE_STATUS', message: `⚙️ ${statusMsg}...` }, '*');
            }

            console.log(TAG, `🤖 Calling ${mode} API...`);
            const result = await bridgePrompt(selectedText, mode);

            console.log(TAG, `\n${'─'.repeat(80)}`);
            console.log(TAG, `✨ ✨ ✨ ${mode.toUpperCase()} RESULT ✨ ✨ ✨`);
            console.log(TAG, `Result length: ${result.length} characters`);
            console.log(TAG, `${'─'.repeat(80)}`);
            console.log(TAG, result);
            console.log(TAG, `${'─'.repeat(80)}\n`);

            window.postMessage({ type: 'PIBBLE_RESULT', text: result, mode: mode }, '*');
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'PIBBLE_RESULT', text: result, mode: mode }, '*');
            }

            window.postMessage({ type: 'PIBBLE_STATUS', message: '✅ Done! Click copy to use result' }, '*');
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'PIBBLE_STATUS', message: '✅ Done! Click copy to use result' }, '*');
            }

        } catch (e) {
            console.error(TAG, '❌ ❌ ❌ ERROR during AI action:', e);
            const errorMsg = e instanceof Error ? e.message : String(e);
            window.postMessage({ type: 'PIBBLE_STATUS', message: `❌ ${errorMsg}` }, '*');
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'PIBBLE_STATUS', message: `❌ ${errorMsg}` }, '*');
            }
        } finally {
            console.log(TAG, `${'═'.repeat(80)}`);
            console.log(TAG, `✓ ${mode.toUpperCase()} ACTION COMPLETE`);
            console.log(TAG, `${'═'.repeat(80)}\n\n`);
        }
    }

    window.addEventListener('message', (event: MessageEvent) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'PIBBLE_ACTION') {
            const mode = data.mode;
            console.log(TAG, `📨 📨 📨 Received PIBBLE_ACTION message, mode: ${mode}`);
            if (mode === 'proofread' || mode === 'rewrite' || mode === 'summarize') {
                handleAIAction(mode);
            } else {
                console.warn(TAG, `⚠️ Unknown mode: ${mode}`);
            }
        }
    });

    console.log(TAG, '🎧 Message listener registered for PIBBLE_ACTION');
    console.log(TAG, `✅ ✅ ✅ Content script FULLY READY (frame: ${isTopFrame ? 'TOP' : 'iframe'})`);
    console.log(TAG, 'Waiting for PIBBLE_ACTION messages...');
})();