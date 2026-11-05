// Local stand-in for the two external services the app depends on, so the real
// Next.js server code (auth, execution ledger, SSE streaming, judging) can be
// exercised end to end without network access or paid API calls.
//
//  - Supabase:   /auth/v1/* (Google OAuth via PKCE, user lookup, logout)
//                /rest/v1/* (the subset of PostgREST the app uses), backed by
//                PGlite running the real migration in supabase/migrations.
//  - OpenRouter: /api/v1/models and /api/v1/chat/completions (stream + JSON).
//
// Behaviour switches are read from the debate topic so a browser test can pick
// a scenario: [[slow]], [[fail-429]], [[bad-judge]], [[fenced-judge]], [[cut]].
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const root = path.resolve(import.meta.dirname, '../..');
export const FAKE_SECRET_KEY = 'sb_secret_fake_e2e_only';
export const FAKE_PUBLISHABLE_KEY = 'sb_publishable_fake_e2e_only';
export const FAKE_OPENROUTER_KEY = 'sk-or-fake-e2e-only';
export const FAKE_USER = { id: 'aa000000-0000-4000-8000-00000000e2e1', email: 'fan@example.test', name: '테스트 팬' };

const b64url = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function fakeJWT(sub, expiresAt) {
    return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub, exp: expiresAt, aud: 'authenticated', role: 'authenticated', email: FAKE_USER.email })}.${b64url('fake-signature')}`;
}

function userJSON() {
    return {
        id: FAKE_USER.id, aud: 'authenticated', role: 'authenticated', email: FAKE_USER.email,
        app_metadata: { provider: 'google', providers: ['google'] },
        user_metadata: { full_name: FAKE_USER.name, name: FAKE_USER.name },
        identities: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', is_anonymous: false,
    };
}

async function readBody(request) {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
}

function send(response, status, body, headers = {}) {
    const payload = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
    response.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    response.end(payload);
}

// --- Debate text -----------------------------------------------------------------
const SPEECH = {
    a: [
        '저는 찬성 입장입니다. 첫째, 이 변화는 개인의 선택권을 넓혀 줍니다. 둘째, 이미 여러 현장에서 비슷한 시도가 긍정적인 결과를 보였습니다. 셋째, 부작용은 제도적 보완으로 충분히 줄일 수 있습니다. 따라서 변화를 늦추기보다 기준을 세우고 받아들이는 편이 더 현명합니다.',
        '상대는 부작용을 강조하지만 위험이 있다는 사실이 곧 금지의 근거가 되지는 않습니다. 운전에도 위험이 있지만 우리는 면허와 규칙으로 관리합니다. 같은 방식으로 단계적 도입과 평가 지표를 두면 우려를 구체적으로 줄일 수 있습니다.',
        '정리하겠습니다. 상대는 막연한 불안을 근거로 들었지만 저는 관리 가능한 위험과 분명한 이익을 비교했습니다. 기준을 세워 받아들이는 것이 개인과 사회 모두에게 이득이라는 입장을 유지합니다.',
    ],
    b: [
        '저는 반대 입장입니다. 변화의 속도보다 중요한 것은 그 비용을 누가 부담하느냐입니다. 준비되지 않은 상태에서 도입하면 정보와 자원이 부족한 사람들이 가장 먼저 피해를 봅니다. 신중한 검증이 먼저입니다.',
        '상대는 제도적 보완을 말하지만 그 보완이 언제, 누구의 책임으로 이뤄지는지 설명하지 않았습니다. 운전 비유도 면허 제도가 오랜 사고 끝에 생겼다는 점을 보여 줄 뿐입니다. 사고를 먼저 겪고 고치자는 접근은 받아들이기 어렵습니다.',
        '결론적으로 저는 변화 자체가 아니라 준비 없는 변화를 반대합니다. 검증 기간과 책임 주체가 분명해질 때까지 속도를 늦추는 것이 가장 많은 사람을 보호하는 선택입니다.',
    ],
};

function speechFor(side, round, turns) {
    const index = round === 1 ? 0 : round === turns ? 2 : 1;
    return SPEECH[side][index];
}

function verdictFor(transcript, modelId) {
    // Deterministic but varied winner so different brackets produce different champions.
    const hash = createHash('sha256').update(transcript + modelId).digest()[0];
    const winner = hash % 2 === 0 ? 'a' : 'b';
    const high = 78 + (hash % 12), low = high - 3 - (hash % 7);
    return {
        winner, scores: { a: winner === 'a' ? high : low, b: winner === 'b' ? high : low },
        reason: `${winner.toUpperCase()}는 상대 주장의 빈틈을 구체적으로 짚고 자신의 입장을 끝까지 일관되게 유지했습니다.`,
        highlights: { a: '구체적인 비유로 주장을 설명했지만 근거의 출처가 부족했습니다.', b: '책임 주체를 묻는 반박이 날카로웠지만 대안 제시가 약했습니다.' },
    };
}

// --- Server -------------------------------------------------------------------------
export async function startFakeBackend({ port = 0, catalogPath } = {}) {
    const db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
        create table auth.users(id uuid primary key); insert into auth.users values ('${FAKE_USER.id}');`);
    await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/202609060001_ai_execution_access.sql'), 'utf8'));

    const catalog = catalogPath && fs.existsSync(catalogPath) ? JSON.parse(fs.readFileSync(catalogPath, 'utf8')) : null;
    const codes = new Map();   // auth code -> code_challenge
    const tokens = new Set();  // valid access tokens
    const log = [];            // every upstream AI request, for assertions
    const state = { chatDelayMs: 8 };

    const server = http.createServer(async (request, response) => {
        const url = new URL(request.url, 'http://fake.local');
        try {
            // ---- test control ----
            if (url.pathname === '/__fake/requests') return send(response, 200, log);
            if (url.pathname === '/__fake/executions') {
                const { rows } = await db.query('select id, operation, status, response_status, cost_usd::float as cost, usage from public.debate_ai_executions order by created_at');
                return send(response, 200, rows);
            }
            if (url.pathname === '/__fake/fill-quota' && request.method === 'POST') {
                // Simulate matches already started today so the daily limit can be exercised.
                const { count = 1 } = JSON.parse(await readBody(request) || '{}');
                for (let index = 0; index < count; index++) {
                    await db.query(`insert into public.debate_ai_executions(user_id, request_key, fingerprint, operation, status) values ($1, $2, 'seed', 'match', 'completed')`, [FAKE_USER.id, randomUUID()]);
                }
                return send(response, 200, { inserted: count });
            }
            if (url.pathname === '/__fake/reset-ledger' && request.method === 'POST') {
                await db.query('delete from public.debate_ai_executions');
                log.length = 0;
                return send(response, 200, { ok: true });
            }
            if (url.pathname === '/__fake/config' && request.method === 'POST') {
                Object.assign(state, JSON.parse(await readBody(request) || '{}'));
                return send(response, 200, state);
            }

            // ---- Supabase Auth ----
            if (url.pathname === '/auth/v1/authorize') {
                // Stands in for Google + Supabase: consent is implicit, redirect back with a code.
                const challenge = url.searchParams.get('code_challenge');
                const redirectTo = url.searchParams.get('redirect_to');
                if (!challenge || !redirectTo) return send(response, 400, { error: 'missing PKCE challenge or redirect_to' });
                const code = randomUUID();
                codes.set(code, challenge);
                const target = new URL(redirectTo);
                target.searchParams.set('code', code);
                response.writeHead(302, { Location: target.toString() });
                return response.end();
            }
            if (url.pathname === '/auth/v1/token') {
                const body = JSON.parse(await readBody(request) || '{}');
                if (url.searchParams.get('grant_type') === 'pkce') {
                    const challenge = codes.get(body.auth_code);
                    codes.delete(body.auth_code);
                    const computed = body.code_verifier ? createHash('sha256').update(body.code_verifier).digest('base64url') : '';
                    if (!challenge || computed !== challenge) return send(response, 400, { error: 'invalid_grant', error_description: 'PKCE verification failed', code: 'bad_code_verifier' });
                } else if (url.searchParams.get('grant_type') === 'refresh_token') {
                    if (!String(body.refresh_token || '').startsWith('refresh-')) return send(response, 400, { error: 'invalid_grant', code: 'refresh_token_not_found' });
                } else return send(response, 400, { error: 'unsupported_grant_type' });
                const expiresAt = Math.floor(Date.now() / 1000) + 3600;
                const accessToken = fakeJWT(FAKE_USER.id, expiresAt);
                tokens.add(accessToken);
                return send(response, 200, { access_token: accessToken, token_type: 'bearer', expires_in: 3600, expires_at: expiresAt, refresh_token: `refresh-${randomUUID()}`, user: userJSON() });
            }
            if (url.pathname === '/auth/v1/user') {
                const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
                if (!token || !tokens.has(token)) return send(response, 401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' });
                return send(response, 200, userJSON());
            }
            if (url.pathname === '/auth/v1/logout') {
                const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
                if (token) tokens.delete(token);
                response.writeHead(204); return response.end();
            }

            // ---- Supabase PostgREST (service role only) ----
            if (url.pathname.startsWith('/rest/v1/')) {
                if (request.headers.apikey !== FAKE_SECRET_KEY) return send(response, 401, { message: 'service role key required' });
                if (url.pathname === '/rest/v1/rpc/debate_reserve_execution' && request.method === 'POST') {
                    const args = JSON.parse(await readBody(request));
                    const { rows } = await db.query('select public.debate_reserve_execution($1,$2,$3,$4,$5,$6) as result',
                        [args.p_user_id, args.p_request_key, args.p_fingerprint, args.p_operation, args.p_daily_match_limit, args.p_daily_assist_limit]);
                    return send(response, 200, rows[0].result);
                }
                if (url.pathname === '/rest/v1/debate_ai_executions') return await table(request, response, url);
                return send(response, 404, { message: 'unknown relation' });
            }

            // ---- OpenRouter ----
            if (url.pathname.startsWith('/api/v1/')) {
                if (url.pathname === '/api/v1/models') {
                    if (!catalog) return send(response, 503, { error: 'no catalog fixture' });
                    return send(response, 200, catalog);
                }
                if (url.pathname === '/api/v1/chat/completions' && request.method === 'POST') {
                    if (request.headers.authorization !== `Bearer ${FAKE_OPENROUTER_KEY}`) return send(response, 401, { error: { message: 'bad key', code: 401 } });
                    return await chat(request, response);
                }
            }
            send(response, 404, { error: `fake backend: no route for ${request.method} ${url.pathname}` });
        } catch (error) {
            console.error('[fake-backend]', error);
            if (!response.headersSent) send(response, 500, { message: String(error?.message || error) });
            else response.end();
        }
    });

    const COLUMNS = new Set(['id', 'user_id', 'operation', 'status', 'created_at', 'expires_at', 'finished_at', 'response_body', 'response_type', 'response_status', 'usage', 'cost_usd']);
    function where(url) {
        const clauses = [], values = [];
        for (const [key, raw] of url.searchParams) {
            if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
            if (!COLUMNS.has(key)) throw new Error(`unsupported filter ${key}`);
            const [op, ...rest] = raw.split('.');
            const sql = { eq: '=', gte: '>=', lte: '<=', gt: '>', lt: '<' }[op];
            if (!sql) throw new Error(`unsupported operator ${op}`);
            values.push(rest.join('.'));
            clauses.push(`${key} ${sql} $${values.length}`);
        }
        return { sql: clauses.length ? `where ${clauses.join(' and ')}` : '', values };
    }
    async function table(request, response, url) {
        const filter = where(url);
        if (request.method === 'PATCH') {
            const body = JSON.parse(await readBody(request));
            const keys = Object.keys(body).filter(key => COLUMNS.has(key));
            const values = [...filter.values];
            const sets = keys.map(key => { values.push(typeof body[key] === 'object' && body[key] !== null ? JSON.stringify(body[key]) : body[key]); return `${key} = $${values.length}`; });
            await db.query(`update public.debate_ai_executions set ${sets.join(', ')} ${filter.sql}`, values);
            response.writeHead(204); return response.end();
        }
        if (request.method === 'GET' || request.method === 'HEAD') {
            const select = (url.searchParams.get('select') || '*').split(',').filter(column => column === '*' || COLUMNS.has(column));
            const order = url.searchParams.get('order');
            const [orderColumn, direction] = order ? order.split('.') : [];
            const orderSQL = orderColumn && COLUMNS.has(orderColumn) ? `order by ${orderColumn} ${direction === 'desc' ? 'desc' : 'asc'}` : '';
            const limit = Number(url.searchParams.get('limit')) || null;
            const { rows } = await db.query(`select ${select.join(',')} from public.debate_ai_executions ${filter.sql} ${orderSQL} ${limit ? `limit ${limit}` : ''}`, filter.values);
            const { rows: [{ count }] } = await db.query(`select count(*)::int as count from public.debate_ai_executions ${filter.sql}`, filter.values);
            const headers = { 'Content-Range': `0-${Math.max(0, rows.length - 1)}/${count}` };
            if (request.method === 'HEAD') { response.writeHead(200, headers); return response.end(); }
            return send(response, 200, rows, headers);
        }
        send(response, 405, { message: 'method not supported by fake' });
    }

    async function chat(request, response) {
        const body = JSON.parse(await readBody(request));
        const system = body.messages.find(message => message.role === 'system')?.content || '';
        const user = body.messages.filter(message => message.role === 'user').map(message => typeof message.content === 'string' ? message.content : message.content.map(part => part.text).join('')).join('\n');
        const isJudge = system.includes('심판');
        const generationId = `gen-${randomUUID()}`;
        log.push({ id: generationId, model: body.model, stream: !!body.stream, judge: isJudge, roles: body.messages.map(message => message.role), max_tokens: body.max_tokens ?? null, max_completion_tokens: body.max_completion_tokens ?? null, temperature: body.temperature ?? null, include_usage: body.stream_options?.include_usage ?? null, at: Date.now() });
        const usage = { prompt_tokens: Math.ceil((system.length + user.length) / 2), completion_tokens: 180, total_tokens: 0, cost: 0.00042 };

        if (user.includes('[[fail-429]]') && !isJudge) return send(response, 429, { error: { message: 'Rate limit exceeded', code: 429 } });

        let content;
        if (isJudge) {
            const verdict = verdictFor(user, body.model);
            content = user.includes('[[bad-judge]]') ? '판정: A가 더 설득력 있었습니다.' : JSON.stringify(verdict);
            if (user.includes('[[fenced-judge]]')) content = '```json\n' + JSON.stringify(verdict, null, 2) + '\n```';
        } else {
            const side = /토론자 B입니다/.test(system) ? 'b' : 'a';
            const [, round, turns] = user.match(/(\d)\/(\d) 라운드/) || [null, '1', '2'];
            content = speechFor(side, Number(round), Number(turns));
        }

        if (!body.stream) {
            await sleep(state.chatDelayMs * 5);
            return send(response, 200, { id: generationId, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: body.model, choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }], usage });
        }

        response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        let clientGone = false;
        response.on('close', () => { clientGone = true; });
        const frame = data => response.write(`data: ${JSON.stringify(data)}\n\n`);
        const base = { id: generationId, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: body.model };
        response.write(': OPENROUTER PROCESSING\n\n');
        frame({ ...base, choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }] });
        const slow = user.includes('[[slow]]');
        const cut = user.includes('[[cut]]');
        const pieces = content.match(/.{1,12}/gs) || [];
        for (const [index, piece] of pieces.entries()) {
            if (clientGone) return;
            if (cut && index === Math.floor(pieces.length / 2)) { response.destroy(); return; }
            frame({ ...base, choices: [{ index: 0, delta: { content: piece }, finish_reason: null }] });
            await sleep(slow ? 120 : state.chatDelayMs);
        }
        frame({ ...base, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] });
        frame({ ...base, choices: [], usage });
        response.write('data: [DONE]\n\n');
        response.end();
    }

    await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
    const address = server.address();
    return {
        url: `http://127.0.0.1:${address.port}`,
        db, log,
        close: async () => { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); await db.close(); },
    };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const backend = await startFakeBackend({ port: Number(process.env.FAKE_PORT || 54329), catalogPath: process.env.FAKE_CATALOG });
    console.log(`fake backend listening on ${backend.url}`);
}
