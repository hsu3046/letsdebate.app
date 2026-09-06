import 'server-only';
import { createProviders, MODELS, FINAL_FALLBACK_MODEL } from './config';
import { getCharacterById } from '@/lib/characters';
import type { LanguageModel } from 'ai';

export type ProviderName = 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek';

export interface ModelConfig {
    provider: ProviderName;
    model: string;
    maxTokens: number;
    temperature: number;
}

const CHARACTER_MODELS: Record<string, ModelConfig> = {
    Claude: { provider: 'anthropic', model: MODELS.CLAUDE, maxTokens: 600, temperature: 0.7 },
    ChatGPT: { provider: 'openai', model: MODELS.CHATGPT, maxTokens: 800, temperature: 0.8 },
    Gemini: { provider: 'google', model: MODELS.GEMINI, maxTokens: 600, temperature: 0.7 },
    Grok: { provider: 'xai', model: MODELS.GROK, maxTokens: 900, temperature: 0.7 },
    DeepSeek: { provider: 'deepseek', model: MODELS.DEEPSEEK, maxTokens: 700, temperature: 0.7 },
};

export function getModelForCharacter(characterId: string): {
    model: LanguageModel; modelName: string; provider: ProviderName;
    isFallback: boolean; maxTokens: number; temperature: number;
} {
    const aiModel = getCharacterById(characterId)?.aiModel || 'Gemini';
    const config = CHARACTER_MODELS[aiModel];
    const selected = config || { provider: 'google' as const, model: FINAL_FALLBACK_MODEL, maxTokens: 700, temperature: 0.7 };
    return {
        model: createProviders()[selected.provider](selected.model),
        modelName: selected.model, provider: selected.provider, isFallback: !config,
        maxTokens: selected.maxTokens, temperature: selected.temperature,
    };
}

export function getModeratorModel(): {
    model: LanguageModel; modelName: string; provider: ProviderName; isFallback: boolean;
} {
    return { model: createProviders().openai(MODELS.CHATGPT), modelName: MODELS.CHATGPT, provider: 'openai', isFallback: false };
}
