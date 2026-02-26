// src/lib/prompts/v4/layers/L1_persona/index.ts

import { getGeminiPersona } from './gemini';
import { getGrokPersona } from './grok';
import { getClaudePersona } from './claude';
import { getDeepseekPersona } from './deepseek';
import { getChatgptPersona } from './chatgpt';

/**
 * [L1: Persona + Self Awareness]
 * 모델별 고유한 '말투'와 '성격'을 정의.
 * ★ 중요: v3의 L4(Self-Awareness)가 여기에 통합됨.
 * ("너는 AI다"라는 말 금지 등 정체성 유지 포함)
 */
export function getPersonaLayer(modelId: string): string {
    // 모델 ID에 따라 다른 파일 호출
    if (modelId.includes('gemini')) return getGeminiPersona();
    if (modelId.includes('grok')) return getGrokPersona();
    if (modelId.includes('claude')) return getClaudePersona();
    if (modelId.includes('deepseek')) return getDeepseekPersona();
    if (modelId.includes('chatgpt') || modelId.includes('gpt')) return getChatgptPersona();

    return getClaudePersona(); // Default
}
