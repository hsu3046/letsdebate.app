/**
 * Moderator Interrupt Detection
 * 사회자 개입이 필요한 조건을 감지하는 유틸리티
 */

// 과열 감지용 부정적 키워드 목록
const OVERHEAT_KEYWORDS = [
    // 공격적 표현
    '멍청', '바보', '무식', '한심', '어리석',
    '헛소리', '개소리', '말도 안 되는', '어처구니',
    // 비하 표현  
    '무시', '얕보', '깔보', '업신여',
    // 감정적 표현
    '화나', '짜증', '분노', '열받',
    // 인신공격
    '당신 같은', '그런 사람', '수준이',
];

// 과열 레벨 판단 (0: 정상, 1: 주의, 2: 과열)
export function detectOverheatLevel(content: string): number {
    const lowerContent = content.toLowerCase();
    let score = 0;

    for (const keyword of OVERHEAT_KEYWORDS) {
        if (lowerContent.includes(keyword)) {
            score += 1;
        }
    }

    // 느낌표 과다 사용 (3개 이상)
    const exclamationCount = (content.match(/!/g) || []).length;
    if (exclamationCount >= 3) score += 1;

    // 대문자 또는 전체 한글 강조 (물음표+느낌표 조합)
    if (content.includes('?!') || content.includes('!?')) score += 1;

    if (score >= 3) return 2;  // 과열
    if (score >= 1) return 1;  // 주의
    return 0;                   // 정상
}

// 주제 반복 감지 (최근 N개 메시지에서 동일 키워드 반복)
export function detectTopicRepetition(
    recentMessages: { author: string; content: string }[],
    threshold: number = 5
): string | null {
    if (recentMessages.length < threshold) return null;

    // 최근 메시지에서 키워드 추출
    const keywordCounts: Record<string, number> = {};
    const stopwords = ['이', '그', '저', '있', '없', '하', '되', '것', '수', '등', '및'];

    for (const msg of recentMessages.slice(-threshold)) {
        // 2글자 이상 명사 추출 (간략 버전)
        const words = msg.content.match(/[가-힣]{2,}/g) || [];
        for (const word of words) {
            if (stopwords.some(sw => word.includes(sw))) continue;
            keywordCounts[word] = (keywordCounts[word] || 0) + 1;
        }
    }

    // 가장 많이 반복된 키워드 찾기
    let maxWord = '';
    let maxCount = 0;
    for (const [word, count] of Object.entries(keywordCounts)) {
        if (count > maxCount && word.length >= 2) {
            maxWord = word;
            maxCount = count;
        }
    }

    // 80% 이상 메시지에서 등장 시 반복으로 판단
    if (maxCount >= Math.floor(threshold * 0.8)) {
        return maxWord;
    }

    return null;
}

export interface InterruptCheckResult {
    shouldIntervene: boolean;
    type: 'overheat_warning' | 'topic_refresh' | null;
    lastSpeaker?: string;
    repeatedTopic?: string;
}

/**
 * 사회자 개입 필요 여부 체크
 */
export function checkShouldIntervene(
    recentMessages: { author: string; content: string }[],
    lastMessage: { author: string; content: string } | null
): InterruptCheckResult {
    // 1. 과열 감지
    if (lastMessage) {
        const overheatLevel = detectOverheatLevel(lastMessage.content);
        if (overheatLevel >= 2) {
            return {
                shouldIntervene: true,
                type: 'overheat_warning',
                lastSpeaker: lastMessage.author,
            };
        }
    }

    // 2. 주제 반복 감지
    const repeatedTopic = detectTopicRepetition(recentMessages, 5);
    if (repeatedTopic) {
        return {
            shouldIntervene: true,
            type: 'topic_refresh',
            repeatedTopic,
        };
    }

    return { shouldIntervene: false, type: null };
}
