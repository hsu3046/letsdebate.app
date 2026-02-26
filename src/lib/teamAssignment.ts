// 팀 배정 로직 for 왈가왈부
// PROS_CONS: 찬성(PRO) vs 반대(CON)
// A_VS_B: A vs B

import type { Topic, Stance, TeamAssignment, TopicType } from '@/lib/types';

// 팀 배정 비율 (AI만)
const AI_ONLY_RATIOS: Record<number, [number, number][]> = {
    2: [[1, 1]],                        // 2명: 1:1
    3: [[1, 2], [2, 1]],                // 3명: 1:2 또는 2:1
    4: [[2, 2], [1, 3], [3, 1]],        // 4명: 2:2 또는 1:3 또는 3:1
    5: [[2, 3], [3, 2]],                // 5명: 2:3 또는 3:2
};

// 팀 배정 비율 (AI + 사람) - 사람 제외 AI만 배정
const AI_WITH_HUMAN_RATIOS: Record<number, [number, number][]> = {
    1: [[1, 0]],                        // AI 1명: 사람 반대편으로 (나중에 결정)
    2: [[1, 1]],                        // AI 2명: 1:1
    3: [[1, 2], [2, 1]],                // AI 3명: 1:2 또는 2:1
    4: [[2, 2]],                        // AI 4명: 2:2
};

/**
 * 팀 배정 함수
 * @param aiParticipantIds AI 참가자 ID 목록
 * @param topicType 토론 주제 타입
 * @param humanIncluded 사람 참가 여부
 * @returns 팀 배정 결과
 */
export function assignTeams(
    aiParticipantIds: string[],
    topicType: TopicType,
    humanIncluded: boolean = false
): TeamAssignment[] {
    // OPEN_ENDED는 팀 배정 없음
    if (topicType === 'OPEN_ENDED') {
        return aiParticipantIds.map(id => ({ participantId: id, stance: 'NONE' as Stance }));
    }

    const aiCount = aiParticipantIds.length;
    const ratios = humanIncluded ? AI_WITH_HUMAN_RATIOS : AI_ONLY_RATIOS;
    const possibleRatios = ratios[aiCount] || [[Math.ceil(aiCount / 2), Math.floor(aiCount / 2)]];

    // 랜덤으로 비율 선택
    const [proCount, conCount] = possibleRatios[Math.floor(Math.random() * possibleRatios.length)];

    // 참가자 셔플
    const shuffled = [...aiParticipantIds].sort(() => Math.random() - 0.5);

    // 스탠스 결정 (PROS_CONS vs A_VS_B)
    const proStance: Stance = topicType === 'PROS_CONS' ? 'PRO' : 'A';
    const conStance: Stance = topicType === 'PROS_CONS' ? 'CON' : 'B';

    return shuffled.map((id, index) => ({
        participantId: id,
        stance: index < proCount ? proStance : conStance,
    }));
}

/**
 * 사람이 1:1 토론에서 오프닝 토크을 하면, AI는 반대 스탠스로 강제 배정
 * @param humanStance 사람이 선택한 스탠스
 * @param topicType 토론 주제 타입
 * @returns AI의 스탠스
 */
export function getOppositeStance(humanStance: Stance, topicType: TopicType): Stance {
    if (topicType === 'PROS_CONS') {
        return humanStance === 'PRO' ? 'CON' : 'PRO';
    } else if (topicType === 'A_VS_B') {
        return humanStance === 'A' ? 'B' : 'A';
    }
    return 'NONE';
}

/**
 * 스탠스를 한글 라벨로 변환
 */
export function getStanceLabel(stance: Stance, topic: Topic): string {
    if (topic.type === 'PROS_CONS') {
        return stance === 'PRO' ? '찬성' : stance === 'CON' ? '반대' : '자유';
    } else if (topic.type === 'A_VS_B') {
        if (!topic.choices) return stance;
        return stance === 'A' ? topic.choices.a : stance === 'B' ? topic.choices.b : '자유';
    }
    return '자유';
}
