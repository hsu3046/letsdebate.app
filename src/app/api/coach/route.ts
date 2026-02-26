/**
 * Coach API v4 - 실시간 전술 지령
 * BYOK: 클라이언트에서 apiKeys 수신
 */

import { createProviders, MODELS, type ApiKeys } from '@/lib/ai/config';
import { generateText } from 'ai';
import { buildCoachSystemPrompt } from '@/lib/prompts/v4';
import type { CoachOutput, TurnInfo } from '@/lib/prompts/v4';

export async function POST(request: Request) {
    try {
        const {
            playerModel,
            playerRole,
            opponentModel,
            topic,
            historySummary,
            phase,
            mode,
            turnInfo,
            apiKeys
        } = await request.json() as {
            playerModel: string;
            playerRole: string;
            opponentModel: string;
            topic: string;
            historySummary: string;
            phase: 'opening' | 'debate' | 'closing';
            mode: '1v1' | 'roundtable';
            turnInfo?: TurnInfo;
            apiKeys?: ApiKeys;
        };

        if (!playerModel || !topic) {
            return Response.json(
                { error: 'Invalid input: playerModel and topic required' },
                { status: 400 }
            );
        }

        const providers = createProviders(apiKeys || {});

        console.log('[Coach v4] Player:', playerModel, '| Role:', playerRole);

        // v4 Coach 프롬프트 생성
        const systemPrompt = buildCoachSystemPrompt({
            playerModel,
            playerRole: playerRole || 'neutral',
            opponentModel: opponentModel || 'opponent',
            topic,
            historySummary: historySummary || '',
            phase: phase || 'debate',
            mode: mode || '1v1',
            turnInfo,
        });

        // Gemini Flash로 지령 생성
        const { text } = await generateText({
            model: providers.google(MODELS.COACH),
            prompt: systemPrompt,
            maxOutputTokens: 1500,
        });

        console.log('[Coach v4] Raw output:', text);

        const parsed = parseCoachResponse(text);

        if (!parsed) {
            console.error('[Coach v4] Failed to parse, returning fallback');
            return Response.json({
                target_weakness: 'Unable to analyze',
                tactical_instruction: 'Follow standard debate tactics from L2',
                forbidden_keywords: [],
            } as CoachOutput);
        }

        return Response.json(parsed);

    } catch (error) {
        console.error('[Coach v4] Error:', error);
        return Response.json({
            target_weakness: 'Error occurred',
            tactical_instruction: 'Continue with your natural debate style',
            forbidden_keywords: [],
        } as CoachOutput);
    }
}

function parseCoachResponse(text: string): CoachOutput | null {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]) as CoachOutput;

        if (!parsed.target_weakness || !parsed.tactical_instruction) {
            return null;
        }

        return {
            target_weakness: parsed.target_weakness,
            tactical_instruction: parsed.tactical_instruction,
            forbidden_keywords: parsed.forbidden_keywords || [],
        };
    } catch (e) {
        console.error('[Coach v4] Parse error:', e);
        return null;
    }
}
