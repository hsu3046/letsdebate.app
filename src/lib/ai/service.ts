import 'server-only';
import { createOpenAI } from '@ai-sdk/openai';

export const AI_SERVICE_UNAVAILABLE = '지금은 AI 경기를 준비하고 있어요. 잠시 후 다시 시작해주세요.';

export function isAIServiceConfigured(): boolean {
    return !!process.env.OPENROUTER_API_KEY?.trim();
}

export function createServiceProvider() {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) throw new Error(AI_SERVICE_UNAVAILABLE);
    return createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1', apiKey,
        headers: { 'HTTP-Referer': 'https://letsdebate.app', 'X-OpenRouter-Title': '왈가왈부' },
    });
}

// An optional operator allowlist applies to both the catalog and match execution.
export function isServiceModelEnabled(id: string): boolean {
    const allowed = process.env.OPENROUTER_ALLOWED_MODELS?.split(',').map(value => value.trim()).filter(Boolean);
    return !allowed?.length || allowed.includes(id);
}
