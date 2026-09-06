import { AI_SERVICE_UNAVAILABLE, isAIServiceConfigured } from '@/lib/ai/service';
// Debate API Route - Multi-Provider AI Integration

import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { getModelForCharacter } from '@/lib/ai/modelMapping';
import { createProviders, MODELS } from '@/lib/ai/config';
// v4 프롬프트 시스템
import {
    buildPrompt,
    MODEL_TEMPERATURES,
    type DebateMode,
    type PhaseType,
    type DirectorOutput,
    type CoachOutput,
    type TurnInfo,
    MODEL_NAME_TO_ID
} from '@/lib/prompts/v4';
import { getCharacterById } from '@/lib/characters';
import type { Participant, Topic, Stance } from '@/lib/types';


export async function POST(request: NextRequest) {
    if (!isAIServiceConfigured()) return Response.json({ error: AI_SERVICE_UNAVAILABLE }, { status: 503 });
    try {
        const body = await request.json();
        const {
            type,
            participant,
            topic,
            topicData,
            stance,
            context,
            previousMessages,
            turnNumber,
            allParticipantIds,
            openingSummary,
            debateMode,
            directorStrategy,
            coachData,
            turnInfo,
            lang = 'ko',
        } = body as {
            type: 'opening' | 'debate' | 'closing';
            participant: Participant;
            topic: string;
            topicData?: Topic;
            stance?: Stance;
            context?: string;
            previousMessages?: { author: string; content: string }[];
            turnNumber?: number;
            allParticipantIds?: string[];
            openingSummary?: string;
            debateMode?: DebateMode;
            directorStrategy?: DirectorOutput;
            coachData?: CoachOutput;
            turnInfo?: TurnInfo;
            lang?: string;
        };

        if (!type || !participant || !topic) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        // Get model for this character (with fallback)
        const { model, modelName, provider, isFallback, maxTokens, temperature: defaultTemp } = getModelForCharacter(participant.id);

        // v4: 모델별 Temperature 적용
        const char = getCharacterById(participant.id);
        const aiModelName = char?.aiModel || modelName;
        const v4Temperature = MODEL_TEMPERATURES[aiModelName] ?? defaultTemp;

        console.log(`[Debate API v4] Character: ${participant.id} → Model: ${modelName} (${provider})${isFallback ? ' [FALLBACK]' : ''} | temp: ${v4Temperature}`);

        // ===== v4 프롬프트 시스템 적용 =====
        const mode: DebateMode = debateMode || 'roundtable';
        const modelId = MODEL_NAME_TO_ID[aiModelName] || 'chatgpt';

        let referenceContext: string | undefined;
        if (previousMessages && previousMessages.length > 0) {
            const recentMessages = previousMessages.slice(-3);
            referenceContext = recentMessages
                .map(m => `[${m.author}]: ${m.content.slice(0, 300)}${m.content.length > 300 ? '...' : ''}`)
                .join('\n');
        }

        let systemPrompt = buildPrompt({
            modelId,
            lang: lang as any,
            mode,
            phase: type as PhaseType,
            directorData: directorStrategy,
            coachData,
            turnInfo,
            referenceContext,
        });

        if (openingSummary && (type === 'debate' || type === 'closing')) {
            systemPrompt = `[🎯 당신의 오프닝 핵심]\n"${openingSummary}"\n위 입장을 끝까지 유지하세요.\n\n${systemPrompt}`;
        }

        // ===== Retry 로직 (지수 백오프) =====
        const MAX_RETRIES = 3;
        const INITIAL_DELAY_MS = 1000;
        const providers = createProviders();

        let lastError: Error | null = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
                    console.log(`[Debate API v4] Retry ${attempt}/${MAX_RETRIES} after ${delayMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }

                const result = await streamText({
                            onError: () => { console.error('AI 모델 응답을 완료하지 못했습니다.'); },
                    model: model,
                    system: systemPrompt,
                    prompt: topic,
                    temperature: MODEL_TEMPERATURES[aiModelName] ?? defaultTemp,
                });

                return result.toTextStreamResponse();
            } catch (modelError) {
                lastError = modelError instanceof Error ? modelError : new Error(String(modelError));

                const isOverloaded = lastError.message.includes('overloaded') ||
                    lastError.message.includes('529') ||
                    lastError.message.includes('Overloaded');

                console.error(`[Debate API v4] Attempt ${attempt + 1}/${MAX_RETRIES} FAILED (${provider}):`);

                if (!isOverloaded) break;
            }
        }

        // 모든 재시도 실패 → Gemini Fallback
        console.log(`[Debate API v4] All retries failed, using Gemini fallback`);

        try {
            const fallbackResult = await streamText({
                            onError: () => { console.error('AI 모델 응답을 완료하지 못했습니다.'); },
                model: providers.google(MODELS.FALLBACK_1),
                system: systemPrompt,
                prompt: topic,
                temperature: 0.7,
            });

            return fallbackResult.toTextStreamResponse();
        } catch {
            console.error('[Debate API v4] FALLBACK_1 failed, trying FALLBACK_2');
            const fallback2Result = await streamText({
                            onError: () => { console.error('AI 모델 응답을 완료하지 못했습니다.'); },
                model: providers.google(MODELS.FALLBACK_2),
                system: systemPrompt,
                prompt: topic,
                temperature: 0.7,
            });

            return fallback2Result.toTextStreamResponse();
        }


    } catch (error) {
        console.error('Debate API Error:');
        return new Response(JSON.stringify({
            error: 'Failed to generate response',
        }), { status: 500 });
    }
}
