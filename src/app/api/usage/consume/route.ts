// 사용량 차감 API
import { NextRequest, NextResponse } from 'next/server';
import { consumeServerUsage, DAILY_LIMIT } from '@/lib/usageLimitServer';

export async function POST(request: NextRequest) {
    try {
        const { visitorId } = await request.json();

        if (!visitorId) {
            return NextResponse.json(
                { error: 'visitorId is required' },
                { status: 400 }
            );
        }

        // 클라이언트 IP 추출
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown';

        const result = await consumeServerUsage(visitorId, ip);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                remaining: 0,
                limit: DAILY_LIMIT,
                resetAt: result.resetAt,
                message: '오늘의 무료 사용 횟수를 모두 사용했습니다.',
            }, { status: 429 }); // Too Many Requests
        }

        return NextResponse.json({
            success: true,
            remaining: result.remaining,
            limit: DAILY_LIMIT,
            resetAt: result.resetAt,
        });
    } catch (error) {
        console.error('Usage consume error:', error);
        // 에러 시 일단 허용 (graceful degradation)
        return NextResponse.json({
            success: true,
            remaining: DAILY_LIMIT,
            limit: DAILY_LIMIT,
            fallback: true,
        });
    }
}
