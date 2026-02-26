// src/lib/keywordExtractor/client.ts

/**
 * 클라이언트 사이드 키워드 추출기
 * - 정규식 기반 단순 추출
 * - 무거운 형태소 분석기(bareun) 의존성 없음
 */

import {
    FIXED_EXCLUDES,
    STOP_WORDS,
    VERB_ENDING_REGEX,
    SYNONYMS,
    JOSA_REGEX,
    HONORIFIC_REGEX,
    KeywordResult
} from './core';

/**
 * [클라이언트용] 토론 로그에서 핵심 키워드를 추출합니다. (동기)
 */
export function extractKeywordsClient(
    text: string,
    userName: string = "",
    topic: string = "",
    topN: number = 10
): KeywordResult[] {
    // 1. 유저 이름 타겟팅 (공백 제거, 호칭 제거도 준비)
    const userTarget = userName.trim();
    const userTargetBase = userTarget.replace(HONORIFIC_REGEX, "");

    // 2. [주제어 필터링] 주제 문장에서 명사만 추출하여 금지어 목록(Set) 생성
    const topicBanList = new Set<string>();
    if (topic) {
        const cleanTopic = topic.replace(/[^\w\s가-힣]/g, " ");
        cleanTopic.split(/\s+/).forEach(word => {
            let root = word.replace(JOSA_REGEX, ""); // 주제어에서도 조사 제거
            root = root.replace(HONORIFIC_REGEX, ""); // 호칭 제거
            if (root.length >= 2) {
                topicBanList.add(root);
            }
        });
    }

    // 3. 텍스트 정제 (특수문자 제거, 이모지 제거)
    const cleanText = text.replace(/[^\w\s가-힣]/g, " ");
    const words = cleanText.split(/\s+/);

    const wordCounts: Record<string, number> = {};

    // 4. 단어 순회 및 카운팅
    words.forEach((word) => {
        // A. 조사 제거 (형태소 분석 흉내)
        let rootWord = word.replace(JOSA_REGEX, "");

        // A-2. 호칭 접미사 제거 (빅터님 → 빅터)
        const rootWordWithoutHonorific = rootWord.replace(HONORIFIC_REGEX, "");

        // B. 동의어 처리 (매핑된 단어가 있으면 교체)
        if (SYNONYMS[rootWord]) {
            rootWord = SYNONYMS[rootWord];
        }

        // C. 필터링 (제외 조건 확인)
        if (
            rootWord.length < 2 ||                   // 1. 한 글자 제외
            STOP_WORDS.has(rootWord) ||              // 2. 불용어 사전에 포함됨
            FIXED_EXCLUDES.has(rootWord) ||          // 3. 캐릭터/사회자 이름 포함됨
            FIXED_EXCLUDES.has(rootWordWithoutHonorific) ||  // 3-2. 호칭 제거 후 캐릭터 이름임 (빅터님 → 빅터)
            topicBanList.has(rootWord) ||            // 4. ★ 주제에 포함된 단어임 (뻔한 결과 방지)
            topicBanList.has(rootWordWithoutHonorific) ||    // 4-2. 호칭 제거 후에도 체크
            rootWord === userTarget ||               // 5. 유저 본인 이름
            rootWord === userTarget + "님" ||        // 6. 유저 호칭
            rootWordWithoutHonorific === userTargetBase ||   // 6-2. 호칭 제거 후 유저 이름
            /^\d+$/.test(rootWord) ||                // 7. 숫자만 있는 경우
            VERB_ENDING_REGEX.test(rootWord)         // 8. 동사/형용사 어미로 끝나는 경우
        ) {
            return; // 카운트하지 않고 건너뜀
        }

        // D. 카운팅
        wordCounts[rootWord] = (wordCounts[rootWord] || 0) + 1;
    });

    // 5. 정렬 (많이 나온 순) 및 Top N 자르기
    return Object.entries(wordCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, topN)
        .map(([word, count]) => ({ word, count }));
}
