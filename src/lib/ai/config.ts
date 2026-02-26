// Multi-Provider AI Configuration for 왈가왈부
// BYOK (Bring Your Own Key) - 클라이언트에서 전달받은 API 키로 동적 provider 생성

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import { createDeepSeek } from '@ai-sdk/deepseek';

// ===== API Keys 타입 =====

export interface ApiKeys {
    GOOGLE_GENERATIVE_AI_API_KEY?: string;
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    XAI_API_KEY?: string;
    DEEPSEEK_API_KEY?: string;
    BAREUN_API_KEY?: string;
}

// ===== 동적 Provider 생성 =====

export function createProviders(apiKeys: ApiKeys) {
    const openai = createOpenAI({
        apiKey: apiKeys.OPENAI_API_KEY || '',
    });

    const anthropic = createAnthropic({
        apiKey: apiKeys.ANTHROPIC_API_KEY || '',
    });

    const google = createGoogleGenerativeAI({
        apiKey: apiKeys.GOOGLE_GENERATIVE_AI_API_KEY || '',
    });

    const xai = createXai({
        apiKey: apiKeys.XAI_API_KEY || '',
    });

    const deepseek = createDeepSeek({
        apiKey: apiKeys.DEEPSEEK_API_KEY || '',
    });

    return { openai, anthropic, google, xai, deepseek };
}

// ===== Model Definitions (MVP v2.1) =====

export const MODELS = {
    // OpenAI
    CHATGPT: 'gpt-4.1-mini',

    // Anthropic
    CLAUDE: 'claude-3-5-haiku-20241022',

    // Google
    GEMINI: 'gemini-3-flash-preview',

    // xAI
    GROK: 'grok-4-1-fast-reasoning',

    // DeepSeek
    DEEPSEEK: 'deepseek-reasoner',

    // Director AI
    DIRECTOR: 'gemini-3-flash-preview',

    // Coach AI
    COACH: 'gemini-3-flash-preview',

    // Judge AI    
    JUDGE: 'gemini-3-flash-preview',

    // Fallback Models (Google)
    FALLBACK_1: 'gemini-2.5-flash',
    FALLBACK_2: 'gemini-2.5-flash-lite',
} as const;

// Final Fallback Model
export const FINAL_FALLBACK_MODEL = MODELS.FALLBACK_2;

// Moderator AI Model
export const MODERATOR_MODEL = MODELS.GEMINI;

// ===== Provider Check (동적) =====

export function isProviderConfigured(provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek', apiKeys: ApiKeys): boolean {
    switch (provider) {
        case 'openai':
            return !!apiKeys.OPENAI_API_KEY;
        case 'anthropic':
            return !!apiKeys.ANTHROPIC_API_KEY;
        case 'google':
            return !!apiKeys.GOOGLE_GENERATIVE_AI_API_KEY;
        case 'xai':
            return !!apiKeys.XAI_API_KEY;
        case 'deepseek':
            return !!apiKeys.DEEPSEEK_API_KEY;
        default:
            return false;
    }
}
