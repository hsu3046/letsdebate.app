// Analyze API Route - Background Analysis (BYOK)
import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createProviders, MODELS, type ApiKeys } from '@/lib/ai/config';

interface AnalyzeRequest {
    topic: string;
    messages: { author: string; content: string }[];
    participants: { name: string; job: string }[];
    existingKeywords?: string[];
    existingSummary?: string;
    apiKeys?: ApiKeys;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as AnalyzeRequest;
        const { topic, messages, participants, existingKeywords, existingSummary, apiKeys } = body;

        if (!topic || !messages || messages.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const keys = apiKeys || {};

        if (!keys.GOOGLE_GENERATIVE_AI_API_KEY) {
            return NextResponse.json({ keywords: [], highlights: [], summary: '', fallback: true });
        }

        const providers = createProviders(keys);

        const messagesText = messages.map(m => `[${m.author}]: ${m.content}`).join('\n\n');
        const existingInfo = existingKeywords && existingKeywords.length > 0
            ? `\n\n기존 키워드: ${existingKeywords.join(', ')}` : '';
        const summaryContext = existingSummary ? `\n\n이전 요약: ${existingSummary}` : '';

        const prompt = `당신은 토론 분석 전문가입니다.\n\n토론 주제: "${topic}"\n${existingInfo}${summaryContext}\n\n다음 토론 발언들을 분석해주세요:\n\n${messagesText}\n\n다음 형식의 JSON으로 응답해주세요:\n{\n  "keywords": ["핵심키워드1", "핵심키워드2", ...],\n  "highlights": [\n    {\n      "author": "발언자명",\n      "quote": "인상적인 발언 (30자 이내로 요약)",\n      "reason": "선정 이유 (20자 이내)"\n    }\n  ],\n  "summary": "지금까지 토론 내용 요약 (100자 이내)"\n}\n\nJSON만 반환하세요.`;

        const result = await generateText({
            model: providers.google(MODELS.GEMINI),
            prompt,
            maxOutputTokens: 500,
            temperature: 0.3,
        });

        try {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return NextResponse.json({
                    keywords: parsed.keywords || [],
                    highlights: parsed.highlights || [],
                    summary: parsed.summary || '',
                });
            }
        } catch (parseErr) {
            console.warn('[Analyze API] JSON parse failed:', parseErr);
        }

        return NextResponse.json({ keywords: [], highlights: [], summary: '' });

    } catch (error) {
        console.error('[Analyze API] Error:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
