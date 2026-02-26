// src/lib/prompts/v4/judge/types.ts

/**
 * Judge System v4 타입 정의
 * AI 심판이 채점한 Raw 데이터 + 코드가 계산한 최종 결과
 */

// ===== AI 심판 입력 =====

/**
 * 개별 참가자 채점용 입력 데이터
 */
export interface JudgeInput {
    modelId: string;            // 참가자 ID/이름
    fullLog: string;            // 해당 AI의 전체 발언 모음
    orders: {
        directorStance: string;       // Director가 부여한 입장
        directorAngle: string;        // Director가 부여한 전략적 각도
        secretMission: string;        // Director가 부여한 비밀 임무
        coachInstructions: string[];  // 모든 턴의 Coach 지시 모음
        forbiddenWords: string[];     // 모든 턴의 금지어 모음
    };
}

// ===== AI 심판 출력 (Raw) =====

/**
 * AI가 채점한 5대 지표 (0-10점)
 */
export interface RawScore {
    logic: number;       // 논리적 정합성
    persuasion: number;  // 설득력/문체
    adherence: number;   // Director/Coach 지시 이행
    flow: number;        // 맥락 파악/대화 흐름
    impact: number;      // 창의성/임팩트
}

/**
 * AI가 보고한 페널티 플래그
 */
export interface PenaltyFlags {
    instruction_fail: boolean;      // 지시 불이행 (-2.0)
    context_fail: boolean;          // 동문서답/환각 (-3.0)
    forbidden_word_count: number;   // 금지어 사용 횟수 (개당 -0.5)
}

// ===== 최종 결과 =====

/**
 * 최종 채점 결과 (AI Raw + 코드 계산)
 */
export interface JudgeResult {
    modelId: string;
    finalScore: number;       // 코드가 계산한 최종 점수
    rawScores: RawScore;      // AI가 채점한 원점수
    penalties: PenaltyFlags;  // 페널티 정보
    oneLineReview: string;    // 15단어 이내 짧은 평
}

/**
 * Judge API 응답
 */
export interface JudgeAPIResponse {
    results: JudgeResult[];
    mvpId: string;            // 최고 점수 참가자 ID
    timestamp: number;
}
