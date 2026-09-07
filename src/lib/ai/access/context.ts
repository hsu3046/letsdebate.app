import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface GenerationUsage {
    id: string | null;
    model: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    cost: number | null;
}
export interface ExecutionContext {
    signal: AbortSignal;
    usage: GenerationUsage[];
    failed: boolean;
}
export const executionContext = new AsyncLocalStorage<ExecutionContext>();
