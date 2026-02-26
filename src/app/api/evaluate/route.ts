// AI 토론 평가 API (BYOK)
import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createProviders, MODELS, type ApiKeys } from '@/lib/ai/config';

export interface EvaluationScores {
    argument: number;
    persuasion: number;
    creativity: number;
    rebuttal: number;
    passion: number;
}

export interface ParticipantEvaluation {
    participantId: string;
    name: string;
    scores: EvaluationScores;
    totalScore: number;
    review?: string;
}

export interface EvaluationResult {
    participants: ParticipantEvaluation[];
    mvp: string;
    summary: {
        mainConflict: string;
        openQuestions: string[];
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { topic, messages, participantNames, apiKeys } = body as {
            topic: string;
            messages: { author: string; content: string; isModerator?: boolean }[];
            participantNames: string[];
            apiKeys?: ApiKeys;
        };

        if (!topic || !messages || !participantNames || participantNames.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const keys = apiKeys || {};
        const providers = createProviders(keys);

        const transcript = messages
            .filter(m => !m.isModerator)
            .map(m => `[${m.author}]: ${m.content}`)
            .join('\n\n');

        const participantStats: Record<string, { charCount: number; statementCount: number }> = {};
        for (const name of participantNames) {
            participantStats[name] = { charCount: 0, statementCount: 0 };
        }
        for (const msg of messages) {
            if (msg.isModerator) continue;
            if (participantStats[msg.author]) {
                participantStats[msg.author].charCount += msg.content.length;
                participantStats[msg.author].statementCount += 1;
            }
        }

        const allChars = Object.values(participantStats).map(s => s.charCount);
        const allStatements = Object.values(participantStats).map(s => s.statementCount);
        const maxChars = Math.max(...allChars, 1);
        const maxStatements = Math.max(...allStatements, 1);

        const calcPassionScore = (name: string): number => {
            const stats = participantStats[name];
            if (!stats) return 5;
            const charRatio = stats.charCount / maxChars;
            const stmtRatio = stats.statementCount / maxStatements;
            return Math.round((charRatio * 0.6 + stmtRatio * 0.4) * 9 + 1);
        };

        const prompt = `당신은 토론 심사위원입니다. 아래 토론 내용을 분석하고 각 토론자를 평가해주세요.\n\n## 토론 주제\n${topic}\n\n## 참가자\n${participantNames.join(', ')}\n\n## 평가 기준 (엄격한 채점 모드)\n**중요**: 최근 점수 인플레이션이 심각합니다. 모든 점수는 **5점(평균)**에서 시작하세요.\n- 9점 이상은 완벽에 가까운 경우에만 부여하십시오.\n\n1. 논증력(argument): 주장과 근거가 논리적이고 데이터/사례로 뒷받침되는가?\n2. 설득력(persuasion): 상대방과 청중을 납득시켰는가?\n3. 창의성(creativity): 새로운 관점이나 프레임을 제시했는가?\n4. 반박 품질(rebuttal): 상대 논리의 허점을 정확히 짚었는가?\n\n## 추가 분석\n- 각 토론자에 대한 **한 줄 심사평** (반드시 한국어)\n- 토론의 핵심 쟁점 요약 (1문장)\n- 해결되지 않은 열린 질문 2개\n\n## 출력 형식 (반드시 JSON만 출력)\n\`\`\`json\n{\n  "evaluations": {\n    "참가자이름": {\n      "argument": 6,\n      "persuasion": 5,\n      "creativity": 4,\n      "rebuttal": 6,\n      "review": "논리는 좋았으나 구체적인 근거가 부족했던 점이 아쉽습니다."\n    }\n  },\n  "summary": {\n    "mainConflict": "핵심 쟁점 요약",\n    "openQuestions": ["열린 질문1", "열린 질문2"]\n  }\n}\n\`\`\`\n\n## 토론 내용\n${transcript}\n\n위 형식의 JSON만 출력하세요.`;

        const result = await generateText({
            model: providers.google(MODELS.GEMINI),
            prompt,
            temperature: 0.3,
        });

        const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/) ||
            result.text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.error('[Evaluate] Failed to find JSON in response:', result.text.slice(0, 500));
            throw new Error('Failed to parse AI response');
        }

        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        const participants: ParticipantEvaluation[] = [];

        for (const name of participantNames) {
            const eval_ = parsed.evaluations?.[name];
            if (!eval_) {
                console.warn(`[Evaluate] Missing evaluation for: ${name}`);
                continue;
            }

            const passionScore = calcPassionScore(name);

            const scores: EvaluationScores = {
                argument: Math.min(10, Math.max(1, eval_.argument || 5)),
                persuasion: Math.min(10, Math.max(1, eval_.persuasion || 5)),
                creativity: Math.min(10, Math.max(1, eval_.creativity || 5)),
                rebuttal: Math.min(10, Math.max(1, eval_.rebuttal || 5)),
                passion: passionScore,
            };

            const totalScore = Math.round(
                (scores.argument * 3 +
                    scores.persuasion * 2.5 +
                    scores.creativity * 2 +
                    scores.rebuttal * 2 +
                    scores.passion * 0.5)
            );

            participants.push({
                participantId: name,
                name,
                scores,
                totalScore,
                review: eval_.review || '평가 내용을 불러올 수 없습니다.',
            });
        }

        participants.sort((a, b) => b.totalScore - a.totalScore);

        const evaluationResult: EvaluationResult = {
            participants,
            mvp: participants[0]?.name || '',
            summary: parsed.summary || {
                mainConflict: '핵심 쟁점을 분석 중입니다.',
                openQuestions: [],
            },
        };

        return NextResponse.json(evaluationResult);

    } catch (error) {
        console.error('Evaluate API Error:', error);
        return NextResponse.json({ error: 'Failed to evaluate debate' }, { status: 500 });
    }
}
