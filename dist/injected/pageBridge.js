// Runs in the page context. Prefer LanguageModel; fallback to legacy window.ai.
// Avoid passing topK/temperature unless necessary; handle downloadable/downloading.
(() => {
    const TAG = '[PibbleBridge]';
    let session = null;

    const hasLanguageModel = () =>
        typeof window !== 'undefined' &&
        !!window.LanguageModel &&
        typeof window.LanguageModel.availability === 'function';

    const hasLegacyAI = () =>
        typeof window !== 'undefined' &&
        !!window.ai &&
        typeof window.ai.canCreateTextSession === 'function';

    async function lmAvailability() {
        try {
            return await window.LanguageModel.availability();
        } catch (e) {
            return `error:${e?.message || e}`;
        }
    }

    async function legacyAvailability() {
        try {
            const a = await window.ai.canCreateTextSession();
            if (a === 'readily') return 'available';
            if (a === 'after-download') return 'downloadable';
            if (a === 'no') return 'unavailable';
            return String(a || 'unavailable');
        } catch (e) {
            return `error:${e?.message || e}`;
        }
    }

    async function ensureSession(opts) {
        if (hasLanguageModel()) {
            const availability = await lmAvailability();
            if (availability === 'unavailable') throw new Error('Prompt API unavailable in page.');
            const base = {
                ...(opts?.systemPrompt ? { initialPrompts: [{ role: 'system', content: opts.systemPrompt }] } : {}),
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        // eslint-disable-next-line no-console
                        console.debug(TAG, 'downloadprogress', e?.loaded);
                    });
                }
            };
            try {
                session = await window.LanguageModel.create(base);
                return;
            } catch (e) {
                const msg = String(e?.message || e);
                if (/topK|temperature/i.test(msg)) {
                    session = await window.LanguageModel.create(); // retry bare
                    return;
                }
                if (/NotAllowedError|gesture|user/i.test(msg) || availability === 'downloadable' || availability === 'downloading') {
                    throw new Error('Model download requires a user click on the page. Click anywhere, keep the tab open, then try again.');
                }
                throw e;
            }
        }

        if (hasLegacyAI()) {
            const availability = await legacyAvailability();
            if (availability === 'unavailable') throw new Error('Prompt API unavailable in page.');
            session = await window.ai.createTextSession({
                model: 'gemini-nano',
                temperature: typeof opts?.temperature === 'number' ? opts.temperature : 0.7,
                systemPrompt: opts?.systemPrompt ?? undefined
            });
            return;
        }

        throw new Error('Prompt API unavailable in page');
    }

    async function getBridgeInfo() {
        if (hasLanguageModel()) {
            const availability = await lmAvailability();
            return { tag: TAG, href: location.href, hasAI: true, api: 'LanguageModel', availability };
        }
        if (hasLegacyAI()) {
            const availability = await legacyAvailability();
            return { tag: TAG, href: location.href, hasAI: true, api: 'window.ai', availability };
        }
        return { tag: TAG, href: location.href, hasAI: false, api: 'none', availability: 'unavailable' };
    }

    async function handlePrompt(userText, opts) {
        if (!userText || !userText.trim()) throw new Error('Empty prompt.');
        if (!session) await ensureSession(opts);
        return await session.prompt(userText);
    }

    window.addEventListener('message', async (event) => {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'PBRIDGE_REQUEST') {
            const { requestId, payload } = data || {};
            if (!requestId) return;
            try {
                const text = await handlePrompt(payload?.userText, {
                    temperature: payload?.temperature,
                    systemPrompt: payload?.systemPrompt
                });
                window.postMessage({ type: 'PBRIDGE_RESPONSE', requestId, text }, '*');
            } catch (e) {
                const message =
                    e?.message ||
                    'Prompt API error. If first run, click the page once to permit model download, keep it open, then try again.';
                window.postMessage({ type: 'PBRIDGE_RESPONSE', requestId, error: message }, '*');
            }
            return;
        }

        if (data.type === 'PBRIDGE_PING') {
            const { requestId } = data || {};
            const info = await getBridgeInfo();
            window.postMessage({ type: 'PBRIDGE_PONG', requestId, info }, '*');
            return;
        }
    });

    // eslint-disable-next-line no-console
    console.debug(TAG, 'bridge initialized on', location.href);
})();