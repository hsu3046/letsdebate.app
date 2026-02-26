// 토론 텍스트 분석 유틸리티
// 인용, 반박, 동조 횟수 분석

export interface ParticipantAnalysis {
    participantId: string;
    name: string;
    totalChars: number;
    statementCount: number;
    citedCount: number;      // 다른 사람에게 인용된 횟수
    rebuttedCount: number;   // 반박 받은 횟수
    agreedCount: number;     // 동조 받은 횟수
}

export interface DebateAnalysis {
    participants: ParticipantAnalysis[];
    mostCited: string | null;
    mostRebutted: string | null;
    mostAgreed: string | null;
    rivalries: { pair: [string, string]; count: number }[];
}

// 반박 키워드
const REBUTTAL_KEYWORDS = [
    '하지만', '그러나', '아니요', '틀렸', '동의하기 어려',
    '반대', '문제는', '오히려', '글쎄요', '하지만요',
    '그렇지 않', '그건 아니', '다르게 생각'
];

// 동조 키워드
const AGREEMENT_KEYWORDS = [
    '맞아요', '동의', '좋은 포인트', '일리가 있',
    '그 말씀이 맞', '저도 그렇게', '공감', '동감',
    '옳은 말씀', '맞는 말씀', '좋은 의견'
];

/**
 * 메시지에서 특정 참가자 이름이 언급되었는지 확인
 */
function findMentionedParticipants(
    content: string,
    author: string,
    participantNames: string[]
): string[] {
    const mentioned: string[] = [];

    for (const name of participantNames) {
        if (name === author) continue; // 자기 자신 제외

        // 이름 변형 체크 (예: "클로이", "클로이 교수", "클로이님")
        const namePatterns = [
            name,
            `${name}님`,
            `${name}씨`,
            `${name} 님`,
            `${name} 씨`,
        ];

        for (const pattern of namePatterns) {
            if (content.includes(pattern)) {
                mentioned.push(name);
                break;
            }
        }
    }

    return mentioned;
}

/**
 * 메시지가 반박인지 확인
 */
function isRebuttal(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return REBUTTAL_KEYWORDS.some(keyword => lowerContent.includes(keyword));
}

/**
 * 메시지가 동조인지 확인
 */
function isAgreement(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return AGREEMENT_KEYWORDS.some(keyword => lowerContent.includes(keyword));
}

/**
 * 토론 메시지를 분석하여 통계 생성
 */
export function analyzeDebate(
    messages: { author: string; content: string; isModerator?: boolean }[],
    participantNames: string[]
): DebateAnalysis {
    // 참가자별 통계 초기화
    const stats: Record<string, ParticipantAnalysis> = {};

    for (const name of participantNames) {
        stats[name] = {
            participantId: name,
            name,
            totalChars: 0,
            statementCount: 0,
            citedCount: 0,
            rebuttedCount: 0,
            agreedCount: 0,
        };
    }

    // 충돌 횟수 추적
    const rivalryMap: Record<string, number> = {};

    // 각 메시지 분석
    for (const msg of messages) {
        if (msg.isModerator) continue;

        const author = msg.author;
        if (!stats[author]) continue;

        // 기본 통계
        stats[author].totalChars += msg.content.length;
        stats[author].statementCount += 1;

        // 인용된 참가자 찾기
        const mentioned = findMentionedParticipants(msg.content, author, participantNames);

        for (const mentionedName of mentioned) {
            if (stats[mentionedName]) {
                stats[mentionedName].citedCount += 1;

                // 반박 또는 동조 판단
                if (isRebuttal(msg.content)) {
                    stats[mentionedName].rebuttedCount += 1;

                    // 충돌 기록
                    const pairKey = [author, mentionedName].sort().join('-');
                    rivalryMap[pairKey] = (rivalryMap[pairKey] || 0) + 1;
                } else if (isAgreement(msg.content)) {
                    stats[mentionedName].agreedCount += 1;
                }
            }
        }
    }

    // 결과 배열로 변환
    const participants = Object.values(stats);

    // 1위 찾기
    const mostCited = participants.reduce((max, p) =>
        p.citedCount > (max?.citedCount || 0) ? p : max, participants[0])?.name || null;
    const mostRebutted = participants.reduce((max, p) =>
        p.rebuttedCount > (max?.rebuttedCount || 0) ? p : max, participants[0])?.name || null;
    const mostAgreed = participants.reduce((max, p) =>
        p.agreedCount > (max?.agreedCount || 0) ? p : max, participants[0])?.name || null;

    // 라이벌리 정렬
    const rivalries = Object.entries(rivalryMap)
        .map(([key, count]) => ({
            pair: key.split('-') as [string, string],
            count,
        }))
        .sort((a, b) => b.count - a.count);

    return {
        participants,
        mostCited: mostCited && stats[mostCited]?.citedCount > 0 ? mostCited : null,
        mostRebutted: mostRebutted && stats[mostRebutted]?.rebuttedCount > 0 ? mostRebutted : null,
        mostAgreed: mostAgreed && stats[mostAgreed]?.agreedCount > 0 ? mostAgreed : null,
        rivalries,
    };
}
