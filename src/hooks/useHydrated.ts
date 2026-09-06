'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
// Persisted browser state must not change the server-rendered first frame.
export function useHydrated() {
    return useSyncExternalStore(subscribe, () => true, () => false);
}
