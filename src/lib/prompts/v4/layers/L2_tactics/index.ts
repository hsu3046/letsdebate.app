// src/lib/prompts/v4/layers/L2_tactics/index.ts

import { get1v1Tactics } from './vs';
import { getRoundTableTactics } from './roundtable';

/**
 * [L2: Tactics]
 * 토론 모드에 따른 행동 강령.
 * @param mode '1v1' | 'vs' (공격적) | 'roundtable' (경청/확장)
 */
export function getTacticsLayer(mode: '1v1' | 'vs' | 'roundtable'): string {
    if (mode === '1v1' || mode === 'vs') {
        return get1v1Tactics(); // 공격적, Zero-sum
    } else {
        return getRoundTableTactics(); // 중재적, Non-zero-sum
    }
}
