// 사회자 AI 기반 Interaction 분석 API (BYOK)
// Phase 3: 백그라운드에서 맥락 기반 정밀 분석

import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createProviders, MODELS, type ApiKeys } from '@/lib/ai/config';

interface AnalyzeInteractionRequest {
    messageId: string;
    content: string;
    author: string;
    authorId: string;
    previousMessages: { author: string; content: string }[];
    participantIds: string[];
    participantNames: { id: string; name: string }[];
    apiKeys?: ApiKeys;
}

interface AnalyzeInteractionResponse {
    messageId: string;
    target: string | null;
    targetName: string | null;
    type: 'SUPPORT' | 'OPPOSE' | 'NEUTRAL';
    confidence: number;
    source: 'ai';
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as AnalyzeInteractionRequest;
        const { messageId, content, author, authorId, previousMessages, participantIds, participantNames, apiKeys } = body;

        if (!messageId || !content || !author) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const keys = apiKeys || {};
        const providers = createProviders(keys);

        // 참가자 목록 (발언자 제외)
        const otherParticipants = participantNames.filter(p => p.id !== authorId);
        const participantList = otherParticipants.map(p => `${p.id}: ${p.name}`).join(', ');

        // 이전 대화 맥락 (최근 3개)
        const recentMessages = previousMessages.slice(-3)
            .map(m => `[${m.author}]: ${m.content.substring(0, 150)}...`)
            .join('\n');

        const prompt = `당신은 토론 분석 전문가입니다. 아래 발언을 분석하여 JSON 형식으로 응답하세요.

## 이전 대화:
${recentMessages || '(없음)'}

## 현재 발언:
[${author}]: ${content}

## 참가자 목록 (발언자 제외):
${participantList || '(없음)'}

## 분석 과제:
1. 이 발언이 누구에게 반응하는지 파악하세요 (이름이 직접 언급되지 않아도 맥락으로 추론)
2. 반응 타입을 판단하세요: SUPPORT(동의/지지), OPPOSE(반대/반박), NEUTRAL(중립/새 의견)

## 응답 형식 (순수 JSON만, 코드블록 없이):
{"targetId": "참가자ID 또는 null", "targetName": "참가자이름 또는 null", "type": "SUPPORT|OPPOSE|NEUTRAL", "confidence": 0.0~1.0, "reason": "한 줄 이유"}`;

        const result = await streamText({
            model: providers.google(MODELS.GEMINI),
            prompt,
            temperature: 0.3,
        });

        // 스트리밍 결과 수집
        let fullText = '';
        for await (const chunk of result.textStream) {
            fullText += chunk;
        }

        // JSON 파싱 시도
        try {
            // 코드블록 제거
            const cleanJson = fullText
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .trim();

            const parsed = JSON.parse(cleanJson);

            const response: AnalyzeInteractionResponse = {
                messageId,
                target: parsed.targetId || null,
                targetName: parsed.targetName || null,
                type: ['SUPPORT', 'OPPOSE', 'NEUTRAL'].includes(parsed.type)
                    ? parsed.type
                    : 'NEUTRAL',
                confidence: typeof parsed.confidence === 'number'
                    ? Math.min(1, Math.max(0, parsed.confidence))
                    : 0.7,
                source: 'ai',
            };

            return NextResponse.json(response);
        } catch (parseError) {
            console.warn('[Moderator Analyze] JSON parse failed:', parseError);
            return NextResponse.json({
                messageId,
                target: null,
                targetName: null,
                type: 'NEUTRAL',
                confidence: 0.3,
                source: 'ai',
            });
        }

    } catch (error) {
        console.error('[Moderator Analyze] Error:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
