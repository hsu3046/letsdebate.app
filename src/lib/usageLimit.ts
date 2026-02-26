// 사용량 제한 관리 유틸리티 (localStorage 기반 - Option A)

// 환경변수로 오버라이드 가능 (로컬 개발 시 .env.local에 NEXT_PUBLIC_DAILY_LIMIT=999 설정)
export const DAILY_LIMIT = parseInt(process.env.NEXT_PUBLIC_DAILY_LIMIT || '10', 10);

interface UsageData {
    count: number;
    resetDate: string; // YYYY-MM-DD (KST)
}

const STORAGE_KEY = 'letsdebate_usage';

/**
 * 현재 서울 날짜를 YYYY-MM-DD 형식으로 반환
 */
function getSeoulDate(): string {
    const now = new Date();
    // KST = UTC + 9시간
    const kstOffset = 9 * 60; // minutes
    const utcMinutes = now.getTime() / 60000 + now.getTimezoneOffset();
    const kstDate = new Date((utcMinutes + kstOffset) * 60000);

    const year = kstDate.getFullYear();
    const month = String(kstDate.getMonth() + 1).padStart(2, '0');
    const day = String(kstDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * localStorage에서 사용량 데이터 로드
 */
function loadUsageData(): UsageData {
    if (typeof window === 'undefined') {
        return { count: 0, resetDate: getSeoulDate() };
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return { count: 0, resetDate: getSeoulDate() };
        }
        return JSON.parse(stored);
    } catch {
        return { count: 0, resetDate: getSeoulDate() };
    }
}

/**
 * localStorage에 사용량 데이터 저장
 */
function saveUsageData(data: UsageData): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        console.error('Failed to save usage data');
    }
}

/**
 * 오늘 남은 횟수 조회
 */
export function getRemainingUsage(): number {
    const today = getSeoulDate();
    const data = loadUsageData();

    // 날짜가 바뀌었으면 리셋
    if (data.resetDate !== today) {
        return DAILY_LIMIT;
    }

    return Math.max(0, DAILY_LIMIT - data.count);
}

/**
 * 현재 사용 횟수 조회
 */
export function getCurrentUsage(): number {
    const today = getSeoulDate();
    const data = loadUsageData();

    // 날짜가 바뀌었으면 리셋
    if (data.resetDate !== today) {
        return 0;
    }

    return data.count;
}

/**
 * 사용량 차감 (토론 시작 시 호출)
 * @returns true면 사용 가능, false면 제한 초과
 */
export function consumeUsage(): boolean {
    const today = getSeoulDate();
    let data = loadUsageData();

    // 날짜가 바뀌었으면 리셋
    if (data.resetDate !== today) {
        data = { count: 0, resetDate: today };
    }

    // 제한 체크
    if (data.count >= DAILY_LIMIT) {
        return false;
    }

    // 차감
    data.count += 1;
    saveUsageData(data);

    return true;
}

/**
 * 사용 가능 여부 체크 (UI 표시용, 차감 없음)
 */
export function canUseDebate(): boolean {
    return getRemainingUsage() > 0;
}

/**
 * 다음 리셋까지 남은 시간 (밀리초)
 */
export function getTimeUntilReset(): number {
    const now = new Date();
    // KST 기준 다음 자정 계산
    const kstOffset = 9 * 60 * 60 * 1000; // 9 hours in ms
    const nowKst = now.getTime() + kstOffset;
    const todayMidnightKst = Math.floor(nowKst / 86400000) * 86400000;
    const nextMidnightKst = todayMidnightKst + 86400000;

    return nextMidnightKst - nowKst;
}

/**
 * 다음 리셋 시간 포맷팅 (HH:MM 형식)
 */
export function getResetTimeString(): string {
    const msUntilReset = getTimeUntilReset();
    const hours = Math.floor(msUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}시간 ${minutes}분 후 리셋`;
    }
    return `${minutes}분 후 리셋`;
}

// ============================================
// 서버 API 연동 (하이브리드 모드)
// ============================================

import { getVisitorId } from './fingerprint';

/**
 * 서버에서 남은 횟수 조회 (실패 시 localStorage 폴백)
 */
export async function getServerRemainingUsage(): Promise<number> {
    try {
        const visitorId = await getVisitorId();
        const response = await fetch('/api/usage/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorId }),
        });

        if (!response.ok) {
            throw new Error('Server error');
        }

        const data = await response.json();
        return data.remaining;
    } catch (error) {
        console.warn('Server usage check failed, using localStorage:', error);
        return getRemainingUsage();
    }
}

/**
 * 서버에서 사용량 차감 (실패 시 localStorage 폴백)
 * @returns true면 사용 가능, false면 제한 초과
 */
export async function consumeServerUsage(): Promise<boolean> {
    try {
        const visitorId = await getVisitorId();
        const response = await fetch('/api/usage/consume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorId }),
        });

        const data = await response.json();

        // localStorage도 동기화
        if (data.success) {
            consumeUsage(); // localStorage에도 차감
        }

        return data.success;
    } catch (error) {
        console.warn('Server usage consume failed, using localStorage:', error);
        return consumeUsage();
    }
}
