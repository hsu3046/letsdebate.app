// Moderator API Route - AI-Generated Moderator Messages
// BYOK: 클라이언트에서 apiKeys 수신

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createProviders, MODERATOR_MODEL, type ApiKeys } from '@/lib/ai/config';

// 마크다운 문법 제거 함수
function stripMarkdown(text: string): string {
    return text
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/^-\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

type ModeratorMessageType = 'intro' | 'post_opening' | 'pre_closing' | 'closing';

interface ModeratorRequest {
    type: ModeratorMessageType;
    topic: string;
    participants: { name: string; aiModel: string }[];
    humanName?: string;
    previousQuestions?: string[];
    isRedebate?: boolean;
    recentMessages?: { author: string; content: string }[];
    allMessages?: { author: string; content: string; isModerator?: boolean }[];
    apiKeys?: ApiKeys;
}

// 각 타입별 AI 프롬프트
const MODERATOR_PROMPTS: Record<ModeratorMessageType, (req: ModeratorRequest) => string> = {
    intro: (req) => {
        const participantList = req.participants.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
        const humanPart = req.humanName ? `\n${req.participants.length + 1}. ${req.humanName}` : '';

        if (req.isRedebate && req.previousQuestions && req.previousQuestions.length > 0) {
            return `당신은 토론 프로그램의 AI 사회자입니다. 이번은 "재토론"입니다.\n\n## 재토론 배경\n지난 토론 주제: "${req.topic}"\n지난 토론에서 남은 질문들:\n${req.previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n## 오늘의 참가자\n${participantList}${humanPart}\n\n## Chain-of-Thought 지시\n1. 먼저 지난 토론의 "남은 질문"을 종합적으로 분석하세요.\n2. 오늘 재토론에서 집중해야 할 핵심 방향을 도출하세요.\n3. 그 방향을 자연스럽게 전달하면서 참가자들을 소개하세요.\n\n## 작성 규칙\n- "오늘의 주제는 ~입니다" 같은 템플릿 표현 금지\n- 지난 토론의 맥락을 자연스럽게 이어가세요\n- 참가자 이름만 언급 (AI 모델명 언급 금지)\n- 200-250자 이내\n- 이모지 금지\n- 발언 순서 지정 금지 (시스템이 결정)`;
        }

        return `당신은 토론 프로그램의 AI 사회자입니다.\n\n## 오늘의 주제\n"${req.topic}"\n\n## 참가자\n${participantList}${humanPart}\n\n## Chain-of-Thought 지시\n1. 먼저 이 주제가 왜 토론할 가치가 있는지 심도 있게 분석하세요.\n2. 주제의 다양한 측면(찬반, 역사적 맥락, 현재 상황 등)을 간략히 고려하세요.\n3. 그 분석을 바탕으로 객관적이고 흥미로운 배경 설명을 추가하세요.\n4. 참가자들을 한 명씩 이름을 언급하며 소개하세요.\n\n## 작성 규칙\n- "환영합니다", "오늘의 주제는" 같은 템플릿 표현 금지\n- 주제에 대한 통찰력 있는 배경 설명을 먼저 제시\n- 참가자 이름만 언급 (AI 모델명 언급 금지)\n- 200-300자 이내\n- 이모지 금지\n- 발언 순서 지정 금지`;
    },

    post_opening: (req) => {
        const openingMessages = req.recentMessages?.filter(m => m.author !== '사회자') || [];
        const openingSummary = openingMessages.map((m) =>
            `${m.author}: "${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}"`
        ).join('\n');

        return `당신은 토론 프로그램의 AI 사회자입니다.\n\n## 주제\n"${req.topic}"\n\n## 각 참가자의 오프닝 토크 내용\n${openingSummary || '(오프닝 내용 없음)'}\n\n## Chain-of-Thought 지시\n1. 각 참가자의 오프닝에서 핵심 주장과 입장을 파악하세요.\n2. 찬성, 반대, 중립 등 어떤 구도가 형성되었는지 분석하세요.\n3. 각 참가자의 핵심을 2-3문장으로 요약해서 언급하세요.\n4. 자유토론 시작을 자연스럽게 선언하세요.\n\n## 작성 규칙\n- "오프닝 잘 들었습니다" 같은 템플릿 표현 금지\n- 각 참가자의 입장을 구체적으로 요약\n- 자유토론에서 충돌할 포인트를 미리 암시하면 좋음\n- 150-250자 이내\n- 이모지 금지\n- 마크다운 문법 사용 금지 (##, **, * 등)`;
    },

    pre_closing: (req) => {
        const debateMessages = req.recentMessages?.filter(m => m.author !== '사회자') || [];
        const debateSummary = debateMessages.slice(-10).map((m) =>
            `${m.author}: "${m.content.slice(0, 80)}${m.content.length > 80 ? '...' : ''}"`
        ).join('\n');

        return `당신은 토론 프로그램의 AI 사회자입니다.\n\n## 주제\n"${req.topic}"\n\n## 자유토론 중 발언 (최근 10개)\n${debateSummary || '(토론 내용 없음)'}\n\n## Chain-of-Thought 지시\n1. 자유토론에서 어떤 논쟁이 벌어졌는지 분석하세요.\n2. 각 진영의 핵심 주장과 반론을 파악하세요.\n3. 아직 충분히 다뤄지지 않은 부분이 있다면 도출하세요.\n4. 클로징 토크에서 보충하면 좋을 내용을 객관적으로 제안하세요.\n\n## 작성 규칙\n- "자유토론이 마무리되었습니다" 같은 템플릿 표현 금지\n- 토론 내용을 구체적으로 요약\n- 클로징에서 다루면 좋을 포인트를 1-2개 제안\n- 150-250자 이내\n- 이모지 금지`;
    },

    closing: (req) => {
        const participantMessages = req.allMessages?.filter(m => !m.isModerator) || [];
        const authorCounts: Record<string, number> = {};
        participantMessages.forEach(m => {
            authorCounts[m.author] = (authorCounts[m.author] || 0) + 1;
        });
        const countSummary = Object.entries(authorCounts)
            .map(([author, count]) => `${author}: ${count}회`)
            .join(', ');

        const recentSample = participantMessages.slice(-6).map(m =>
            `${m.author}: "${m.content.slice(0, 60)}..."`
        ).join('\n');

        return `당신은 토론 프로그램의 AI 사회자입니다. 토론을 마무리하는 멘트를 작성해주세요.\n\n## 주제\n"${req.topic}"\n\n## 토론 통계\n발언 횟수: ${countSummary}\n\n## 최근 발언 샘플\n${recentSample || '(발언 없음)'}\n\n## Chain-of-Thought 지시\n1. 오늘 토론의 핵심 대립점을 파악하세요 (예: A파 vs B파).\n2. 가장 치열했던 순간이나 날카로웠던 반론을 떠올려보세요.\n3. 양측이 공감한 지점이 있다면 언급하세요.\n4. 청중에게 "이 토론을 보고 어떤 생각이 드셨나요?"라는 느낌의 여운을 남기세요.\n\n## 작성 규칙\n- "수고하셨습니다", "감사합니다" 같은 형식적 인사 금지\n- 자연스러운 마무리 표현은 허용\n- 결론을 강요하지 말고 열린 질문으로 마무리\n- 토론 프로그램 마무리 느낌으로 작성\n- 150-200자 이내\n- 이모지 금지`;
    },
};


export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as ModeratorRequest;
        const { type, topic, participants, humanName, apiKeys } = body;

        if (!type || !topic || !participants) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!['intro', 'post_opening', 'pre_closing', 'closing'].includes(type)) {
            return NextResponse.json({ error: `Invalid message type: ${type}` }, { status: 400 });
        }

        const keys = apiKeys || {};

        if (!keys.GOOGLE_GENERATIVE_AI_API_KEY) {
            return NextResponse.json({
                content: getFallbackMessage(type, topic, participants, humanName),
                fallback: true
            });
        }

        const providers = createProviders(keys);

        const promptFn = MODERATOR_PROMPTS[type];
        const prompt = promptFn(body);

        console.log(`[Moderator API] Type: ${type}, Generating...`);

        const result = await generateText({
            model: providers.google(MODERATOR_MODEL),
            prompt,
            temperature: 0.75,
        });

        let content = result.text?.trim() || getFallbackMessage(type, topic, participants, humanName);
        content = stripMarkdown(content);

        return NextResponse.json({ content });

    } catch (error) {
        console.error('[Moderator API] Error:', error);
        return NextResponse.json({ error: 'Failed to generate moderator message' }, { status: 500 });
    }
}

function getFallbackMessage(
    type: ModeratorMessageType,
    topic: string,
    participants: { name: string }[],
    humanName?: string
): string {
    const participantList = participants.map((p, i) => `${i + 1}. ${p.name}`).join(', ');
    const humanPart = humanName ? `, ${humanName}` : '';

    const templates: Record<ModeratorMessageType, string> = {
        intro: `오늘 "${topic}" 주제로 토론을 시작합니다. 참가자는 ${participantList}${humanPart}입니다. 각자의 생각을 오프닝 토크에서 들어보겠습니다.`,
        post_opening: `각자의 오프닝 토크를 통해 다양한 입장이 드러났습니다. 이제 자유토론에서 서로의 의견에 반박하거나 보충해주세요.`,
        pre_closing: `활발한 토론이 이어졌습니다. 이제 클로징 토크에서 각자의 핵심 주장을 최종 정리해주세요.`,
        closing: `"${topic}" 주제로 다양한 관점이 충돌했습니다. 오늘 토론을 통해 각자 새로운 시각을 얻으셨기를 바랍니다.`,
    };

    return templates[type];
}
