// Debate API Route - Multi-Provider AI Integration
// BYOK v1 - 클라이언트에서 apiKeys 수신

import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { getModelForCharacter } from '@/lib/ai/modelMapping';
import { createProviders, MODELS, type ApiKeys } from '@/lib/ai/config';
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
            apiKeys
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
            apiKeys?: ApiKeys;
        };

        if (!type || !participant || !topic) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        const keys = apiKeys || {};

        // Get model for this character (with fallback)
        const { model, modelName, provider, isFallback, maxTokens, temperature: defaultTemp } = getModelForCharacter(participant.id, keys);

        // v4: 모델별 Temperature 적용
        const char = getCharacterById(participant.id);
        const aiModelName = char?.aiModel || modelName;
        const v4Temperature = MODEL_TEMPERATURES[aiModelName] ?? defaultTemp;

        console.log(`[Debate API v4] Character: ${participant.id} → Model: ${modelName} (${provider})${isFallback ? ' [FALLBACK]' : ''} | temp: ${v4Temperature}`);

        // Check if Google API key is configured (minimum requirement)
        if (!keys.GOOGLE_GENERATIVE_AI_API_KEY) {
            return new Response(JSON.stringify({
                content: generateMockResponse(type, participant, topic),
                mock: true,
            }), { headers: { 'Content-Type': 'application/json' } });
        }

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
        const providers = createProviders(keys);

        let lastError: Error | null = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
                    console.log(`[Debate API v4] Retry ${attempt}/${MAX_RETRIES} after ${delayMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }

                const result = await streamText({
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

                console.error(`[Debate API v4] Attempt ${attempt + 1}/${MAX_RETRIES} FAILED (${provider}):`,
                    isOverloaded ? 'Overloaded - will retry' : lastError.message);

                if (!isOverloaded) break;
            }
        }

        // 모든 재시도 실패 → Gemini Fallback
        console.log(`[Debate API v4] All retries failed, using Gemini fallback`);

        try {
            const fallbackResult = await streamText({
                model: providers.google(MODELS.FALLBACK_1),
                system: systemPrompt,
                prompt: topic,
                temperature: 0.7,
            });

            return fallbackResult.toTextStreamResponse();
        } catch (fallbackError) {
            console.error('[Debate API v4] FALLBACK_1 failed, trying FALLBACK_2');
            const fallback2Result = await streamText({
                model: providers.google(MODELS.FALLBACK_2),
                system: systemPrompt,
                prompt: topic,
                temperature: 0.7,
            });

            return fallback2Result.toTextStreamResponse();
        }


    } catch (error) {
        console.error('Debate API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({
            error: 'Failed to generate response',
            details: errorMessage,
        }), { status: 500 });
    }
}


function generateMockResponse(type: 'opening' | 'debate' | 'closing', participant: Participant, topic: string): string {
    if (type === 'opening') {
        return `안녕하세요, ${participant.job} ${participant.name}입니다.\n\n"${topic}" 주제에 대해 ${participant.styleName}의 관점에서 말씀드리겠습니다.\n\n저는 이 이슈를 세 가지 측면에서 바라봅니다.\n\n첫째, 현황과 문제점을 정확히 인식해야 합니다.\n둘째, 다양한 이해관계자의 입장을 균형 있게 고려해야 합니다.\n셋째, 장기적 관점에서 지속 가능한 해결책을 모색해야 합니다.`;
    }
    if (type === 'closing') {
        return `오늘 토론을 마무리하며, ${participant.styleName}로서 핵심을 정리드리겠습니다.\n\n이 주제에 대해 다양한 시각이 제시되었지만, 저는 처음 입장을 유지합니다.\n\n감사합니다.`;
    }
    return `앞서 말씀하신 논점에 대해 의견을 드리겠습니다.\n\n${participant.styleName}으로서, 저는 조금 다른 시각을 가지고 있습니다.\n\n그 주장은 흥미롭지만, 우리가 간과하고 있는 측면이 있습니다.`;
}
