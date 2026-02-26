/**
 * 턴 패턴 시스템
 * @description 토론 순서 패턴 정의 및 실행 계획 생성
 */

// ===== 3가지 패턴 정의 =====

/**
 * Pattern A: The Creative Loop (기본형 - Gemini 선공)
 * 거시적 관점 → 도발 → 윤리적 통찰 → 팩트 검증
 */
export const PATTERN_A = ['gemini', 'grok', 'claude', 'deepseek'] as const;

/**
 * Pattern B: The Battle Loop (도발형 - Grok 선공)
 * Grok이 사고 치면 → Gemini가 수습 → DeepSeek가 팩트 → Claude가 진정
 */
export const PATTERN_B = ['grok', 'gemini', 'deepseek', 'claude'] as const;

/**
 * Pattern C: The Deep Loop (철학형 - Claude 선공)
 * Claude가 질문 → DeepSeek가 현실 → Gemini가 연결 → Grok이 냉소적 마무리
 */
export const PATTERN_C = ['claude', 'deepseek', 'gemini', 'grok'] as const;

export const PATTERNS = {
    A: PATTERN_A,
    B: PATTERN_B,
    C: PATTERN_C,
} as const;

export type PatternType = keyof typeof PATTERNS;


// ===== 길이별 라운드 수 =====
export const ROUNDS_BY_LENGTH = {
    SHORT: 1,     // 5턴 (4 + ChatGPT)
    STANDARD: 2,  // 9턴 (8 + ChatGPT)
    LONG: 3,      // 13턴 (12 + ChatGPT)
} as const;

export type LengthType = keyof typeof ROUNDS_BY_LENGTH;

export const TOTAL_TURNS_BY_LENGTH = {
    SHORT: 5,
    STANDARD: 9,
    LONG: 13,
} as const;


// ===== 패턴 랜덤 선택 =====
export function selectRandomPattern(): PatternType {
    const patterns: PatternType[] = ['A', 'B', 'C'];
    const randomIndex = Math.floor(Math.random() * patterns.length);
    return patterns[randomIndex];
}


// ===== 실행 계획 생성 =====
export interface ExecutionPlan {
    pattern: PatternType;
    length: LengthType;
    order: string[];
    totalTurns: number;
}

/**
 * 토론 실행 계획 생성
 * @param pattern - A/B/C 패턴
 * @param length - SHORT/STANDARD/LONG
 * @returns 실행 계획 객체
 */
export function buildExecutionPlan(
    pattern: PatternType,
    length: LengthType
): ExecutionPlan {
    const baseOrder = PATTERNS[pattern];
    const rounds = ROUNDS_BY_LENGTH[length];
    const order: string[] = [];

    // 라운드 반복
    for (let i = 0; i < rounds; i++) {
        order.push(...baseOrder);
    }

    // ChatGPT 마지막에 추가 (요약)
    order.push('chatgpt');

    return {
        pattern,
        length,
        order,
        totalTurns: order.length,
    };
}


// ===== 현재 턴의 모델 가져오기 =====
export function getCurrentModel(plan: ExecutionPlan, turnIndex: number): string | null {
    if (turnIndex < 0 || turnIndex >= plan.order.length) {
        return null;
    }
    return plan.order[turnIndex];
}


// ===== 현재 페이즈 계산 =====
export type PhaseType = 'opening' | 'debate' | 'closing';

export function getCurrentPhase(plan: ExecutionPlan, turnIndex: number): PhaseType {
    const totalTurns = plan.totalTurns;
    const modelsPerRound = 4; // ChatGPT 제외

    // 마지막 턴은 ChatGPT 요약 = closing
    if (turnIndex === totalTurns - 1) {
        return 'closing';
    }

    // 첫 라운드(0~3)는 opening
    if (turnIndex < modelsPerRound) {
        return 'opening';
    }

    // 마지막 라운드 직전까지는 debate
    const closingStartIndex = totalTurns - modelsPerRound - 1;
    if (turnIndex < closingStartIndex) {
        return 'debate';
    }

    // 마지막 라운드는 closing
    return 'closing';
}


// ===== 패턴 정보 가져오기 =====
export const PATTERN_INFO = {
    A: {
        name: 'The Creative Loop',
        description: '기본형 - Gemini 선공. 거시적 관점에서 시작하는 안정적인 순서.',
        leader: 'Gemini',
    },
    B: {
        name: 'The Battle Loop',
        description: '도발형 - Grok 선공. 불을 지르고 시작하는 매운맛 순서.',
        leader: 'Grok',
    },
    C: {
        name: 'The Deep Loop',
        description: '철학형 - Claude 선공. 윤리적 질문으로 시작하는 진지한 순서.',
        leader: 'Claude',
    },
} as const;
