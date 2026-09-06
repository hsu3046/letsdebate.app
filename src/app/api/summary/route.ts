import { AI_SERVICE_UNAVAILABLE, isAIServiceConfigured } from '@/lib/ai/service';
import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { getModeratorModel } from '@/lib/ai/modelMapping';
import { getSummaryPrompt } from '@/lib/prompts/v4';
import { createProviders, MODELS } from '@/lib/ai/config';
import type { Participant } from '@/lib/types';

export async function POST(request: NextRequest) {
    if (!isAIServiceConfigured()) return Response.json({ error: AI_SERVICE_UNAVAILABLE }, { status: 503 });
    try {
        const body = await request.json();
        const { topic, messages, participants } = body as {
            topic: string;
            messages: { author: string; content: string }[];
            participants: Participant[];
        };

        if (!topic || !messages || !participants) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }
        const { model, modelName, provider, isFallback } = getModeratorModel();

        console.log(`[Summary API] Using model: ${modelName} (${provider})${isFallback ? ' [FALLBACK]' : ''}`);

        const prompt = getSummaryPrompt(topic, messages, participants);

        try {
            const result = streamText({
                            onError: () => { console.error('AI 모델 응답을 완료하지 못했습니다.'); }, model, prompt });
            return result.toTextStreamResponse();
        } catch {
            console.error(`[Summary API] Model ${modelName} failed, using Gemini fallback:`);
            const providers = createProviders();
            const fallbackResult = streamText({
                            onError: () => { console.error('AI 모델 응답을 완료하지 못했습니다.'); },
                model: providers.google(MODELS.GEMINI),
                prompt,
            });
            return fallbackResult.toTextStreamResponse();
        }

    } catch (error) {
        console.error('Summary API Error:');
        return new Response(JSON.stringify({ error: 'Failed to generate summary' }), { status: 500 });
    }
}
