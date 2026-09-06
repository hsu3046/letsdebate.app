import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LibraryStore {
    savedTopicIds: number[];
    toggleTopic: (id: number) => void;
}

export const useLibraryStore = create<LibraryStore>()(persist((set) => ({
    savedTopicIds: [],
    toggleTopic: (id) => set(({ savedTopicIds }) => ({
        savedTopicIds: savedTopicIds.includes(id)
            ? savedTopicIds.filter((savedId) => savedId !== id)
            : [...savedTopicIds, id],
    })),
}), { name: 'walgawalbu-library', version: 1 }));
