/**
 * Speaking Order Utilities
 * 모델 속도 기반 정렬 및 상호작용 기반 발언자 선택
 */

import { Character } from './types';

// 로컬 인터페이스 (arena/page.tsx의 ParticipantGaugeState와 호환)
interface ParticipantGauge {
    id: string;
    currentGauge: number;
    maxGauge: number;
}

// 모델 속도 우선순위 (낮을수록 빠름)
export const MODEL_PRIORITY: Record<string, number> = {
    'Gemini': 1,   // 가장 빠름
    'Claude': 2,
    'Grok': 3,
    'ChatGPT': 4,  // 가장 느림
};

/**
 * 참가자를 모델 속도 순으로 정렬
 */
export function sortParticipantsByModelSpeed<T extends { id: string }>(
    participants: T[],
    getCharacter: (id: string) => Character | undefined
): T[] {
    return [...participants].sort((a, b) => {
        const charA = getCharacter(a.id);
        const charB = getCharacter(b.id);

        const priorityA = MODEL_PRIORITY[charA?.aiModel || ''] ?? 99;
        const priorityB = MODEL_PRIORITY[charB?.aiModel || ''] ?? 99;

        return priorityA - priorityB;
    });
}


/**
 * 본토론 첫 발언자 선택 (모델 속도 순 중 체력 가장 높은 캐릭터)
 */
export function selectFirstDebateSpeaker(
    gauges: ParticipantGauge[],
    getCharacter: (id: string) => Character | undefined
): string {
    const sortedBySpeed = [...gauges].sort((a, b) => {
        const charA = getCharacter(a.id);
        const charB = getCharacter(b.id);
        const priorityA = MODEL_PRIORITY[charA?.aiModel || ''] ?? 99;
        const priorityB = MODEL_PRIORITY[charB?.aiModel || ''] ?? 99;
        return priorityA - priorityB;
    });

    // 속도 순 정렬 중 체력이 있는 첫 번째
    const firstAvailable = sortedBySpeed.find(g => g.currentGauge > 0);
    return firstAvailable?.id || sortedBySpeed[0].id;
}
