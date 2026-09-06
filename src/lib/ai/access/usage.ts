import type { GenerationUsage } from './context';

function count(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
// Unknown cost stays null; interrupted upstream streams must never be reported as free.
export function parseGenerationUsage(value: unknown, current: GenerationUsage): GenerationUsage {
    if (typeof value !== 'object' || value === null) return current;
    const item = value as Record<string, unknown>;
    const usage = typeof item.usage === 'object' && item.usage !== null ? item.usage as Record<string, unknown> : {};
    return {
        id: typeof item.id === 'string' ? item.id : current.id,
        model: typeof item.model === 'string' ? item.model : current.model,
        inputTokens: count(usage.prompt_tokens) ?? current.inputTokens,
        outputTokens: count(usage.completion_tokens) ?? current.outputTokens,
        cost: count(usage.cost) ?? current.cost,
    };
}
export function totalCost(items: GenerationUsage[]): number | null {
    return items.length && items.every(item => item.cost !== null) ? items.reduce((sum, item) => sum + item.cost!, 0) : null;
}
