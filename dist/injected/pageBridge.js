(() => {
    'use strict';

    const hasWindowAI = typeof window.ai !== 'undefined';
    const hasSelfAI = typeof self.ai !== 'undefined';
    const hasProofreader = typeof Proofreader !== 'undefined';
    const hasRewriter = typeof Rewriter !== 'undefined';
    const hasSummarizer = typeof Summarizer !== 'undefined';

    const ai = hasWindowAI ? window.ai : (hasSelfAI ? self.ai : null);

    let promptSession = null;
    let proofreaderSession = null;
    let rewriterSession = null;
    let summarizerSession = null;

    async function createProofreaderSession() {
        if (!hasProofreader) return null;

        try {
            const availability = await Proofreader.availability();
            if (availability === 'no') return null;

            const pr = await Proofreader.create({
                expectedInputLanguages: ['en'],
                monitor(m) {
                    m.addEventListener('downloadprogress', () => { });
                }
            });

            return pr;
        } catch (e) {
            return null;
        }
    }

    async function useProofreader(text) {
        if (!proofreaderSession) {
            proofreaderSession = await createProofreaderSession();
        }

        if (!proofreaderSession) {
            throw new Error('Proofreader API unavailable');
        }

        const result = await proofreaderSession.proofread(text);

        let correctedText = text;
        if (result && typeof result === 'object') {
            if (typeof result.correctedInput === 'string') {
                correctedText = result.correctedInput;
            } else if (typeof result.corrected === 'string') {
                correctedText = result.corrected;
            }
        } else if (typeof result === 'string') {
            correctedText = result;
        }

        return correctedText;
    }

    async function createRewriterSession() {
        if (!hasRewriter) return null;

        try {
            const availability = await Rewriter.availability();
            if (availability === 'no') return null;

            const tones = ['as-is', 'more-formal', 'more-casual'];
            const formats = ['as-is', 'plain-text'];
            const lengths = ['as-is', 'shorter', 'longer'];

            const randomTone = tones[Math.floor(Math.random() * tones.length)];
            const randomFormat = formats[Math.floor(Math.random() * formats.length)];
            const randomLength = lengths[Math.floor(Math.random() * lengths.length)];

            const rw = await Rewriter.create({
                sharedContext: 'Rewrite text to be clearer and more concise. Provide a fresh alternative perspective.',
                tone: randomTone,
                format: randomFormat,
                length: randomLength,
                monitor(m) {
                    m.addEventListener('downloadprogress', () => { });
                }
            });
            return rw;
        } catch (e) {
            return null;
        }
    }

    async function useRewriter(text) {
        if (rewriterSession) {
            try {
                await rewriterSession.destroy();
            } catch (e) { }
            rewriterSession = null;
        }

        rewriterSession = await createRewriterSession();

        if (!rewriterSession) {
            throw new Error('Rewriter API unavailable');
        }

        const result = await rewriterSession.rewrite(text);
        const rewrittenText = result || text;
        return rewrittenText;
    }

    async function createSummarizerSession() {
        if (!hasSummarizer) return null;

        try {
            const availability = await Summarizer.availability();
            if (availability === 'no') return null;

            const sm = await Summarizer.create({
                type: 'key-points',
                format: 'markdown',
                length: 'medium',
                sharedContext: 'Summarize webpage content into clear bullet points',
                monitor(m) {
                    m.addEventListener('downloadprogress', () => { });
                }
            });
            return sm;
        } catch (e) {
            return null;
        }
    }

    async function useSummarizer(text) {
        if (!summarizerSession) {
            summarizerSession = await createSummarizerSession();
        }

        if (!summarizerSession) {
            throw new Error('Summarizer API unavailable');
        }

        const result = await summarizerSession.summarize(text, {
            context: 'This is content from a webpage that needs to be summarized concisely.'
        });

        const formatted = result.replace(/\n- /g, '\n\n- ');
        return formatted;
    }

    async function createPromptSession() {
        if (!ai || !ai.languageModel) return null;

        try {
            const capabilities = await ai.languageModel.capabilities();
            if (capabilities.available === 'no') return null;

            const sess = await ai.languageModel.create({
                systemPrompt: 'You are a helpful writing assistant. When rewriting, provide creative alternatives with varied phrasing.',
                monitor(m) {
                    m.addEventListener('downloadprogress', () => { });
                }
            });

            return sess;
        } catch (e) {
            return null;
        }
    }

    async function usePromptAPI(text, mode) {
        if (mode === 'rewrite') {
            if (promptSession) {
                try {
                    await promptSession.destroy();
                } catch (e) { }
                promptSession = null;
            }
        }

        if (!promptSession) {
            promptSession = await createPromptSession();
        }

        if (!promptSession) {
            throw new Error('Prompt API unavailable');
        }

        let prompt;
        if (mode === 'proofread') {
            prompt = 'Proofread the following text. Fix grammar, spelling, and punctuation. Return only the corrected text.\n\n' + text;
        } else if (mode === 'summarize') {
            prompt = 'Summarize the following text into 5-7 key bullet points. Use clear, concise language. Format as a markdown list.\n\n' + text;
        } else {
            const styles = [
                'Rewrite the following text to be clearer and more concise.',
                'Rewrite the following text with a fresh perspective and varied phrasing.',
                'Rewrite the following text to be more engaging and impactful.',
                'Rewrite the following text with alternative word choices and sentence structures.'
            ];
            const randomStyle = styles[Math.floor(Math.random() * styles.length)];
            prompt = randomStyle + ' Return only the rewritten text.\n\n' + text;
        }

        const result = await promptSession.prompt(prompt);
        return result;
    }

    async function handleRequest(text, mode) {
        try {
            let result;

            if (mode === 'proofread') {
                if (hasProofreader) {
                    result = await useProofreader(text);
                } else if (ai) {
                    result = await usePromptAPI(text, mode);
                } else {
                    throw new Error('No API available for proofreading');
                }
            } else if (mode === 'rewrite') {
                if (hasRewriter) {
                    result = await useRewriter(text);
                } else if (ai) {
                    result = await usePromptAPI(text, mode);
                } else {
                    throw new Error('No API available for rewriting');
                }
            } else if (mode === 'summarize') {
                if (hasSummarizer) {
                    result = await useSummarizer(text);
                } else if (ai) {
                    result = await usePromptAPI(text, mode);
                } else {
                    throw new Error('No API available for summarizing');
                }
            } else {
                throw new Error('Unknown mode: ' + mode);
            }

            return result;

        } catch (error) {
            throw error;
        }
    }

    window.addEventListener('message', async (event) => {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.type !== 'PBRIDGE_REQUEST') return;

        const requestId = data.requestId;
        const payload = data.payload;

        try {
            const text = payload.userText || '';
            const mode = payload.mode || 'prompt';

            if (!text) {
                throw new Error('No text provided');
            }

            const result = await handleRequest(text, mode);

            window.postMessage({
                type: 'PBRIDGE_RESPONSE',
                requestId: requestId,
                text: result
            }, '*');

        } catch (error) {
            window.postMessage({
                type: 'PBRIDGE_RESPONSE',
                requestId: requestId,
                error: String(error)
            }, '*');
        }
    });
})();