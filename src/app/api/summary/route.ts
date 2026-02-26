// Summary API Route - BYOK
import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { getModeratorModel } from '@/lib/ai/modelMapping';
import { getSummaryPrompt } from '@/lib/prompts/v4';
import { createProviders, MODELS, type ApiKeys } from '@/lib/ai/config';
import type { Participant } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { topic, messages, participants, apiKeys } = body as {
            topic: string;
            messages: { author: string; content: string }[];
            participants: Participant[];
            apiKeys?: ApiKeys;
        };

        if (!topic || !messages || !participants) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        const keys = apiKeys || {};
        const { model, modelName, provider, isFallback } = getModeratorModel(keys);

        console.log(`[Summary API] Using model: ${modelName} (${provider})${isFallback ? ' [FALLBACK]' : ''}`);

        if (!keys.GOOGLE_GENERATIVE_AI_API_KEY) {
            return new Response(JSON.stringify({
                content: generateMockSummary(topic, participants),
                mock: true,
            }), { headers: { 'Content-Type': 'application/json' } });
        }

        const prompt = getSummaryPrompt(topic, messages, participants);

        try {
            const result = streamText({ model, prompt });
            return result.toTextStreamResponse();
        } catch (modelError) {
            console.error(`[Summary API] Model ${modelName} failed, using Gemini fallback:`, modelError);
            const providers = createProviders(keys);
            const fallbackResult = streamText({
                model: providers.google(MODELS.GEMINI),
                prompt,
            });
            return fallbackResult.toTextStreamResponse();
        }

    } catch (error) {
        console.error('Summary API Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to generate summary' }), { status: 500 });
    }
}

function generateMockSummary(topic: string, participants: Participant[]): string {
    const names = participants.map(p => p.name).join(', ');
    return `오늘 "${topic}" 주제로 ${names}님이 토론을 진행했습니다.\n\n[핵심 쟁점]\n• 데이터 기반 vs 인간 중심 가치\n• 급진적 변화 vs 점진적 개선\n• 이상적 비전 vs 현실적 실행\n\n다양한 관점이 제시되었습니다. 감사합니다!`;
}
