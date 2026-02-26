/**
 * 콘텐츠 필터링 - 부적절한 키워드 차단
 */

// 차단 키워드 카테고리별 정의
const BLOCKED_KEYWORDS = {
    // 성인/음란
    adult: [
        '섹스', '야동', '성관계', '강간', '근친', '로리', '포르노',
        'sex', 'porn', 'nude', 'hentai', 'xxx', 'nsfw',
        'ㅅㅅ', 'ㅇㄷ', '19금', '성인물',
    ],

    // 생명 경시
    lifeThreat: [
        '자살', '자해', '살인 청부', '동반 자살', '자살 방법',
        'suicide', 'kill myself', 'murder',
        '극단적 선택', '목숨을 끊',
    ],

    // 범죄/불법
    crime: [
        '마약', '필로폰', '대마초', '도박', '보이스피싱', '폭탄 제조',
        '마약 구매', '불법 도박',
        'drugs', 'bomb', 'how to make',
        '마*약', '마 약', '필*폰', '대*초',  // 우회 표현
        'ㅁㅇ', '떨', '작대기', '빙두',      // 은어
    ],

    // 테러/증오
    terror: [
        '테러', '학살', '나치', '참수', '인종 청소',
        'terror', 'nazi', 'genocide',
        '혐오 발언', '차별 발언',
    ],

    // 정치인 (한국)
    politicians: [
        '이재명', '윤석열', '한동훈', '이낙연', '홍준표',
    ],
};

// 카테고리별 차단 메시지
const BLOCK_MESSAGES: Record<string, string> = {
    adult: '성인/음란 관련 내용은 허용되지 않습니다.',
    lifeThreat: '생명을 경시하는 내용은 허용되지 않습니다. 도움이 필요하시면 전문 상담 기관에 연락해주세요.',
    crime: '범죄/불법 관련 내용은 허용되지 않습니다.',
    terror: '테러/증오 관련 내용은 허용되지 않습니다.',
    politicians: '특정 정치인에 대한 내용은 중립성을 위해 제한됩니다.',
};

export type FilterResult = {
    allowed: boolean;
    reason?: string;
    category?: string;
};

// 텍스트 정규화 (우회 표현 대응)
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[*\-_.\s]/g, '')  // 특수문자/공백 제거
        .replace(/[ㄱ-ㅎㅏ-ㅣ]/g, (char) => {
            // 초성만 있는 경우 그대로 유지
            return char;
        });
}

/**
 * 콘텐츠가 허용되는지 검사 (범용)
 * @param content 검사할 텍스트 (주제, 배경, 채팅 등)
 * @returns { allowed: boolean, reason?: string, category?: string }
 */
export function isContentAllowed(content: string): FilterResult {
    const normalizedContent = normalizeText(content);
    const lowerContent = content.toLowerCase();

    for (const [category, keywords] of Object.entries(BLOCKED_KEYWORDS)) {
        for (const keyword of keywords) {
            const normalizedKeyword = normalizeText(keyword);
            // 정규화된 텍스트와 원본 모두 검사
            if (normalizedContent.includes(normalizedKeyword) || lowerContent.includes(keyword.toLowerCase())) {
                return {
                    allowed: false,
                    reason: BLOCK_MESSAGES[category] || '이 내용은 허용되지 않습니다.',
                    category,
                };
            }
        }
    }

    return { allowed: true };
}

/**
 * 주제가 허용되는지 검사 (하위 호환성 유지)
 * @deprecated isContentAllowed() 사용 권장
 */
export function isTopicAllowed(topic: string): FilterResult {
    return isContentAllowed(topic);
}

/**
 * 차단된 키워드 목록 반환 (관리용)
 */
export function getBlockedKeywords(): Record<string, string[]> {
    return BLOCKED_KEYWORDS;
}

