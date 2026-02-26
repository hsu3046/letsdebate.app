// src/lib/prompts/v4/index.ts

/**
 * Prompt System v4
 * 메인 export
 */

// Types
export * from './types';

// Builder
export { buildPrompt, MODEL_TEMPERATURES } from './builder';

// Layer Functions
export { getCommonLayer } from './layers/L0_common';
export { getLanguageLayer } from './layers/L0.5_lang';
export { getPersonaLayer } from './layers/L1_persona';
export { getTacticsLayer } from './layers/L2_tactics';
export { getPhaseLayer } from './layers/L3_phase';
export { buildDirectorSystemPrompt, formatDirectorLayer } from './layers/L4_director';
export { buildCoachSystemPrompt, formatCoachLayer } from './layers/L5_coach';
export { getMagicLayer } from './layers/L6_magic';

// Utility Prompts
export { getSummaryPrompt } from './summary';
