// Runs in the page context to access AI APIs
(() => {
    'use strict';
    const TAG = '[PibbleBridge]';
    console.log(TAG, 'loaded');

    const hasWindowAI = typeof window.ai !== 'undefined';
    const hasSelfAI = typeof self.ai !== 'undefined';
    const hasProofreader = typeof Proofreader !== 'undefined';
    const hasRewriter = typeof Rewriter !== 'undefined';
    const hasSummarizer = typeof Summarizer !== 'undefined';

    console.log(TAG, 'Available APIs:');
    console.log(TAG, '  window.ai:', hasWindowAI);
    console.log(TAG, '  self.ai:', hasSelfAI);
    console.log(TAG, '  Proofreader:', hasProofreader);
    console.log(TAG, '  Rewriter:', hasRewriter);
    console.log(TAG, '  Summarizer:', hasSummarizer);

    const ai = hasWindowAI ? window.ai : (hasSelfAI ? self.ai : null);

    if (!ai && !hasProofreader && !hasRewriter && !hasSummarizer) {
        console.error(TAG, 'No AI APIs available!');
        console.error(TAG, 'Enable chrome://flags for AI features');
    }

    let promptSession = null;
    let proofreaderSession = null;
    let rewriterSession = null;
    let summarizerSession = null;

    async function createProofreaderSession() {
        if (!hasProofreader) return null;

        try {
            console.log(TAG, 'Creating Proofreader session...');
            const availability = await Proofreader.availability();
            console.log(TAG, 'Proofreader availability:', availability);

            if (availability === 'no') {
                console.error(TAG, 'Proofreader not available');
                return null;
            }

            const pr = await Proofreader.create({
                expectedInputLanguages: ['en'],
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        console.log(TAG, 'Proofreader download:', Math.round(e.loaded * 100) + '%');
                    });
                }
            });
            console.log(TAG, 'Proofreader session created');
            return pr;
        } catch (e) {
            console.error(TAG, 'Proofreader creation failed:', e);
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

        console.log(TAG, 'Using Proofreader API...');
        const result = await proofreaderSession.proofread(text);
        const correctedText = result.corrected || result || text;
        console.log(TAG, 'Proofreader done, length:', correctedText.length);
        return correctedText;
    }

    async function createRewriterSession() {
        if (!hasRewriter) return null;

        try {
            console.log(TAG, 'Creating NEW Rewriter session (for variety)...');
            const availability = await Rewriter.availability();
            console.log(TAG, 'Rewriter availability:', availability);

            if (availability === 'no') {
                console.error(TAG, 'Rewriter not available');
                return null;
            }

            const tones = ['as-is', 'more-formal', 'more-casual'];
            const formats = ['as-is', 'plain-text'];
            const lengths = ['as-is', 'shorter', 'longer'];

            const randomTone = tones[Math.floor(Math.random() * tones.length)];
            const randomFormat = formats[Math.floor(Math.random() * formats.length)];
            const randomLength = lengths[Math.floor(Math.random() * lengths.length)];

            console.log(TAG, 'Rewriter config: tone=' + randomTone + ', format=' + randomFormat + ', length=' + randomLength);

            const rw = await Rewriter.create({
                sharedContext: 'Rewrite text to be clearer and more concise. Provide a fresh alternative perspective.',
                tone: randomTone,
                format: randomFormat,
                length: randomLength,
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        console.log(TAG, 'Rewriter download:', Math.round(e.loaded * 100) + '%');
                    });
                }
            });
            console.log(TAG, 'Rewriter session created');
            return rw;
        } catch (e) {
            console.error(TAG, 'Rewriter creation failed:', e);
            return null;
        }
    }

    async function useRewriter(text) {
        console.log(TAG, 'Destroying old rewriter session for fresh results...');
        if (rewriterSession) {
            try {
                await rewriterSession.destroy();
            } catch (e) {
                console.warn(TAG, 'Failed to destroy old session:', e);
            }
            rewriterSession = null;
        }

        rewriterSession = await createRewriterSession();

        if (!rewriterSession) {
            throw new Error('Rewriter API unavailable');
        }

        console.log(TAG, 'Using Rewriter API...');
        const result = await rewriterSession.rewrite(text);
        const rewrittenText = result || text;
        console.log(TAG, 'Rewriter done, length:', rewrittenText.length);
        return rewrittenText;
    }

    async function createSummarizerSession() {
        if (!hasSummarizer) return null;

        try {
            console.log(TAG, 'Creating Summarizer session...');
            const availability = await Summarizer.availability();
            console.log(TAG, 'Summarizer availability:', availability);

            if (availability === 'no') {
                console.error(TAG, 'Summarizer not available');
                return null;
            }

            const sm = await Summarizer.create({
                type: 'key-points',
                format: 'markdown',
                length: 'medium',
                sharedContext: 'Summarize webpage content into clear bullet points',
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        console.log(TAG, 'Summarizer download:', Math.round(e.loaded * 100) + '%');
                    });
                }
            });
            console.log(TAG, 'Summarizer session created');
            return sm;
        } catch (e) {
            console.error(TAG, 'Summarizer creation failed:', e);
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

        console.log(TAG, 'Using Summarizer API...');
        const result = await summarizerSession.summarize(text, {
            context: 'This is content from a webpage that needs to be summarized concisely.'
        });
        console.log(TAG, 'Summarizer done, length:', result.length);
        return result;
    }

    async function createPromptSession() {
        if (!ai || !ai.languageModel) return null;

        try {
            console.log(TAG, 'Creating Prompt API session...');
            const capabilities = await ai.languageModel.capabilities();
            console.log(TAG, 'Prompt API capabilities:', capabilities);

            if (capabilities.available === 'no') {
                console.error(TAG, 'Prompt API not available');
                return null;
            }

            const sess = await ai.languageModel.create({
                systemPrompt: 'You are a helpful writing assistant. When rewriting, provide creative alternatives with varied phrasing.',
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        console.log(TAG, 'Model download:', Math.round(e.loaded * 100) + '%');
                    });
                }
            });

            console.log(TAG, 'Prompt API session created');
            return sess;
        } catch (e) {
            console.error(TAG, 'Prompt API creation failed:', e);
            return null;
        }
    }

    async function usePromptAPI(text, mode) {
        if (mode === 'rewrite') {
            console.log(TAG, 'Destroying old prompt session for rewrite variety...');
            if (promptSession) {
                try {
                    await promptSession.destroy();
                } catch (e) {
                    console.warn(TAG, 'Failed to destroy old session:', e);
                }
                promptSession = null;
            }
        }

        if (!promptSession) {
            promptSession = await createPromptSession();
        }

        if (!promptSession) {
            throw new Error('Prompt API unavailable');
        }

        console.log(TAG, 'Using Prompt API...');

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
            console.log(TAG, 'Rewrite style: ' + randomStyle);
        }

        const result = await promptSession.prompt(prompt);
        console.log(TAG, 'Prompt API done, length:', result.length);
        return result;
    }

    async function handleRequest(text, mode) {
        console.log(TAG, 'Request:', mode, 'text length:', text.length);

        try {
            let result;

            if (mode === 'proofread') {
                if (hasProofreader) {
                    console.log(TAG, 'Strategy: Proofreader API');
                    result = await useProofreader(text);
                } else if (ai) {
                    console.log(TAG, 'Strategy: Prompt API fallback');
                    result = await usePromptAPI(text, mode);
                } else {
                    throw new Error('No API available for proofreading');
                }
            } else if (mode === 'rewrite') {
                if (hasRewriter) {
                    console.log(TAG, 'Strategy: Rewriter API (fresh session for variety)');
                    result = await useRewriter(text);
                } else if (ai) {
                    console.log(TAG, 'Strategy: Prompt API fallback (with randomized prompts)');
                    result = await usePromptAPI(text, mode);
                } else {
                    throw new Error('No API available for rewriting');
                }
            } else if (mode === 'summarize') {
                if (hasSummarizer) {
                    console.log(TAG, 'Strategy: Summarizer API');
                    result = await useSummarizer(text);
                } else if (ai) {
                    console.log(TAG, 'Strategy: Prompt API fallback');
                    result = await usePromptAPI(text, mode);
                } else {
                    throw new Error('No API available for summarizing');
                }
            } else {
                throw new Error('Unknown mode: ' + mode);
            }

            console.log(TAG, 'Result length:', result.length);
            return result;

        } catch (error) {
            console.error(TAG, 'Error in', mode + ':', error);
            throw error;
        }
    }

    window.addEventListener('message', async (event) => {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.type !== 'PBRIDGE_REQUEST') return;

        const requestId = data.requestId;
        const payload = data.payload;
        console.log(TAG, 'Received request:', requestId);

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
            console.error(TAG, 'Request failed:', error);
            window.postMessage({
                type: 'PBRIDGE_RESPONSE',
                requestId: requestId,
                error: String(error)
            }, '*');
        }
    });

    console.log(TAG, 'Bridge ready');
    console.log(TAG, 'Proofreader:', hasProofreader ? 'YES' : 'NO');
    console.log(TAG, 'Rewriter:', hasRewriter ? 'YES' : 'NO');
    console.log(TAG, 'Summarizer:', hasSummarizer ? 'YES' : 'NO');
    console.log(TAG, 'Prompt API:', ai ? 'YES' : 'NO');
})();