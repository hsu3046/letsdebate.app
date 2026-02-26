// Vercel KV 기반 서버 측 사용량 제한 유틸리티
import { kv } from '@vercel/kv';

export const DAILY_LIMIT = 10;

interface RateLimitRecord {
    count: number;
    resetAt: number; // Unix timestamp (KST 자정)
}

/**
 * 다음 KST 자정의 Unix timestamp 계산
 */
function getNextMidnightKST(): number {
    const now = new Date();
    // KST = UTC + 9시간
    const kstOffset = 9 * 60 * 60 * 1000;
    const nowKst = now.getTime() + kstOffset;
    const todayMidnightKst = Math.floor(nowKst / 86400000) * 86400000;
    const nextMidnightKst = todayMidnightKst + 86400000;

    // UTC timestamp로 변환
    return nextMidnightKst - kstOffset;
}

/**
 * Rate limit 키 생성
 */
function getRateLimitKey(visitorId: string): string {
    return `ratelimit:${visitorId}`;
}

/**
 * 남은 사용 횟수 조회 (서버 측)
 */
export async function getServerRemainingUsage(visitorId: string): Promise<number> {
    try {
        const key = getRateLimitKey(visitorId);
        const record = await kv.get<RateLimitRecord>(key);

        if (!record) {
            return DAILY_LIMIT;
        }

        // 리셋 시간이 지났으면 초기화
        if (Date.now() >= record.resetAt) {
            return DAILY_LIMIT;
        }

        return Math.max(0, DAILY_LIMIT - record.count);
    } catch (error) {
        console.error('KV get error:', error);
        // KV 에러 시 로컬 폴백 허용
        return DAILY_LIMIT;
    }
}

/**
 * 사용량 차감 (서버 측)
 * @returns true면 사용 가능, false면 제한 초과
 */
export async function consumeServerUsage(visitorId: string, ip?: string): Promise<{
    success: boolean;
    remaining: number;
    resetAt: number;
}> {
    try {
        const key = getRateLimitKey(visitorId);
        const now = Date.now();
        const nextMidnight = getNextMidnightKST();

        let record = await kv.get<RateLimitRecord>(key);

        // 레코드가 없거나 리셋 시간이 지났으면 초기화
        if (!record || now >= record.resetAt) {
            record = {
                count: 0,
                resetAt: nextMidnight,
            };
        }

        // 제한 체크
        if (record.count >= DAILY_LIMIT) {
            return {
                success: false,
                remaining: 0,
                resetAt: record.resetAt,
            };
        }

        // 차감
        record.count += 1;

        // TTL 계산 (다음 자정까지 + 1시간 여유)
        const ttlSeconds = Math.ceil((record.resetAt - now) / 1000) + 3600;

        await kv.set(key, record, { ex: ttlSeconds });

        // IP도 함께 기록 (선택적)
        if (ip) {
            await kv.set(`ip:${key}`, ip, { ex: ttlSeconds });
        }

        return {
            success: true,
            remaining: DAILY_LIMIT - record.count,
            resetAt: record.resetAt,
        };
    } catch (error) {
        console.error('KV consume error:', error);
        // KV 에러 시 일단 허용 (graceful degradation)
        return {
            success: true,
            remaining: DAILY_LIMIT,
            resetAt: getNextMidnightKST(),
        };
    }
}

/**
 * 사용 가능 여부 체크 (차감 없음)
 */
export async function canUseServerDebate(visitorId: string): Promise<boolean> {
    const remaining = await getServerRemainingUsage(visitorId);
    return remaining > 0;
}
