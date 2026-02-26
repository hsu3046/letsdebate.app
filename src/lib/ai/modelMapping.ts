// Character-Model Mapping for 왈가왈부
// BYOK v1 - 동적 API 키 기반 모델 선택 + Fallback 전략

import { createProviders, isProviderConfigured, MODELS, FINAL_FALLBACK_MODEL, type ApiKeys } from './config';
import { getCharacterById } from '@/lib/characters';
import type { LanguageModel } from 'ai';

// ===== Types =====

export type ProviderName = 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek';

export interface ModelConfig {
    provider: ProviderName;
    model: string;
    maxTokens: number;
    temperature: number;
}

// ===== aiModel → provider/model 매핑 =====

const AI_MODEL_MAPPING: Record<string, { provider: ProviderName; model: string }> = {
    'Claude': { provider: 'anthropic', model: MODELS.CLAUDE },
    'ChatGPT': { provider: 'openai', model: MODELS.CHATGPT },
    'Gemini': { provider: 'google', model: MODELS.GEMINI },
    'Grok': { provider: 'xai', model: MODELS.GROK },
    'DeepSeek': { provider: 'deepseek', model: MODELS.DEEPSEEK },
};

// ===== 모델별 생성 파라미터 =====

const MODEL_PARAMS: Record<string, { maxTokens: number; temperature: number }> = {
    'Claude': { maxTokens: 600, temperature: 0.7 },
    'Grok': { maxTokens: 900, temperature: 0.7 },
    'Gemini': { maxTokens: 600, temperature: 0.7 },
    'ChatGPT': { maxTokens: 800, temperature: 0.8 },
    'DeepSeek': { maxTokens: 700, temperature: 0.7 },
};

const DEFAULT_PARAMS = { maxTokens: 700, temperature: 0.7 };

// ===== Fallback Chain (Gemini Only) =====

const FALLBACK_CHAIN: Record<string, string[]> = {
    'Claude': ['Gemini'],
    'Grok': ['Gemini'],
    'ChatGPT': ['Gemini'],
    'DeepSeek': ['Gemini'],
    'Gemini': [],
};

/**
 * 캐릭터 ID로 사용 가능한 모델 가져오기 (동적 API 키)
 */
export function getModelForCharacter(characterId: string, apiKeys: ApiKeys): {
    model: LanguageModel;
    modelName: string;
    provider: ProviderName;
    isFallback: boolean;
    maxTokens: number;
    temperature: number;
} {
    const providers = createProviders(apiKeys);

    // Provider name → LanguageModel 생성 함수 매핑
    const getModel = (provider: ProviderName, model: string): LanguageModel => {
        switch (provider) {
            case 'openai': return providers.openai(model);
            case 'anthropic': return providers.anthropic(model);
            case 'google': return providers.google(model);
            case 'xai': return providers.xai(model);
            case 'deepseek': return providers.deepseek(model);
        }
    };

    // 1. 캐릭터에서 aiModel 읽기
    const character = getCharacterById(characterId);
    const aiModel = character?.aiModel || 'Gemini';
    const params = MODEL_PARAMS[aiModel] || DEFAULT_PARAMS;

    // 2. aiModel에 해당하는 설정 가져오기
    const config = AI_MODEL_MAPPING[aiModel];

    if (!config) {
        console.warn(`Unknown aiModel: ${aiModel} for character ${characterId}, using Gemini fallback`);
        return {
            model: providers.google(FINAL_FALLBACK_MODEL),
            modelName: FINAL_FALLBACK_MODEL,
            provider: 'google',
            isFallback: true,
            ...DEFAULT_PARAMS,
        };
    }

    // 3. Provider가 설정되어 있으면 사용
    if (isProviderConfigured(config.provider, apiKeys)) {
        console.log(`[Model] ${characterId} → ${aiModel} (${config.model})`);
        return {
            model: getModel(config.provider, config.model),
            modelName: config.model,
            provider: config.provider,
            isFallback: false,
            ...params,
        };
    }

    // 4. Fallback Chain 순회
    const fallbacks = FALLBACK_CHAIN[aiModel] || ['Gemini'];
    for (const fallbackAiModel of fallbacks) {
        const fallbackConfig = AI_MODEL_MAPPING[fallbackAiModel];
        if (fallbackConfig && isProviderConfigured(fallbackConfig.provider, apiKeys)) {
            console.log(`[Model] ${characterId}: ${aiModel} → ${fallbackAiModel} (fallback)`);
            return {
                model: getModel(fallbackConfig.provider, fallbackConfig.model),
                modelName: fallbackConfig.model,
                provider: fallbackConfig.provider,
                isFallback: true,
                ...params,
            };
        }
    }

    // 5. 최종 Gemini Fallback
    console.log(`[Model] ${characterId}: ${aiModel} → Gemini (final fallback)`);
    return {
        model: providers.google(FINAL_FALLBACK_MODEL),
        modelName: FINAL_FALLBACK_MODEL,
        provider: 'google',
        isFallback: true,
        ...DEFAULT_PARAMS,
    };
}

/**
 * 사회자 모델 가져오기 (동적 API 키, Fallback 포함)
 */
export function getModeratorModel(apiKeys: ApiKeys): {
    model: LanguageModel;
    modelName: string;
    provider: ProviderName;
    isFallback: boolean;
} {
    const providers = createProviders(apiKeys);

    // 사회자: OpenAI 우선, Google fallback
    if (isProviderConfigured('openai', apiKeys)) {
        return {
            model: providers.openai(MODELS.CHATGPT),
            modelName: MODELS.CHATGPT,
            provider: 'openai',
            isFallback: false,
        };
    }

    // Fallback to Gemini
    console.log('[Model] Moderator → Gemini (fallback)');
    return {
        model: providers.google(FINAL_FALLBACK_MODEL),
        modelName: FINAL_FALLBACK_MODEL,
        provider: 'google',
        isFallback: true,
    };
}
