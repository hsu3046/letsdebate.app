import 'server-only';
import type { ExecutionContext, GenerationUsage } from './context';
import { parseGenerationUsage } from './usage';

// Observe the provider response while forwarding identical bytes to the AI SDK.
export function createTrackedFetch(context: ExecutionContext): typeof fetch {
    return async (input, init) => {
        if (context.signal.aborted) throw new Error('EXECUTION_EXPIRED');
        let usage: GenerationUsage = { id: null, model: null, inputTokens: null, outputTokens: null, cost: null };
        const index = context.usage.push(usage) - 1;
        const response = await fetch(input, { ...init, signal: AbortSignal.any([context.signal, ...(init?.signal ? [init.signal] : [])]), cache: 'no-store' });
        if (!response.ok || !response.body) { context.failed = true; return response; }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const isSSE = response.headers.get('content-type')?.includes('text/event-stream');
        let buffer = '';
        const consume = (text: string) => {
            try { usage = parseGenerationUsage(JSON.parse(text), usage); context.usage[index] = usage; }
            catch { /* Heartbeats and [DONE] contain no accounting payload. */ }
        };
        const body = new ReadableStream<Uint8Array>({
            async pull(controller) {
                try {
                    const chunk = await reader.read();
                    buffer += decoder.decode(chunk.value, { stream: !chunk.done });
                    if (buffer.length > 1024 * 1024) { context.failed = true; throw new Error('UPSTREAM_FRAME_TOO_LARGE'); }
                    if (isSSE) {
                        let boundary: RegExpExecArray | null;
                        while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
                            const frame = buffer.slice(0, boundary.index);
                            buffer = buffer.slice(boundary.index + boundary[0].length);
                            const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
                            if (data) consume(data);
                        }
                    }
                    if (chunk.done) {
                        if (!isSSE && buffer) consume(buffer);
                        reader.releaseLock(); controller.close();
                    } else controller.enqueue(chunk.value);
                } catch (error) { context.failed = true; await reader.cancel().catch(() => {}); controller.error(error); }
            },
            async cancel(reason) { context.failed = true; await reader.cancel(reason); },
        });
        return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    };
}
