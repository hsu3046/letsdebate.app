// src/lib/keywordExtractor/server.ts

/**
 * 서버 사이드 키워드 추출기
 * - bareun.ai API를 사용한 정밀 형태소 분석
 * - Server Component 또는 API Route에서만 사용해야 함
 */

import 'server-only';
import { analyzeMorphemes, extractKeywordNouns } from '@/lib/bareun';
import {
    FIXED_EXCLUDES,
    STOP_WORDS,
    SYNONYMS,
    HONORIFIC_REGEX,
    KeywordResult
} from './core';
import { extractKeywordsClient } from './client'; // 폴백용

/**
 * [서버용] bareun.ai 형태소 분석을 사용한 키워드 추출 (비동기)
 * API 설정 시 정확한 명사 추출, 미설정 시 클라이언트 로직으로 폴백
 */
export async function extractKeywordsServer(
    text: string,
    userName: string = "",
    topic: string = "",
    topN: number = 10
): Promise<KeywordResult[]> {
    try {
        // bareun.ai 형태소 분석 수행
        const tokens = await analyzeMorphemes(text);

        // 키워드용 명사만 추출 (NNG + NNP)
        const nouns = extractKeywordNouns(tokens);

        // nouns가 비어있으면 폴백 (API 미설정 시)
        if (nouns.length === 0) {
            console.log('[KeywordExtractor] No nouns extracted, using fallback');
            return extractKeywordsClient(text, userName, topic, topN);
        }

        // 필터링 및 카운팅
        const userTarget = userName.trim().replace(HONORIFIC_REGEX, "");
        const topicBanList = new Set<string>();
        if (topic) {
            const topicTokens = await analyzeMorphemes(topic);
            extractKeywordNouns(topicTokens).forEach((noun: string) => topicBanList.add(noun));
        }

        const wordCounts: Record<string, number> = {};

        for (let noun of nouns) {
            // 동의어 처리
            if (SYNONYMS[noun]) {
                noun = SYNONYMS[noun];
            }

            // 필터링
            if (
                noun.length < 2 ||
                STOP_WORDS.has(noun) ||
                FIXED_EXCLUDES.has(noun) ||
                topicBanList.has(noun) ||
                noun === userTarget ||
                noun === userTarget + "님"
            ) {
                continue;
            }

            wordCounts[noun] = (wordCounts[noun] || 0) + 1;
        }

        // 정렬 및 반환
        return Object.entries(wordCounts)
            .sort(([, countA], [, countB]) => countB - countA)
            .slice(0, topN)
            .map(([word, count]) => ({ word, count }));

    } catch (error) {
        console.error('[KeywordExtractor] bareun.ai failed, using fallback:', error);
        // 폴백: 클라이언트 로직 재사용
        return extractKeywordsClient(text, userName, topic, topN);
    }
}
