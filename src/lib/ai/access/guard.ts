import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAdminClient, getVerifiedUser, authJSON } from '@/lib/auth/server';
import { isSameOrigin } from '@/lib/auth/policy';
import { isAIServiceConfigured, AI_SERVICE_UNAVAILABLE } from '@/lib/ai/service';
import { executionContext, type ExecutionContext } from './context';
import { totalCost } from './usage';

export function dailyLimit(kind: 'match' | 'assist'): number {
    const value = Number(process.env[kind === 'match' ? 'AI_DAILY_MATCH_LIMIT' : 'AI_DAILY_ASSIST_LIMIT'] || (kind === 'match' ? 3 : 30));
    if (!Number.isSafeInteger(value) || value < 1 || value > 1000) throw new Error('INVALID_QUOTA');
    return value;
}
const reservationSchema = z.union([
    z.object({ id: z.uuid(), remaining: z.number().int().nonnegative() }),
    z.object({ replay: z.literal(true), body: z.string(), contentType: z.string(), status: z.number().int().min(200).max(599) }),
    z.object({ error: z.enum(['conflict','duplicate','busy','quota']) }),
]);

async function boundedBody(request: Request) {
    const reader = request.clone().body?.getReader();
    if (!reader) return '';
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            length += value.byteLength;
            if (length > 65536) throw new Error('BODY_TOO_LARGE');
            chunks.push(value);
        }
    } finally { void reader.cancel().catch(() => {}); }
    return Buffer.concat(chunks).toString('utf8');
}

export function withAIRequest<T extends Request>(operation: 'match' | 'assist', handler: (request: T) => Promise<Response>) {
    return async (request: T): Promise<Response> => {
        if (!isSameOrigin(request)) return authJSON({ error: '요청한 페이지를 확인해 주세요.' }, 403);
        if (!isAIServiceConfigured()) return authJSON({ error: AI_SERVICE_UNAVAILABLE }, 503);
        let admin: ReturnType<typeof createAdminClient>;
        let executionId: string;
        let userId: string;
        try {
            const user = await getVerifiedUser();
            if (!user) return authJSON({ error: '로그인하고 AI 토론 배틀을 시작해 보세요.', code: 'LOGIN_REQUIRED' }, 401);
            userId = user.id;
            const suppliedKey = request.headers.get('Idempotency-Key');
            if ((operation === 'match' && !suppliedKey) || (suppliedKey && !z.uuid().safeParse(suppliedKey).success)) return authJSON({ error: '경기 요청을 다시 만들어 주세요.' }, 400);
            const fingerprint = createHash('sha256').update(new URL(request.url).pathname + '\n' + await boundedBody(request)).digest('hex');
            admin = createAdminClient();
            const { data, error } = await admin.rpc('debate_reserve_execution', {
                p_user_id: userId, p_request_key: suppliedKey || randomUUID(), p_fingerprint: fingerprint, p_operation: operation,
                p_daily_match_limit: dailyLimit('match'), p_daily_assist_limit: dailyLimit('assist'),
            });
            if (error) throw new Error('RESERVATION_FAILED');
            const reservation = reservationSchema.parse(data);
            if ('error' in reservation) {
                const exhausted = reservation.error === 'quota';
                return authJSON({ error: exhausted ? '오늘의 AI 이용 횟수를 모두 사용했어요. 내일 다시 만나요.' : '이미 진행한 요청이거나 다른 AI 응답을 기다리고 있어요. 잠시 후 다시 확인해 주세요.', code: exhausted ? 'DAILY_LIMIT' : 'EXECUTION_CONFLICT' }, exhausted ? 429 : 409);
            }
            if ('replay' in reservation) return new Response(reservation.body, { status: reservation.status, headers: { 'Content-Type': reservation.contentType, 'Cache-Control': 'private, no-store', 'X-Execution-Replay': 'true' } });
            executionId = reservation.id;
        } catch (error) {
            if (error instanceof Error && error.message === 'BODY_TOO_LARGE') return authJSON({ error: '입력한 내용이 너무 길어요.' }, 413);
            return authJSON({ error: '로그인이나 이용 한도를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.' }, 503);
        }
        const cancel = new AbortController();
        const context: ExecutionContext = { signal: AbortSignal.any([request.signal, cancel.signal, AbortSignal.timeout(270000)]), usage: [], failed: false };
        let settled = false;
        const settle = async (body: string, type: string, status: number) => {
            if (settled) return;
            settled = true;
            const failed = context.failed || context.signal.aborted || status >= 400 || (type.includes('text/event-stream') && body.split('\n\n').some(frame => {
                try { return JSON.parse(frame.replace(/^data:\s*/, '')).type === 'error'; } catch { return false; }
            }));
            const { error } = await admin.from('debate_ai_executions').update({
                status: failed ? 'failed' : 'completed', finished_at: new Date().toISOString(),
                response_body: failed ? null : body, response_type: type, response_status: status,
                usage: context.usage, cost_usd: totalCost(context.usage),
            }).eq('id', executionId).eq('user_id', userId);
            if (error) { console.error('AI 이용 기록 저장 실패', { executionId }); throw new Error('ACCOUNTING_FAILED'); }
        };
        try {
            const response = await executionContext.run(context, () => handler(request));
            const type = response.headers.get('content-type') || 'text/plain; charset=utf-8';
            if (!response.body) { await settle('', type, response.status); return response; }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let saved = '';
            const stream = new ReadableStream<Uint8Array>({
                async pull(controller) {
                    try {
                        const { value, done } = await reader.read();
                        saved += decoder.decode(value, { stream: !done });
                        if (saved.length > 262144) throw new Error('RESPONSE_TOO_LARGE');
                        if (done) { await settle(saved, type, response.status); reader.releaseLock(); controller.close(); }
                        else controller.enqueue(value);
                    } catch (error) {
                        context.failed = true; cancel.abort(); await reader.cancel().catch(() => {});
                        await settle('', type, 500).catch(() => {}); controller.error(error);
                    }
                },
                async cancel(reason) { context.failed = true; cancel.abort(); await reader.cancel(reason).catch(() => {}); await settle('', type, 499).catch(() => {}); },
            });
            const headers = new Headers(response.headers);
            headers.set('Cache-Control', 'private, no-store, no-transform');
            headers.set('X-Execution-Id', executionId);
            return new Response(stream, { status: response.status, headers });
        } catch {
            context.failed = true; cancel.abort(); await settle('', 'application/json', 500).catch(() => {});
            return authJSON({ error: 'AI 응답을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.' }, 502);
        }
    };
}
