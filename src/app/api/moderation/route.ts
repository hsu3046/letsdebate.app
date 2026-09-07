import { withAIRequest } from '@/lib/ai/access/guard';
/**
 * OpenAI Moderation API - 콘텐츠 안전성 검사
 */
import { NextRequest, NextResponse } from 'next/server';
import 'server-only';

interface ModerationResult {
    flagged: boolean;
    categories: Record<string, boolean>;
    category_scores: Record<string, number>;
}

interface ModerationResponse {
    id: string;
    model: string;
    results: ModerationResult[];
}

async function handlePost(req: NextRequest) {
    try {
        const { input } = await req.json() as {
            input: string;
        };

        if (!input || typeof input !== 'string') {
            return NextResponse.json({ error: 'Input text is required' }, { status: 400 });
        }

        const openaiKey = process.env.OPENAI_API_KEY;

        if (!openaiKey) {
            // API 키 없으면 moderation 스킵
            return NextResponse.json({
                flagged: false,
                message: 'Moderation check skipped (no API key)',
            });
        }

        const response = await fetch('https://api.openai.com/v1/moderations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input }),
        });

        if (!response.ok) {
            console.error('[Moderation API] Error:', response.status);
            return NextResponse.json({
                flagged: false,
                message: 'Moderation check skipped due to API error',
            });
        }

        const data: ModerationResponse = await response.json();
        const result = data.results[0];

        if (result.flagged) {
            const flaggedCategories = Object.entries(result.categories)
                .filter(([, flagged]) => flagged)
                .map(([category]) => category);

            console.log(`[Moderation API] Flagged: ${flaggedCategories.join(', ')}`);

            return NextResponse.json({
                flagged: true,
                categories: flaggedCategories,
                message: '이 내용은 서비스 이용 정책에 위반됩니다.',
            });
        }

        return NextResponse.json({
            flagged: false,
            message: 'Content is safe',
        });

    } catch (error) {
        console.error('[Moderation API] Request failed');
        return NextResponse.json({
            flagged: false,
            message: 'Moderation check skipped due to error',
        });
    }
}

export const POST = withAIRequest('assist', handlePost);

export const maxDuration = 300;
