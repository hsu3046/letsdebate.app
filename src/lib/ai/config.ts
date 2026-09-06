import 'server-only';
import { createServiceProvider, isServiceModelEnabled } from './service';

// Existing character roles share the service-managed OpenRouter connection.
export function createProviders() {
    const provider = createServiceProvider();
    const model = (id: string) => {
        if (!isServiceModelEnabled(id)) throw new Error('현재 제공되지 않는 모델입니다.');
        return provider.chat(id);
    };
    return { openai: model, anthropic: model, google: model, xai: model, deepseek: model };
}

export const MODELS = {
    CHATGPT: 'openai/gpt-4.1-mini',
    CLAUDE: 'anthropic/claude-haiku-4.5',
    GEMINI: 'google/gemini-3-flash-preview',
    GROK: 'x-ai/grok-4.3',
    DEEPSEEK: 'deepseek/deepseek-r1',
    DIRECTOR: 'google/gemini-3-flash-preview',
    COACH: 'google/gemini-3-flash-preview',
    JUDGE: 'google/gemini-3-flash-preview',
    FALLBACK_1: 'google/gemini-2.5-flash',
    FALLBACK_2: 'google/gemini-2.5-flash-lite',
} as const;

export const FINAL_FALLBACK_MODEL = MODELS.FALLBACK_2;
export const MODERATOR_MODEL = MODELS.GEMINI;
