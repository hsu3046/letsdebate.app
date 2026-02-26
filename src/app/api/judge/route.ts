/**
 * Judge API v4 - AI 심판 채점
 * BYOK: 클라이언트에서 apiKeys 수신
 */

import { createProviders, MODELS, type ApiKeys } from '@/lib/ai/config';
import { generateText } from 'ai';
import {
    buildBatchJudgePrompt,
    calculateFinalScore,
    determineMVP,
} from '@/lib/prompts/v4/judge';
import type {
    JudgeInput,
    JudgeResult,
    JudgeAPIResponse,
    RawScore,
    PenaltyFlags,
} from '@/lib/prompts/v4/judge';

interface JudgeRequestBody {
    historyContext: string;
    players: JudgeInput[];
    apiKeys?: ApiKeys;
}

export async function POST(request: Request) {
    try {
        const { historyContext, players, apiKeys } = await request.json() as JudgeRequestBody;

        if (!historyContext || !players || players.length < 2) {
            return Response.json(
                { error: 'Invalid input: historyContext and at least 2 players required' },
                { status: 400 }
            );
        }

        const providers = createProviders(apiKeys || {});

        console.log('[Judge v4] Evaluating', players.length, 'participants');

        const prompt = buildBatchJudgePrompt(historyContext, players);

        const { text } = await generateText({
            model: providers.google(MODELS.JUDGE),
            prompt,
            maxOutputTokens: 2000,
        });

        console.log('[Judge v4] Raw output:', text);

        const parsed = parseJudgeResponse(text, players);

        if (!parsed) {
            console.error('[Judge v4] Failed to parse response');
            return Response.json(
                { error: 'Failed to parse Judge output' },
                { status: 500 }
            );
        }

        const results: JudgeResult[] = parsed.map(item => ({
            modelId: item.modelId,
            rawScores: item.scores,
            penalties: item.penalties,
            oneLineReview: item.review,
            finalScore: calculateFinalScore(item.scores, item.penalties),
        }));

        const mvpId = determineMVP(results);

        const response: JudgeAPIResponse = {
            results,
            mvpId,
            timestamp: Date.now(),
        };

        return Response.json(response);

    } catch (error) {
        console.error('[Judge v4] Error:', error);
        return Response.json(
            { error: 'Judge API failed' },
            { status: 500 }
        );
    }
}

function parseJudgeResponse(
    text: string,
    players: JudgeInput[]
): Array<{
    modelId: string;
    scores: RawScore;
    penalties: PenaltyFlags;
    review: string;
}> | null {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);

        if (!parsed.results || !Array.isArray(parsed.results)) {
            return null;
        }

        const results = parsed.results.map((r: {
            modelId?: string;
            scores?: Partial<RawScore>;
            penalties?: Partial<PenaltyFlags>;
            review?: string;
        }) => {
            const matchedPlayer = players.find(p =>
                p.modelId.toLowerCase() === r.modelId?.toLowerCase() ||
                p.modelId.toLowerCase().includes(r.modelId?.toLowerCase() || '') ||
                r.modelId?.toLowerCase().includes(p.modelId.toLowerCase())
            );

            return {
                modelId: matchedPlayer?.modelId || r.modelId || 'unknown',
                scores: {
                    logic: Math.min(10, Math.max(0, r.scores?.logic || 5)),
                    persuasion: Math.min(10, Math.max(0, r.scores?.persuasion || 5)),
                    adherence: Math.min(10, Math.max(0, r.scores?.adherence || 5)),
                    flow: Math.min(10, Math.max(0, r.scores?.flow || 5)),
                    impact: Math.min(10, Math.max(0, r.scores?.impact || 5)),
                },
                penalties: {
                    instruction_fail: !!r.penalties?.instruction_fail,
                    context_fail: !!r.penalties?.context_fail,
                    forbidden_word_count: Math.max(0, r.penalties?.forbidden_word_count || 0),
                },
                review: r.review?.substring(0, 100) || 'No review provided.',
            };
        });

        return results;
    } catch (e) {
        console.error('[Judge v4] Parse error:', e);
        return null;
    }
}
