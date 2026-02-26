// src/lib/prompts/v4/builder.ts

import { getCommonLayer } from './layers/L0_common';
import { getLanguageLayer } from './layers/L0.5_lang';
import { getPersonaLayer } from './layers/L1_persona';
import { getTacticsLayer } from './layers/L2_tactics';
import { getPhaseLayer } from './layers/L3_phase';
import { formatDirectorLayer } from './layers/L4_director';
import { formatCoachLayer } from './layers/L5_coach';
import { getMagicLayer } from './layers/L6_magic';
import type { PromptBuildOptions } from './types';

/**
 * Prompt Builder v4
 * 레이어를 순서대로 조합하여 최종 프롬프트 생성
 */
export function buildPrompt(options: PromptBuildOptions): string {
    const {
        modelId,
        lang = 'ko',
        mode,
        phase,
        directorData,
        coachData,
        fallbackContext,
    } = options;

    // 레이어 순서대로 조합
    const layers: string[] = [
        // L0: 공통 규칙 (헌법)
        getCommonLayer(mode),

        // L0.5: 언어팩
        getLanguageLayer(lang),

        // L1: 페르소나 + 자기인식
        getPersonaLayer(modelId),

        // L2: 전술 (모드별)
        getTacticsLayer(mode),

        // L3: 단계 (Phase) + 모드
        getPhaseLayer(phase, mode),

        // L4: Director 스크립트
        formatDirectorLayer(directorData, mode, options.turnInfo),

        // L5: Coach 지령 (Coach 없으면 fallbackContext 전달, referenceContext는 항상 전달)
        formatCoachLayer(coachData, coachData ? undefined : fallbackContext, options.referenceContext),

        // L6: Magic Line (맨 마지막)
        getMagicLayer(),
    ];

    const finalPrompt = layers.filter(Boolean).join('\n\n');

    // DEBUG
    if (process.env.DEBUG_PROMPT === 'true') {
        console.log('\n========== [PROMPT v4 DEBUG] ==========');
        console.log(`Model: ${modelId} | Mode: ${mode} | Phase: ${phase}`);
        console.log('--------- FULL PROMPT ---------');
        console.log(finalPrompt);
        console.log('--------------------------------\n');
    }

    return finalPrompt;
}

// Temperature 설정
export const MODEL_TEMPERATURES: Record<string, number> = {
    'Gemini': 0.7,
    'Grok': 0.8,
    'Claude': 0.6,
    'DeepSeek': 0.5,
    'ChatGPT': 0.4,
};
