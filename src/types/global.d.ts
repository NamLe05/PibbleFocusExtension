export { };

declare global {
    // New Prompt API
    interface LanguageModelParams {
        defaultTopK: number;
        maxTopK: number;
        defaultTemperature: number;
        maxTemperature: number;
    }

    interface LanguageModelSession {
        prompt: (input: string | any) => Promise<string>;
        append?: (msgs: any[]) => Promise<void>;
        clone?: (options?: { signal?: AbortSignal }) => Promise<any>;
        destroy?: () => void;
        inputUsage?: number;
        inputQuota?: number;
    }

    interface LanguageModelStatic {
        availability: (options?: any) => Promise<'available' | 'downloadable' | 'downloading' | 'unavailable' | string>;
        params: () => Promise<LanguageModelParams>;
        create: (options?: {
            temperature?: number;
            topK?: number;
            signal?: AbortSignal;
            monitor?: (m: { addEventListener: (t: 'downloadprogress', cb: (e: { loaded: number }) => void) => void }) => void;
            initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string; prefix?: boolean }>;
            expectedInputs?: Array<{ type: 'text' | 'image' | 'audio'; languages?: string[] }>;
            expectedOutputs?: Array<{ type: 'text'; languages?: string[] }>;
        }) => Promise<LanguageModelSession>;
    }

    var LanguageModel: LanguageModelStatic | undefined;

    interface Window {
        LanguageModel?: LanguageModelStatic;

        // Legacy fallback
        ai?: {
            canCreateTextSession: () => Promise<'no' | 'after-download' | 'readily'>;
            createTextSession: (options?: {
                temperature?: number;
                topK?: number;
                topP?: number;
                systemPrompt?: string;
                model?: 'gemini-nano';
            }) => Promise<{
                prompt: (input: string) => Promise<string>;
                destroy?: () => void;
            }>;
        };
    }
}