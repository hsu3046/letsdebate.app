// src/lib/prompts/v4/judge/engine.ts

/**
 * Judge Score Calculator
 * AI가 채점한 Raw 데이터를 받아 최종 점수를 계산하는 순수 함수
 */

import type { RawScore, PenaltyFlags } from './types';

// ===== 가중치 상수 =====
const WEIGHTS = {
    logic: 0.3,
    persuasion: 0.3,
    adherence: 0.2,
    flow: 0.1,
    impact: 0.1,
} as const;

// ===== 페널티 상수 =====
const DEDUCTIONS = {
    instruction: 2.0,  // 지시 불이행
    context: 3.0,      // 동문서답/환각
    word: 0.5,         // 금지어 사용 (개당)
} as const;

/**
 * 최종 점수 계산
 * @param raw AI가 채점한 5대 지표 (0-10)
 * @param penalty 페널티 플래그
 * @returns 최종 점수 (0-10, 소수점 2자리)
 */
export function calculateFinalScore(
    raw: RawScore,
    penalty: PenaltyFlags
): number {
    // 1. 기본 점수 계산 (Weighted Sum)
    const baseScore =
        (raw.logic * WEIGHTS.logic) +
        (raw.persuasion * WEIGHTS.persuasion) +
        (raw.adherence * WEIGHTS.adherence) +
        (raw.flow * WEIGHTS.flow) +
        (raw.impact * WEIGHTS.impact);

    // 2. 페널티 차감 계산
    let deduction = 0;
    if (penalty.instruction_fail) deduction += DEDUCTIONS.instruction;
    if (penalty.context_fail) deduction += DEDUCTIONS.context;
    deduction += (penalty.forbidden_word_count * DEDUCTIONS.word);

    // 3. 최종 점수 (최소 0점 방어 + 소수점 2자리)
    const finalScore = Math.max(0, baseScore - deduction);

    return parseFloat(finalScore.toFixed(2));
}

/**
 * 여러 참가자 중 MVP 선정
 * @param results 각 참가자의 최종 점수 배열
 * @returns MVP의 modelId
 */
export function determineMVP(
    results: Array<{ modelId: string; finalScore: number }>
): string {
    if (results.length === 0) return '';

    const sorted = [...results].sort((a, b) => b.finalScore - a.finalScore);
    return sorted[0].modelId;
}
