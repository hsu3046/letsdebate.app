// Follow-up Questions API Route - BYOK
import { NextRequest } from 'next/server';
import { generateText } from 'ai';
import { getModeratorModel } from '@/lib/ai/modelMapping';
import { createProviders, MODELS, type ApiKeys } from '@/lib/ai/config';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { topic, summary, participantNames, apiKeys } = body as {
            topic: string;
            summary: string;
            participantNames?: string[];
            apiKeys?: ApiKeys;
        };

        if (!topic || !summary) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        const keys = apiKeys || {};
        const { model, modelName, provider, isFallback } = getModeratorModel(keys);

        console.log(`[Questions API] Using model: ${modelName} (${provider})${isFallback ? ' [FALLBACK]' : ''}`);

        if (!keys.GOOGLE_GENERATIVE_AI_API_KEY) {
            return new Response(JSON.stringify({
                questions: [
                    '이 주제에서 우리가 간과한 관점은 없었을까?',
                    '다른 문화권에서는 이 문제를 어떻게 바라볼까?',
                    '10년 후, 오늘의 토론을 어떻게 평가하게 될까?',
                ],
                mock: true,
            }), { headers: { 'Content-Type': 'application/json' } });
        }

        const prompt = `당신은 토론 사회자입니다. 다음 토론 내용을 바탕으로, 참가자들과 청중이 더 깊이 생각해볼 수 있는 후속 질문 3개를 생성해주세요.\n\n토론 주제: "${topic}"\n\n토론 요약:\n${summary}\n\n[지시사항]\n1. 토론에서 다루어졌지만 더 탐구가 필요한 측면을 질문으로\n2. 토론에서 간과된 새로운 관점이나 시각을 제시하는 질문\n3. 이 주제의 미래나 사회적 함의에 대한 질문\n\n[응답 형식]\nJSON 배열로만 응답하세요. 다른 텍스트는 포함하지 마세요.\n["첫 번째 질문?", "두 번째 질문?", "세 번째 질문?"]\n\n반드시 유효한 JSON 배열만 출력하세요.`;

        try {
            const result = await generateText({ model, prompt, temperature: 0.7 });

            let questions: string[];
            try {
                const jsonMatch = result.text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    questions = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON array found');
                }
            } catch {
                questions = [
                    '이 주제에서 우리가 간과한 관점은 없었을까?',
                    '다른 문화권에서는 이 문제를 어떻게 바라볼까?',
                    '10년 후, 오늘의 토론을 어떻게 평가하게 될까?',
                ];
            }

            return new Response(JSON.stringify({ questions: questions.slice(0, 3) }), { headers: { 'Content-Type': 'application/json' } });

        } catch (modelError) {
            console.error(`[Questions API] Model ${modelName} failed, using Gemini fallback:`, modelError);
            const providers = createProviders(keys);

            const fallbackResult = await generateText({
                model: providers.google(MODELS.GEMINI),
                prompt,
                temperature: 0.7,
            });

            let questions: string[];
            try {
                const jsonMatch = fallbackResult.text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    questions = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No JSON array found');
                }
            } catch {
                questions = [
                    '이 주제에서 우리가 간과한 관점은 없었을까?',
                    '다른 문화권에서는 이 문제를 어떻게 바라볼까?',
                    '10년 후, 오늘의 토론을 어떻게 평가하게 될까?',
                ];
            }

            return new Response(JSON.stringify({ questions: questions.slice(0, 3) }), { headers: { 'Content-Type': 'application/json' } });
        }

    } catch (error) {
        console.error('Questions API Error:', error);
        return new Response(JSON.stringify({
            questions: [
                '이 주제에서 우리가 간과한 관점은 없었을까?',
                '다른 문화권에서는 이 문제를 어떻게 바라볼까?',
                '10년 후, 오늘의 토론을 어떻게 평가하게 될까?',
            ],
        }), { headers: { 'Content-Type': 'application/json' } });
    }
}
