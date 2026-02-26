/**
 * Opening Summary API - BYOK
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createProviders, MODELS, type ApiKeys } from '@/lib/ai/config';

interface SummarizeRequest {
    participantId: string;
    participantName: string;
    content: string;
    apiKeys?: ApiKeys;
}

export async function POST(request: NextRequest) {
    try {
        const { participantId, participantName, content, apiKeys } = await request.json() as SummarizeRequest;

        if (!participantId || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const keys = apiKeys || {};

        if (!keys.GOOGLE_GENERATIVE_AI_API_KEY) {
            const fallbackSummary = content.substring(0, 50) + '...';
            return NextResponse.json({ summary: fallbackSummary, fallback: true });
        }

        const providers = createProviders(keys);

        const prompt = `다음 토론 오프닝 발언을 **핵심 주장 1문장**으로 요약해주세요.\n\n발언자: ${participantName}\n발언 내용:\n"${content}"\n\n[규칙]\n- 20자~40자 이내로 간결하게\n- "~이/가 중요하다", "~해야 한다" 같은 주장 형태로\n- 따옴표 없이 문장만 출력\n\n예시 출력: 비용보다 문화적 가치가 더 중요하다`;

        const result = await generateText({
            model: providers.google(MODELS.GEMINI),
            prompt,
            maxOutputTokens: 60,
            temperature: 0.3,
        });

        const summary = result.text.trim().replace(/^["']|["']$/g, '');

        console.log(`[Opening Summary] ${participantName}: ${summary}`);

        return NextResponse.json({ participantId, summary });

    } catch (error) {
        console.error('[Opening Summary] Error:', error);
        return NextResponse.json({ summary: '', error: true });
    }
}
