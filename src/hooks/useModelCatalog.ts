'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OpenRouterModel } from '@/lib/tournament';
import { selectRosterModels } from '@/lib/players';

export function useModelCatalog() {
    const [models, setModels] = useState<OpenRouterModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const retry = useCallback(() => setRevision(value => value + 1), []);
    useEffect(() => {
        const controller = new AbortController();
        const load = async () => {
            setLoading(true); setError('');
            try {
                const response = await fetch('/api/models', { signal: controller.signal });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || '모델 목록을 불러오지 못했어요');
                setModels(selectRosterModels(data.models));
            } catch (error) {
                if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '연결을 확인하고 다시 시도해 주세요');
            } finally { if (!controller.signal.aborted) setLoading(false); }
        };
        void load();
        return () => controller.abort();
    }, [revision]);
    return { models, loading, error, retry };
}
