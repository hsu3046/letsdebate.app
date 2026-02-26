import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// API 키 타입 정의
export interface ApiKeys {
    GOOGLE_GENERATIVE_AI_API_KEY: string;
    OPENAI_API_KEY: string;
    ANTHROPIC_API_KEY: string;
    XAI_API_KEY: string;
    DEEPSEEK_API_KEY: string;
    BAREUN_API_KEY: string;
}

// Provider 이름 매핑
export type ProviderName = 'google' | 'openai' | 'anthropic' | 'xai' | 'deepseek';

const PROVIDER_KEY_MAP: Record<ProviderName, keyof ApiKeys> = {
    google: 'GOOGLE_GENERATIVE_AI_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    xai: 'XAI_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
};

interface ApiKeyStore {
    // API 키 상태
    apiKeys: ApiKeys;

    // Actions
    setApiKey: (key: keyof ApiKeys, value: string) => void;
    setApiKeys: (keys: Partial<ApiKeys>) => void;
    clearAllKeys: () => void;

    // Getters
    getApiKeys: () => ApiKeys;
    getConfiguredProviders: () => ProviderName[];
    isProviderConfigured: (provider: ProviderName) => boolean;
    hasAnyKey: () => boolean;
    hasMinimumKey: () => boolean;  // Google 키 (최소 기본)
}

const EMPTY_KEYS: ApiKeys = {
    GOOGLE_GENERATIVE_AI_API_KEY: '',
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    XAI_API_KEY: '',
    DEEPSEEK_API_KEY: '',
    BAREUN_API_KEY: '',
};

export const useApiKeyStore = create<ApiKeyStore>()(
    persist(
        (set, get) => ({
            apiKeys: { ...EMPTY_KEYS },

            setApiKey: (key, value) =>
                set((state) => ({
                    apiKeys: { ...state.apiKeys, [key]: value.trim() },
                })),

            setApiKeys: (keys) =>
                set((state) => ({
                    apiKeys: { ...state.apiKeys, ...keys },
                })),

            clearAllKeys: () => set({ apiKeys: { ...EMPTY_KEYS } }),

            getApiKeys: () => get().apiKeys,

            getConfiguredProviders: () => {
                const keys = get().apiKeys;
                return (Object.entries(PROVIDER_KEY_MAP) as [ProviderName, keyof ApiKeys][])
                    .filter(([, keyName]) => !!keys[keyName])
                    .map(([provider]) => provider);
            },

            isProviderConfigured: (provider) => {
                const keyName = PROVIDER_KEY_MAP[provider];
                return !!get().apiKeys[keyName];
            },

            hasAnyKey: () => {
                const keys = get().apiKeys;
                return Object.values(keys).some((v) => !!v);
            },

            hasMinimumKey: () => {
                return !!get().apiKeys.GOOGLE_GENERATIVE_AI_API_KEY;
            },
        }),
        {
            name: 'letsdebate_api_keys',
            partialize: (state) => ({
                apiKeys: state.apiKeys,
            }),
        }
    )
);

// 유틸리티: API 키를 마스킹하여 표시
export function maskApiKey(key: string): string {
    if (!key || key.length < 8) return key ? '***' : '';
    return key.slice(0, 4) + '···' + key.slice(-4);
}
