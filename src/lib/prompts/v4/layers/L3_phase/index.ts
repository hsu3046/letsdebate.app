// src/lib/prompts/v4/layers/L3_phase/index.ts

import { getOpeningRules } from './opening';
import { getDebateRules } from './debate';
import { getClosingRules } from './closing';

/**
 * [L3: Phase]
 * 현재 토론 진행 단계 + 모드에 따른 지시.
 * @param phase 'opening' | 'debate' | 'closing'
 * @param mode '1v1' | 'vs' | 'roundtable'
 */
export function getPhaseLayer(
    phase: 'opening' | 'debate' | 'closing',
    mode: '1v1' | 'vs' | 'roundtable'
): string {
    // 'vs' → '1v1'로 정규화
    const normalizedMode: '1v1' | 'roundtable' = (mode === '1v1' || mode === 'vs') ? '1v1' : 'roundtable';

    switch (phase) {
        case 'opening': return getOpeningRules(normalizedMode);
        case 'debate': return getDebateRules(normalizedMode);
        case 'closing': return getClosingRules(normalizedMode);
    }
}
