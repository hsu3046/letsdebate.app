// ===================================
// 백그라운드 토론 분석 시스템
// 토론 중 실시간으로 키워드, 하이라이트, 요약 생성
// ===================================

import type { DebateMessage, Participant } from './types';

export interface AnalysisResult {
    keywords: string[];                    // 핵심 키워드
    highlights: HighlightQuote[];          // 오늘의 발언
    summary: string;                       // 중간 요약
    lastProcessedIndex: number;            // 마지막 처리된 메시지 인덱스
}

export interface HighlightQuote {
    author: string;
    quote: string;
    reason: string;
}

// 분석 결과 저장소 (싱글톤)
let analysisResult: AnalysisResult = {
    keywords: [],
    highlights: [],
    summary: '',
    lastProcessedIndex: -1,
};

let isProcessing = false;
let pendingMessages: DebateMessage[] = [];

/**
 * 새 메시지가 추가될 때마다 호출
 * 매 3개 메시지마다 백그라운드에서 분석 실행
 */
export async function processNewMessage(
    message: DebateMessage,
    allMessages: DebateMessage[],
    topic: string,
    participants: Participant[]
): Promise<void> {
    // 사회자 메시지는 제외
    if (message.isModerator) return;

    pendingMessages.push(message);

    // 3개마다 분석 실행
    if (pendingMessages.length >= 3 && !isProcessing) {
        isProcessing = true;

        try {
            await runAnalysis(allMessages, topic, participants);
            pendingMessages = [];
        } catch (err) {
            console.warn('[BackgroundAnalysis] Analysis failed:', err);
        } finally {
            isProcessing = false;
        }
    }
}

/**
 * 토론 종료 시 최종 분석 실행
 */
export async function finalizeAnalysis(
    allMessages: DebateMessage[],
    topic: string,
    participants: Participant[]
): Promise<AnalysisResult> {
    isProcessing = true;

    try {
        await runAnalysis(allMessages, topic, participants);
        return analysisResult;
    } finally {
        isProcessing = false;
    }
}

/**
 * 현재 분석 결과 가져오기 (결과 페이지에서 사용)
 */
export function getAnalysisResult(): AnalysisResult {
    return { ...analysisResult };
}

/**
 * 분석 결과 초기화 (새 토론 시작 시)
 */
export function resetAnalysis(): void {
    analysisResult = {
        keywords: [],
        highlights: [],
        summary: '',
        lastProcessedIndex: -1,
    };
    pendingMessages = [];
    isProcessing = false;
}

// 내부 분석 함수
async function runAnalysis(
    messages: DebateMessage[],
    topic: string,
    participants: Participant[]
): Promise<void> {
    // 사회자 제외한 메시지만
    const debateMessages = messages.filter(m => !m.isModerator);

    if (debateMessages.length === 0) return;

    // 최근 메시지들만 분석 (마지막 처리 이후)
    const newMessages = debateMessages.slice(analysisResult.lastProcessedIndex + 1);

    if (newMessages.length === 0) return;

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic,
                messages: newMessages.map(m => ({
                    author: m.author,
                    content: m.content,
                })),
                participants: participants.map(p => ({
                    name: p.name,
                    job: p.job,
                })),
                existingKeywords: analysisResult.keywords,
                existingSummary: analysisResult.summary,
            }),
        });

        if (response.ok) {
            const data = await response.json();

            // 결과 병합
            if (data.keywords) {
                // 중복 제거하며 병합
                const keywordSet = new Set([...analysisResult.keywords, ...data.keywords]);
                analysisResult.keywords = Array.from(keywordSet).slice(0, 10);  // 최대 10개
            }

            if (data.highlights) {
                analysisResult.highlights = [
                    ...analysisResult.highlights,
                    ...data.highlights,
                ].slice(-5);  // 최근 5개만 유지
            }

            if (data.summary) {
                analysisResult.summary = data.summary;
            }

            analysisResult.lastProcessedIndex = debateMessages.length - 1;

            console.log('[BackgroundAnalysis] Updated:', {
                keywords: analysisResult.keywords.length,
                highlights: analysisResult.highlights.length,
                processedUpto: analysisResult.lastProcessedIndex,
            });
        }
    } catch (err) {
        console.error('[BackgroundAnalysis] API call failed:', err);
    }
}
