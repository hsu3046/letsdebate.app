/**
 * Director API v4 - 토론 전략 생성
 * @description Director AI가 토론 주제를 분석하여 각 AI에게 역할/입장 부여
 * BYOK: 클라이언트에서 apiKeys 수신
 */

import { createProviders, MODELS, type ApiKeys } from '@/lib/ai/config';
import { CHARACTERS } from '@/lib/characters';
import { generateText } from 'ai';
import { buildDirectorSystemPrompt } from '@/lib/prompts/v4';
import type { DirectorOutput } from '@/lib/prompts/v4';

export async function POST(request: Request) {
    try {
        const { topic, participants, mode = '1v1', apiKeys } = await request.json() as {
            topic: string;
            participants: string[];
            mode?: '1v1' | 'roundtable';
            apiKeys?: ApiKeys;
        };

        if (!topic || !participants || participants.length < 2) {
            return Response.json(
                { error: 'Invalid input: topic and at least 2 participants required' },
                { status: 400 }
            );
        }

        if (!apiKeys?.GOOGLE_GENERATIVE_AI_API_KEY) {
            return Response.json(
                { error: 'API key not configured', fallback: true },
                { status: 400 }
            );
        }

        const providers = createProviders(apiKeys);

        console.log('[Director v4] Topic:', topic);
        console.log('[Director v4] Participants:', participants);
        console.log('[Director v4] Mode:', mode);

        // v4 Director 프롬프트 생성
        const systemPrompt = buildDirectorSystemPrompt(topic, participants, mode);

        // Google으로 전략 생성
        const { text } = await generateText({
            model: providers.google(MODELS.DIRECTOR),
            prompt: systemPrompt,
            maxOutputTokens: 3000,
        });

        console.log('[Director v4] Raw output:', text);

        // JSON 파싱
        const parsed = parseDirectorResponse(text, participants);

        if (!parsed) {
            console.error('[Director v4] Failed to parse, returning fallback');
            return Response.json(
                { error: 'Failed to parse Director output', fallback: true },
                { status: 500 }
            );
        }

        console.log('[Director v4] Parsed strategies:', parsed);

        return Response.json(parsed);

    } catch (error) {
        console.error('[Director v4] Error:', error);
        return Response.json(
            { error: 'Director API failed', fallback: true },
            { status: 500 }
        );
    }
}

/**
 * Director 응답 파싱
 */
function parseDirectorResponse(
    text: string,
    participants: string[]
): { strategies: Record<string, DirectorOutput>; topic_context?: string } | null {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.assignments) {
            const strategies: Record<string, DirectorOutput> = {};
            const assignmentKeys = Object.keys(parsed.assignments);
            console.log(`[Director v4] Received keys: [${assignmentKeys.join(', ')}] | Expected: [${participants.join(', ')}]`);

            for (const [key, value] of Object.entries(parsed.assignments)) {
                const assignment = value as {
                    role?: string;
                    stance?: string;
                    angle?: string;
                    secret_mission?: string;
                    win_condition?: string;
                };

                let participant = participants.find(p =>
                    p.toLowerCase() === key.toLowerCase() ||
                    p.toLowerCase().includes(key.toLowerCase()) ||
                    key.toLowerCase().includes(p.toLowerCase())
                );

                if (!participant) {
                    const matchedChar = CHARACTERS.find(c =>
                        c.aiModel.toLowerCase() === key.toLowerCase() ||
                        key.toLowerCase().includes(c.aiModel.toLowerCase())
                    );
                    if (matchedChar) {
                        participant = participants.find(p => p === matchedChar.name);
                    }
                }

                if (!participant) {
                    const char = CHARACTERS.find(c =>
                        c.id.toLowerCase() === key.toLowerCase() ||
                        c.name.toLowerCase() === key.toLowerCase()
                    );
                    if (char) {
                        participant = participants.find(p => p === char.name);
                    }
                }

                if (!participant) {
                    console.warn(`[Director v4] Skipping unknown participant: "${key}" (expected: ${participants.join(', ')})`);
                    continue;
                }

                strategies[participant] = {
                    role: (assignment.role || 'neutral') as DirectorOutput['role'],
                    stance: assignment.stance || '',
                    core_slogan: (assignment as any).core_slogan || '',
                    angle: assignment.angle || '',
                    secret_mission: assignment.secret_mission || '',
                    win_condition: assignment.win_condition || '',
                };
            }

            return {
                strategies,
                topic_context: parsed.topic_context,
            };
        }

        return null;
    } catch (e) {
        console.error('[Director v4] Parse error:', e);
        return null;
    }
}
