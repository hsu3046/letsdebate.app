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

// Legacy character roles use models from the recommended OPENROUTER_ALLOWED_MODELS list
// (.env.example), so the documented configuration enables both engines. Every ID here was
// present in OpenRouter's live catalog on 2026-11-05 (deepseek/deepseek-r1 had been delisted).
export const MODELS = {
    CHATGPT: 'openai/gpt-5.6-luna',
    CLAUDE: 'anthropic/claude-haiku-4.5',
    GEMINI: 'google/gemini-3.8-flash',
    GROK: 'x-ai/grok-4.6',
    DEEPSEEK: 'deepseek/deepseek-v4-pro-0813',
    DIRECTOR: 'google/gemini-3.8-flash',
    COACH: 'google/gemini-3.8-flash',
    JUDGE: 'google/gemini-3.8-flash',
    FALLBACK_1: 'qwen/qwen3.8-flash',
    FALLBACK_2: 'z-ai/glm-5.3-flash',
} as const;

export const FINAL_FALLBACK_MODEL = MODELS.FALLBACK_2;
export const MODERATOR_MODEL = MODELS.GEMINI;
