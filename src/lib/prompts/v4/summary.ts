// src/lib/prompts/v4/summary.ts

/**
 * Summary 프롬프트
 * @description 토론 요약용 프롬프트 (사회자용)
 */

import { getCharacterById } from '@/lib/characters';
import type { Participant } from '@/lib/types';

export function getSummaryPrompt(
    topic: string,
    messages: { author: string; content: string }[],
    participants: Participant[]
): string {
    const participantList = participants.map(p => {
        const char = getCharacterById(p.id);
        return char
            ? `${char.name} (${char.aiModel})`
            : `${p.name} (${p.job})`;
    }).join(', ');

    const keyMessages = messages
        .filter(m => m.author !== '사회자')
        .slice(-15)
        .map(m => `[${m.author}]: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`)
        .join('\n');

    return `당신은 토론 사회자입니다.

토론 주제: "${topic}"
참여자: ${participantList}

주요 발언 요약:
${keyMessages}

위 토론을 요약해주세요.

[서브타이틀 규칙]
다음 4개의 서브타이틀을 사용하세요:
1. **핵심 쟁점**
2. **합의점과 대립점**
3. **더 생각해볼 질문**
4. **사회자의 마무리 코멘트**

- 서브타이틀은 반드시 별표 2개로 감싸세요 (예: **핵심 쟁점**)
- **더 생각해볼 질문**은 토론 주제를 확장하거나 심화할 수 있는 철학적이거나 실무적인 질문 3가지를 리스트로 작성하세요.
- 별표가 누락되지 않도록 주의하세요
- "(중립적)" 같은 태그는 사용하지 마세요
- 자연스러운 문단 형태로 작성하세요`;
}
