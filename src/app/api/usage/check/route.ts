// 사용량 조회 API
import { NextRequest, NextResponse } from 'next/server';
import { getServerRemainingUsage, DAILY_LIMIT } from '@/lib/usageLimitServer';

export async function POST(request: NextRequest) {
    try {
        const { visitorId } = await request.json();

        if (!visitorId) {
            return NextResponse.json(
                { error: 'visitorId is required' },
                { status: 400 }
            );
        }

        const remaining = await getServerRemainingUsage(visitorId);

        return NextResponse.json({
            remaining,
            limit: DAILY_LIMIT,
            success: true,
        });
    } catch (error) {
        console.error('Usage check error:', error);
        // 에러 시 기본값 반환 (graceful degradation)
        return NextResponse.json({
            remaining: DAILY_LIMIT,
            limit: DAILY_LIMIT,
            success: true,
            fallback: true,
        });
    }
}
