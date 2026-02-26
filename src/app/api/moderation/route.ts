/**
 * OpenAI Moderation API - 콘텐츠 안전성 검사 (BYOK)
 */
import { NextRequest, NextResponse } from 'next/server';
import type { ApiKeys } from '@/lib/ai/config';

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

export async function POST(req: NextRequest) {
    try {
        const { input, apiKeys } = await req.json() as {
            input: string;
            apiKeys?: ApiKeys;
        };

        if (!input || typeof input !== 'string') {
            return NextResponse.json({ error: 'Input text is required' }, { status: 400 });
        }

        const openaiKey = apiKeys?.OPENAI_API_KEY;

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
            console.error('[Moderation API] Error:', response.status, await response.text());
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
        console.error('[Moderation API] Exception:', error);
        return NextResponse.json({
            flagged: false,
            message: 'Moderation check skipped due to error',
        });
    }
}
