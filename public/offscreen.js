/* global chrome */
"use strict";
const TAG = '[Offscreen]';
console.log(TAG, 'offscreen document initialized');

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'OFFSCREEN_WRITE_CLIPBOARD') {
        const text = String(msg.text || '');
        const preview = text.slice(0, 150).replace(/\n/g, '↵');
        console.log(TAG, '📋 Writing to clipboard, length:', text.length);
        console.log(TAG, '📋 Preview:', preview);

        navigator.clipboard.writeText(text)
            .then(() => {
                console.log(TAG, '✅ Clipboard write SUCCESS');
                sendResponse({ ok: true });
            })
            .catch((e) => {
                console.error(TAG, '❌ Clipboard write FAILED:', e);
                sendResponse({ ok: false, error: String(e?.message || e) });
            });
        return true;
    }
});