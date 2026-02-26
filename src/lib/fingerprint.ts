// FingerprintJS 유틸리티 - 브라우저 고유 ID 생성
import FingerprintJS from '@fingerprintjs/fingerprintjs';

let cachedVisitorId: string | null = null;

/**
 * 브라우저 고유 visitorId를 가져옵니다.
 * 캐싱되어 있으면 캐시된 값을 반환합니다.
 */
export async function getVisitorId(): Promise<string> {
    if (typeof window === 'undefined') {
        return 'server-side';
    }

    // 캐시된 값이 있으면 반환
    if (cachedVisitorId) {
        return cachedVisitorId;
    }

    // localStorage에 저장된 값이 있으면 사용
    const stored = localStorage.getItem('letsdebate_visitor_id');
    if (stored) {
        cachedVisitorId = stored;
        return stored;
    }

    try {
        // FingerprintJS로 새 ID 생성
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        cachedVisitorId = result.visitorId;

        // localStorage에 저장
        localStorage.setItem('letsdebate_visitor_id', cachedVisitorId);

        return cachedVisitorId;
    } catch (error) {
        console.error('FingerprintJS error:', error);
        // 실패 시 랜덤 ID 생성
        const fallbackId = `fallback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        cachedVisitorId = fallbackId;
        localStorage.setItem('letsdebate_visitor_id', fallbackId);
        return fallbackId;
    }
}

/**
 * visitorId 캐시 초기화 (테스트용)
 */
export function clearVisitorIdCache(): void {
    cachedVisitorId = null;
    if (typeof window !== 'undefined') {
        localStorage.removeItem('letsdebate_visitor_id');
    }
}
