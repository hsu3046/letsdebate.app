import 'server-only';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { executionContext } from './access/context';
import { createTrackedFetch } from './access/trackedFetch';

export const AI_SERVICE_UNAVAILABLE = '지금은 AI 경기를 준비하고 있어요. 잠시 후 다시 시작해주세요.';

export function isAIServiceConfigured(): boolean {
    return process.env.AI_EXECUTION_ENABLED === 'true' && !!process.env.OPENROUTER_API_KEY?.trim() && !!process.env.OPENROUTER_ALLOWED_MODELS?.split(',').some(value => value.trim());
}

const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Test and staging environments may point to an OpenRouter-compatible gateway.
// Plain HTTP is accepted only for loopback hosts so a typo cannot leak the key in cleartext.
export function openRouterBaseURL(): string {
    const configured = process.env.OPENROUTER_BASE_URL?.trim();
    if (!configured) return DEFAULT_OPENROUTER_BASE_URL;
    try {
        const url = new URL(configured);
        const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
        if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) return DEFAULT_OPENROUTER_BASE_URL;
        return url.toString().replace(/\/+$/, '');
    } catch { return DEFAULT_OPENROUTER_BASE_URL; }
}

// HTTP header values must be ByteStrings (Latin-1). A Hangul title makes fetch() throw a
// TypeError before the request is sent, which failed every AI call. Keep these ASCII.
export const OPENROUTER_ATTRIBUTION_HEADERS = {
    'HTTP-Referer': 'https://letsdebate.app',
    'X-Title': 'WalGaWalBu',
    'X-OpenRouter-Title': 'WalGaWalBu',
} as const;

export function createServiceProvider() {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    const context = executionContext.getStore();
    if (!apiKey || !context) throw new Error(AI_SERVICE_UNAVAILABLE);
    // OpenRouter speaks the generic OpenAI Chat Completions dialect. The OpenAI-specific
    // provider must not be used here: it treats every non-gpt-4 model ID as an OpenAI
    // reasoning model, sending the system prompt as a `developer` message, renaming
    // max_tokens and silently dropping temperature for Gemini, Claude, Grok and others.
    const provider = createOpenAICompatible({
        name: 'openrouter', baseURL: openRouterBaseURL(), apiKey, includeUsage: true, fetch: createTrackedFetch(context),
        headers: OPENROUTER_ATTRIBUTION_HEADERS,
    });
    return { chat: (modelId: string) => provider.chatModel(modelId) };
}

// An optional operator allowlist applies to both the catalog and match execution.
export function isServiceModelEnabled(id: string): boolean {
    const allowed = process.env.OPENROUTER_ALLOWED_MODELS?.split(',').map(value => value.trim()).filter(Boolean);
    return !allowed?.length || allowed.includes(id);
}
