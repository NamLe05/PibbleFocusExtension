import React, { useEffect, useRef, useState } from 'react';
import { IoSend } from 'react-icons/io5';
import './styles/chatStyles.css';
import CoinTracker from './CoinTracker';
import { useUser } from '../providers/UserProvider';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
}

type BridgeInfo = {
    hasAI?: boolean;
    availability?: string;
    href?: string;
    api?: string;
};

type AITextSession = { prompt: (input: string) => Promise<string>; destroy?: () => void };

// Unique, stable IDs (fixes “message not displayed until next input” issues with React keys)
let _idCounter = 0;
function nextId(): string {
    const uuid = (globalThis as any)?.crypto?.randomUUID?.();
    return uuid || `${Date.now()}-${++_idCounter}`;
}

// Prefer new LanguageModel in the popup, then legacy window.ai
function popupHasLanguageModel() {
    return typeof (window as any).LanguageModel?.availability === 'function';
}
function popupHasLegacyAI() {
    return typeof (window as any).ai?.canCreateTextSession === 'function';
}

function hasExtensionApis() {
    return typeof (globalThis as any).chrome?.tabs?.query === 'function' &&
        typeof (globalThis as any).chrome?.scripting?.executeScript === 'function';
}

// Lightweight typing indicator styles injected at runtime (no CSS file change needed)
function injectTypingCssOnce() {
    const id = 'pibble-typing-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
    .typing-indicator { display: inline-flex; align-items: center; gap: 6px; height: 16px; }
    .typing-dot { width: 6px; height: 6px; background: #bdbdbd; border-radius: 50%; animation: pibble-bounce 1.2s infinite ease-in-out; }
    .typing-dot:nth-child(2) { animation-delay: 0.15s; }
    .typing-dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes pibble-bounce {
      0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
      40% { transform: translateY(-4px); opacity: 1; }
    }
  `;
    document.head.appendChild(style);
}

export default function Chat() {
    // Start with a placeholder; we’ll set the real first message after availability check
    const [messages, setMessages] = useState<Message[]>([
        { id: nextId(), text: 'Loading…', sender: 'bot' }
    ]);

    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Internal status message we can update in place (intro -> ready)
    const statusMsgIdRef = useRef<string | null>(messages[0].id);
    const pollingRef = useRef<number | null>(null);

    const endRef = useRef<HTMLDivElement>(null);
    const { addCoins } = useUser();

    useEffect(() => {
        injectTypingCssOnce();
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Short, casual system prompt with dynamic length guidance
    const systemPrompt = `
        You are Pibble, a friendly virtual dog companion. Keep your responses natural, brief, and straightforward.

        Guidelines:
        - Answer questions directly without extra flair
        - Use 1-2 sentences maximum for simple questions
        - Only use emojis (🐾, 🐶) when expressing emotion, not in every message
        - Avoid phrases like "Woof woof!" or overly playful language in factual responses
        - Be warm but not excessive

        Examples:
        H: "What's 1+1?"
        Pibble: "It's 2."

        H: "How are you?"
        Pibble: "Doing great! Just relaxing. What's up?"

        H: "Can you help me study?"
        Pibble: "Sure! What do you need help with?"

        H: "I'm tired."
        Pibble: "You've been working hard. Take a break 🐾"
        `.trim();

    // Replace or add a status message the bot controls (intro/loading/ready)
    function upsertStatusMessage(text: string) {
        setMessages((prev) => {
            // If we have a tracked status message, update it
            if (statusMsgIdRef.current) {
                return prev.map((m) => (m.id === statusMsgIdRef.current ? { ...m, text } : m));
            }
            // Otherwise append a new status message and track it
            const id = nextId();
            statusMsgIdRef.current = id;
            return [...prev, { id, text, sender: 'bot' }];
        });
    }

    function stopPollingAvailability() {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }

    // Active tab + content-script bridge plumbing
    async function getActiveHttpTab(): Promise<chrome.tabs.Tab> {
        if (!hasExtensionApis()) throw new Error('Extension APIs unavailable in web preview. Open the extension popup.');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !tab.url) throw new Error('No active tab. Focus a website tab and try again.');
        if (!/^https?:\/\//.test(tab.url)) {
            throw new Error('Open any http/https site and try again (not chrome:// pages).');
        }
        return tab;
    }

    function sendMessageWithTimeout<T = any>(tabId: number, msg: any, timeoutMs = 5000): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                reject(new Error('Timeout waiting for bridge response.'));
            }, timeoutMs);

            chrome.tabs.sendMessage(tabId, msg, (resp) => {
                const err = chrome.runtime.lastError;
                if (settled) return;
                clearTimeout(timer);
                if (err) {
                    settled = true;
                    return reject(new Error(err.message));
                }
                settled = true;
                resolve((resp as unknown as T) ?? ({} as T));
            });
        });
    }

    async function ensureBridge(tabId: number): Promise<void> {
        try {
            await sendMessageWithTimeout(tabId, { type: 'BRIDGE_PING' }, 1500);
            return;
        } catch {
            // fallthrough to injection
        }
        await chrome.scripting.executeScript({ target: { tabId }, files: ['contentScript.js'] });
        await new Promise((r) => setTimeout(r, 200));
        await sendMessageWithTimeout(tabId, { type: 'BRIDGE_PING' }, 2500);
    }

    async function promptViaActiveTab(payload: {
        userText: string;
        systemPrompt?: string;
        temperature?: number;
    }): Promise<{ text?: string; error?: string }> {
        const tab = await getActiveHttpTab();
        await ensureBridge(tab.id!);
        return sendMessageWithTimeout(tab.id!, { type: 'PROMPT_TEXT', ...payload }, 30000);
    }

    // Availability: prefer popup APIs first, then page bridge
    async function resolveAvailability(): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unknown'> {
        const normalize = (s?: string): 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unknown' => {
            switch ((s || '').toLowerCase()) {
                case 'available':
                case 'readily':
                    return 'available';
                case 'after-download':
                case 'downloadable':
                    return 'downloadable';
                case 'downloading':
                    return 'downloading';
                case 'unavailable':
                case 'no':
                    return 'unavailable';
                default:
                    return 'unknown';
            }
        };

        // 1) Try new Prompt API in the popup
        try {
            if (popupHasLanguageModel()) {
                const a = await (window as any).LanguageModel.availability();
                const norm = normalize(typeof a === 'string' ? a : undefined);
                if (norm !== 'unknown') return norm;
            }
        } catch { /* ignore */ }

        // 2) Try legacy window.ai in the popup
        try {
            if (popupHasLegacyAI()) {
                const a = await (window as any).ai.canCreateTextSession();
                const norm = normalize(a);
                if (norm !== 'unknown') return norm;
            }
        } catch { /* ignore */ }

        // 3) Fallback to page bridge only when extension APIs are present
        if (!hasExtensionApis()) return 'unknown';

        try {
            const tab = await getActiveHttpTab();
            await ensureBridge(tab.id!);
            const resp = await sendMessageWithTimeout<{ info?: BridgeInfo }>(tab.id!, { type: 'BRIDGE_PING' }, 3000);
            const norm = normalize(resp?.info?.availability);
            if (norm !== 'unknown') return norm;
        } catch { /* ignore */ }

        return 'unknown';
    }

    function startPollingAvailabilityUntilReady() {
        stopPollingAvailability();
        pollingRef.current = window.setInterval(async () => {
            const a = await resolveAvailability();
            if (a === 'available') {
                upsertStatusMessage("Hey I'm Pibble! How can I help?");
                stopPollingAvailability();
            } else {
                // keep asking for hello (user gesture) while not ready
                upsertStatusMessage("This is the first time you’re talking to Pibble! Please say hello to get started.");
            }
        }, 2500);
    }

    // Popup Prompt API (LanguageModel → window.ai) with robust create()
    async function ensurePopupLanguageModelSession(opts?: { systemPrompt?: string }): Promise<AITextSession> {
        const LM = (window as any).LanguageModel;
        const availability = await LM.availability();
        if (availability === 'unavailable') throw new Error('Prompt API unavailable in popup.');

        const base: any = {
            ...(opts?.systemPrompt ? { initialPrompts: [{ role: 'system', content: opts.systemPrompt }] } : {}),
            monitor(m: any) {
                m.addEventListener('downloadprogress', (e: any) => {
                    // could emit a progress UI if desired
                });
            }
        };

        try {
            return await LM.create(base); // minimal options avoid topK/temperature validation
        } catch (e: any) {
            const msg = String(e?.message || e);
            if (/topK|temperature/i.test(msg)) {
                return await LM.create(); // retry bare
            }
            if (/NotAllowedError|gesture|user/i.test(msg) || availability === 'downloadable' || availability === 'downloading') {
                throw new Error('Model download requires a user gesture. Say hello or click once, then try again.');
            }
            throw e;
        }
    }

    async function ensurePopupLegacySession(opts?: { systemPrompt?: string }): Promise<AITextSession> {
        const a = await (window as any).ai!.canCreateTextSession();
        if (a === 'no') throw new Error('Prompt API unavailable in popup.');
        return await (window as any).ai!.createTextSession({
            model: 'gemini-nano',
            systemPrompt: opts?.systemPrompt
        });
    }

    async function promptViaPopupOrBridge(payload: {
        userText: string;
        systemPrompt?: string;
    }): Promise<{ text?: string; error?: string }> {
        // 1) Try LanguageModel in popup
        if (popupHasLanguageModel()) {
            try {
                const session = await ensurePopupLanguageModelSession({ systemPrompt: payload.systemPrompt });
                const text = await session.prompt(payload.userText);
                session.destroy?.();
                return { text };
            } catch (e: any) {
                // fallback
            }
        }
        // 2) Try legacy window.ai in popup
        if (popupHasLegacyAI()) {
            try {
                const session = await ensurePopupLegacySession({ systemPrompt: payload.systemPrompt });
                const text = await session.prompt(payload.userText);
                session.destroy?.();
                return { text };
            } catch (e: any) {
                // fallback
            }
        }
        // 3) Fallback to page bridge
        return await promptViaActiveTab({ ...payload });
    }

    // On mount: show first-time message until model ready, then switch to ready prompt
    useEffect(() => {
        (async () => {
            const a = await resolveAvailability();
            if (a === 'available') {
                upsertStatusMessage("Hey I'm Pibble! How can I help?");
            } else {
                upsertStatusMessage("This is the first time you’re talking to Pibble! Please say hello to get started.");
                startPollingAvailabilityUntilReady();
            }
        })();
        return () => stopPollingAvailability();
    }, []);

    // Typing indicator component
    const TypingIndicator = () => (
        <div className="typing-indicator">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
        </div>
    );

    // Send handler
    const handleSend = async () => {
        if (!inputText.trim() || isLoading) return;

        const userMsg: Message = { id: nextId(), text: inputText.trim(), sender: 'user' };
        setMessages((p) => [...p, userMsg]);
        setInputText('');
        setIsLoading(true);

        // Award +1 coin for each chat
        addCoins(1);

        try {
            const resp = await promptViaPopupOrBridge({
                userText: userMsg.text,
                systemPrompt
            });

            if (resp.error) throw new Error(resp.error);
            const botMsg: Message = { id: nextId(), text: resp.text || 'No reply.', sender: 'bot' };
            setMessages((p) => [...p, botMsg]);
        } catch (e: any) {
            const msg =
                e?.message ||
                'Prompt API unavailable. Use Chrome Canary, enable flags, open a website tab, and try again.';
            const botMsg: Message = { id: nextId(), text: msg, sender: 'bot' };
            setMessages((p) => [...p, botMsg]);

            // If gesture/download is needed, keep showing first-time hint and keep polling
            if (/gesture|download/i.test(msg)) {
                upsertStatusMessage("This is the first time you’re talking to Pibble! Please say hello to get started.");
                startPollingAvailabilityUntilReady();
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-container">
            <CoinTracker />
            <div className="chat-header">
                <div className="avatar">
                    <img src="/assets/pibble_neutral.png" alt="Pibble" />
                </div>
                <h2 className="chat-title">Chat</h2>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.map((m) => (
                    <div key={m.id} className={`message-wrapper ${m.sender}-message-wrapper`}>
                        {m.sender === 'bot' && (
                            <div className="avatar">
                                <img src="/assets/pibble_neutral.png" alt="Pibble" />
                            </div>
                        )}
                        <div className={`message ${m.sender}-message`}>{m.text}</div>
                    </div>
                ))}

                {/* Typing indicator while generating */}
                {isLoading && (
                    <div className="message-wrapper bot-message-wrapper">
                        <div className="avatar">
                            <img src="/assets/pibble_neutral.png" alt="Pibble" />
                        </div>
                        <div className="message bot-message">
                            <TypingIndicator />
                        </div>
                    </div>
                )}

                <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="input-footer">
                <div className="input-container">
                    <textarea
                        className="chat-input"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Message Pibble..."
                        rows={1}
                        disabled={isLoading}
                    />
                    <button className="send-button" onClick={handleSend} disabled={!inputText.trim() || isLoading}>
                        <IoSend size={16} />
                    </button>
                </div>
            </div>

            <div className="bottom-section"></div>
        </div>
    );
}