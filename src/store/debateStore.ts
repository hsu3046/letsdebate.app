import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DebateSetup, DebateState, DebateMessage } from '@/lib/types';
import { DEFAULT_SETUP, DEFAULT_DEBATE_STATE, STORAGE_KEYS } from '@/lib/constants';

// History item type
export interface DebateHistoryItem {
    id: string;
    topic: string;
    participants: string[];
    messageCount: number;
    createdAt: number;
    summary?: string;
    wasStopped?: boolean;  // 중단된 토론 여부
    humanName?: string;    // 유저 참가 시 닉네임
}

interface DebateStore {
    // Setup state
    setup: DebateSetup;
    setSetup: (setup: Partial<DebateSetup>) => void;
    resetSetup: () => void;

    // Debate state
    state: DebateState;
    setState: (state: Partial<DebateState>) => void;
    addMessage: (message: DebateMessage) => void;
    resetState: () => void;

    // Theme
    theme: 'light' | 'dark' | 'system';
    effectiveTheme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    toggleTheme: () => void;

    // History
    history: DebateHistoryItem[];
    addToHistory: (item: Omit<DebateHistoryItem, 'id' | 'createdAt'>) => void;
    updateHistorySummary: (topic: string, summary: string) => void;
    clearHistory: () => void;
    removeFromHistory: (id: string) => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useDebateStore = create<DebateStore>()(
    persist(
        (set, get) => ({
            // Setup
            setup: DEFAULT_SETUP,
            setSetup: (newSetup) =>
                set((state) => ({
                    setup: { ...state.setup, ...newSetup },
                })),
            resetSetup: () => set({ setup: DEFAULT_SETUP }),

            // Debate State
            state: DEFAULT_DEBATE_STATE,
            setState: (newState) =>
                set((state) => ({
                    state: { ...state.state, ...newState },
                })),
            addMessage: (message) =>
                set((state) => ({
                    state: {
                        ...state.state,
                        messages: [...state.state.messages, message],
                    },
                })),
            resetState: () => set({ state: DEFAULT_DEBATE_STATE }),

            // Theme with system detection
            theme: 'system',
            effectiveTheme: getSystemTheme(),
            setTheme: (newTheme) =>
                set({
                    theme: newTheme,
                    effectiveTheme: newTheme === 'system' ? getSystemTheme() : newTheme,
                }),
            toggleTheme: () =>
                set((state) => {
                    const nextTheme = state.effectiveTheme === 'light' ? 'dark' : 'light';
                    return {
                        theme: nextTheme,
                        effectiveTheme: nextTheme,
                    };
                }),

            // History
            history: [],
            addToHistory: (item) =>
                set((state) => {
                    // 동일 토픽이 있으면 업데이트, 없으면 새로 추가
                    const existingIdx = state.history.findIndex(h => h.topic === item.topic);
                    if (existingIdx >= 0) {
                        const updated = [...state.history];
                        updated[existingIdx] = {
                            ...updated[existingIdx],
                            ...item,
                            createdAt: Date.now(),
                        };
                        return { history: updated };
                    }
                    return {
                        history: [
                            {
                                ...item,
                                id: `debate-${Date.now()}`,
                                createdAt: Date.now(),
                            },
                            ...state.history.slice(0, 4), // Keep last 5 items
                        ],
                    };
                }),
            updateHistorySummary: (topic, summary) =>
                set((state) => ({
                    history: state.history.map((h) =>
                        h.topic === topic ? { ...h, summary } : h
                    ),
                })),
            clearHistory: () => set({ history: [] }),
            removeFromHistory: (id) =>
                set((state) => ({
                    history: state.history.filter((h) => h.id !== id),
                })),
        }),
        {
            name: STORAGE_KEYS.SETUP,
            partialize: (state) => ({
                setup: state.setup,
                theme: state.theme,
                effectiveTheme: state.effectiveTheme,
                history: state.history,
            }),
        }
    )
);
