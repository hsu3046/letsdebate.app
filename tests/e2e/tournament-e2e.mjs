// Full-stack E2E: real Next.js production build + real route handlers, with only the
// two external services replaced by tests/e2e/fake-backend.mjs. Nothing is mocked
// inside the browser, so login cookies, PKCE, the execution ledger, SSE streaming,
// judging and bracket advancement all run through production code paths.
//
//   npm run test:e2e              # builds, starts everything, runs, tears down
//   E2E_SKIP_BUILD=1 npm run test:e2e
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { startFakeBackend, FAKE_OPENROUTER_KEY, FAKE_PUBLISHABLE_KEY, FAKE_SECRET_KEY } from './fake-backend.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(import.meta.dirname, '../..');
const port = Number(process.env.E2E_PORT || 3100);
const backendPort = Number(process.env.E2E_BACKEND_PORT || 54329);
// Use 127.0.0.1 on purpose: `next start` reports `localhost` in request.url, which used to
// break the same-origin check and the OAuth callback for any other host name.
const base = `http://127.0.0.1:${port}`;
const output = process.env.TEST_OUTPUT_DIR || path.join(root, 'test-results/e2e');

const allowed = 'google/gemini-3.8-flash,anthropic/claude-haiku-4.5,openai/gpt-5.6-luna,x-ai/grok-4.6,deepseek/deepseek-v4-pro-0813,qwen/qwen3.8-flash,moonshotai/kimi-k2.6,upstage/solar-pro4,z-ai/glm-5.3-flash,minimax/minimax-m3';
const backendURL = `http://127.0.0.1:${backendPort}`;
const env = {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: backendURL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: FAKE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: FAKE_SECRET_KEY,
    OPENROUTER_API_KEY: FAKE_OPENROUTER_KEY,
    OPENROUTER_BASE_URL: `${backendURL}/api/v1`,
    OPENROUTER_ALLOWED_MODELS: allowed,
    AI_EXECUTION_ENABLED: 'true',
    AI_DAILY_MATCH_LIMIT: '10',
    AI_DAILY_ASSIST_LIMIT: '30',
};

const checks = [];
const check = name => { checks.push(name); console.log(`  ✓ ${name}`); };
const fake = async (route, body) => (await fetch(backendURL + route, body ? { method: 'POST', body: JSON.stringify(body) } : undefined)).json();

fs.mkdirSync(output, { recursive: true });
const backend = await startFakeBackend({ port: backendPort, catalogPath: path.join(import.meta.dirname, 'fixtures/openrouter-models.json') });
let server, browser, page, serverLog = '';
try {
    if (!process.env.E2E_SKIP_BUILD) {
        console.log('building…');
        const build = spawnSync(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build'], { cwd: root, env, encoding: 'utf8' });
        if (build.status !== 0) { console.error(build.stdout, build.stderr); throw new Error('next build failed'); }
    }
    server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', chunk => { serverLog += chunk; });
    server.stderr.on('data', chunk => { serverLog += chunk; });
    for (let attempt = 0; ; attempt++) {
        try { if ((await fetch(base + '/api/auth/session')).ok) break; } catch { /* starting */ }
        if (attempt > 60) throw new Error('server did not start\n' + serverLog);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.setDefaultTimeout(20000);

    // 1. Catalog comes from the (fake) OpenRouter through the server allowlist.
    const catalog = await (await fetch(base + '/api/models')).json();
    assert.equal(catalog.models.length, allowed.split(',').length);
    assert.ok(!catalog.models.some(model => model.id === 'example/image-only'));
    check('model catalog: server allowlist + text-only filter');

    // 2. Anonymous user builds a bracket.
    await page.goto(base + '/tournament/new');
    await page.getByLabel('토론 주제', { exact: true }).fill('재택근무는 회사와 직원 모두에게 이득일까?');
    await page.locator('.model-option').first().waitFor();
    for (const name of ['Gemini 3.8 Flash', 'Claude Haiku 4.5', 'GPT-5.6 Luna', 'Grok 4.6']) {
        await page.locator('.model-option').filter({ hasText: name }).click();
    }
    await page.getByRole('button', { name: '심판 선택', exact: true }).click();
    await page.getByRole('dialog').locator('.model-option').filter({ hasText: 'Solar Pro 4' }).click();
    await page.getByRole('button', { name: '대진표 만들기', exact: true }).click();
    await page.waitForURL('**/tournament?id=*');
    const tournamentURL = page.url();
    assert.equal(await page.locator('.bracket-match').count(), 3);
    check('anonymous bracket creation (4 entrants, judge)');

    // 3. Starting requires login; real PKCE round trip through Supabase Auth (fake) returns to the bracket.
    await page.getByRole('button', { name: '로그인하고 경기 시작' }).click();
    await page.waitForURL('**/login?next=*');
    await page.getByRole('button', { name: 'Google로 계속하기' }).click();
    await page.waitForURL(url => url.href.startsWith(tournamentURL.split('?')[0]) && url.searchParams.has('id'));
    assert.equal(new URL(page.url()).host, `127.0.0.1:${port}`, 'OAuth callback must return to the host the user started on');
    await page.getByRole('button', { name: '이 경기 시작하기' }).waitFor();
    const cookies = await context.cookies();
    assert.ok(cookies.some(cookie => cookie.name.startsWith('sb-') && cookie.httpOnly), 'session cookie is HttpOnly');
    check('Google OAuth (PKCE) login returns to the same bracket on 127.0.0.1');

    // 4. Match 1 streams, gets judged, and advances the winner.
    await page.getByRole('button', { name: '이 경기 시작하기' }).click();
    await page.locator('.debate-message.streaming').waitFor();
    check('live streaming message visible');
    await page.locator('.verdict-panel').waitFor({ timeout: 30000 });
    assert.equal(await page.locator('.debate-message').count(), 4);
    let ledger = await fake('/__fake/executions');
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].status, 'completed');
    assert.equal(ledger[0].usage.length, 5, '4 speeches + 1 judge recorded');
    assert.ok(Math.abs(ledger[0].cost - 0.0021) < 1e-9, `cost recorded: ${ledger[0].cost}`);
    const requests = await fake('/__fake/requests');
    assert.deepEqual(requests.map(item => item.model), ['google/gemini-3.8-flash', 'anthropic/claude-haiku-4.5', 'anthropic/claude-haiku-4.5', 'google/gemini-3.8-flash', 'upstage/solar-pro4'], 'speaking order alternates each round, judge last');
    for (const item of requests) {
        assert.deepEqual(item.roles, ['system', 'user'], 'standard system role, never the OpenAI-only developer role');
        assert.equal(item.max_tokens, 4096);
        assert.equal(item.max_completion_tokens, null);
        assert.deepEqual(item.reasoning, { effort: 'low', exclude: true }, 'reasoning kept short for timely speeches');
        if (item.stream) assert.equal(item.include_usage, true, 'streamed calls request usage so cost can be recorded');
    }
    check('match 1: 4 speeches + verdict, ledger completed with usage/cost, speaking order alternates');
    check('OpenRouter requests use standard chat params (system role, max_tokens, include_usage)');
    await page.screenshot({ path: path.join(output, 'match-1-verdict.png'), fullPage: true });

    // 5. Stop match 2 mid-stream → interrupted; restart from scratch completes.
    await fake('/__fake/config', { chatDelayMs: 60 });
    await page.getByRole('button', { name: /다음 경기 보기/ }).click();
    await page.getByRole('button', { name: '이 경기 시작하기' }).click();
    await page.locator('.debate-message.streaming').waitFor();
    await page.getByRole('button', { name: '경기 중단' }).click();
    await page.getByRole('alert').filter({ hasText: '경기를 중단했어요' }).waitFor();
    await page.waitForFunction(async () => (await (await fetch('/api/account')).json()).recent?.[0]?.status === 'failed');
    ledger = await fake('/__fake/executions');
    assert.equal(ledger.at(-1).status, 'failed');
    check('stop mid-match → interrupted in UI, ledger marked failed');
    await fake('/__fake/config', { chatDelayMs: 8 });
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '처음부터 다시 시작' }).click();
    await page.locator('.verdict-panel').waitFor({ timeout: 30000 });
    check('restart after interrupt completes');

    // 6. Reload while running → interrupted locally, transcript kept.
    await fake('/__fake/config', { chatDelayMs: 60 });
    await page.getByRole('button', { name: /다음 경기 보기/ }).click();
    await page.getByRole('button', { name: '이 경기 시작하기' }).click();
    await page.locator('.debate-message:not(.streaming)').first().waitFor({ timeout: 30000 });
    await page.reload();
    await page.getByRole('alert').filter({ hasText: '페이지가 닫혀 경기가 중단됐어요' }).waitFor();
    assert.ok(await page.locator('.debate-message').count() >= 1, 'completed speeches survive reload');
    check('reload during final → interrupted, completed speeches kept');
    await fake('/__fake/config', { chatDelayMs: 8 });
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '처음부터 다시 시작' }).click();
    await page.locator('.champion-banner').waitFor({ timeout: 30000 });
    check('final completes → champion banner');
    await page.screenshot({ path: path.join(output, 'champion.png'), fullPage: true });

    // 7. Idempotency: replaying a completed run key returns the stored response without new AI calls.
    const replay = await page.evaluate(async () => {
        const store = JSON.parse(localStorage.getItem('walgawalbu-tournaments'));
        const tournament = store.state.tournaments[0];
        const match = tournament.matches[0];
        const body = JSON.stringify({ topic: tournament.topic, context: tournament.context, a: match.a.id, b: match.b.id, judge: tournament.judge.id, turnsPerSide: tournament.turnsPerSide });
        const response = await fetch('/api/tournament/match', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': match.runId }, body });
        return { status: response.status, replay: response.headers.get('X-Execution-Replay'), text: await response.text() };
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.replay, 'true');
    assert.match(replay.text, /"type":"verdict"/);
    check('same Idempotency-Key replays stored result');

    // 8. Account page shows real usage from the ledger.
    await page.goto(base + '/account');
    const used = (await fake('/__fake/executions')).filter(item => item.operation === 'match').length;
    await page.getByText(`${10 - used} / 10`, { exact: true }).waitFor();
    check(`account page shows remaining quota (${10 - used}/10)`);

    // 9. Failure modes surface a clear message and never advance the bracket.
    const scenario = async (topic, expected) => {
        await page.goto(base + '/tournament/new');
        await page.getByLabel('토론 주제', { exact: true }).fill(topic);
        await page.locator('.model-option').first().waitFor();
        for (const name of ['Qwen3.8 Flash', 'Kimi K2.6', 'GLM 5.3 Flash', 'MiniMax M3']) await page.locator('.model-option').filter({ hasText: name }).click();
        await page.getByRole('button', { name: '심판 선택', exact: true }).click();
        await page.getByRole('dialog').locator('.model-option').filter({ hasText: 'Solar Pro 4' }).click();
        await page.getByRole('button', { name: '대진표 만들기', exact: true }).click();
        await page.waitForURL('**/tournament?id=*');
        await page.getByRole('button', { name: '이 경기 시작하기' }).click();
        await page.getByRole('alert').filter({ hasText: expected }).waitFor({ timeout: 30000 });
        assert.equal(await page.locator('.verdict-panel').count(), 0);
        assert.equal(await page.locator('.bracket-player.winner').count(), 0);
    };
    const judgesBefore = (await fake('/__fake/requests')).filter(item => item.judge).length;
    await scenario('[[bad-judge]] 주 4일제를 도입해야 할까?', '심판 응답을 확인할 수 없어');
    assert.equal((await fake('/__fake/requests')).filter(item => item.judge).length - judgesBefore, 2, 'exactly one judge retry');
    check('unparseable judge output → retried once, then no winner, clear error');
    const success = async topic => {
        await page.goto(base + '/tournament/new');
        await page.getByLabel('토론 주제', { exact: true }).fill(topic);
        await page.locator('.model-option').first().waitFor();
        for (const name of ['Qwen3.8 Flash', 'Kimi K2.6', 'GLM 5.3 Flash', 'MiniMax M3']) await page.locator('.model-option').filter({ hasText: name }).click();
        await page.getByRole('button', { name: '심판 선택', exact: true }).click();
        await page.getByRole('dialog').locator('.model-option').filter({ hasText: 'Solar Pro 4' }).click();
        await page.getByRole('button', { name: '대진표 만들기', exact: true }).click();
        await page.waitForURL('**/tournament?id=*');
        await page.getByRole('button', { name: '이 경기 시작하기' }).click();
        await page.locator('.verdict-panel').waitFor({ timeout: 30000 });
    };
    await success('[[fenced-judge]] 주 4일제를 도입해야 할까?');
    check('judge JSON wrapped in prose + code fence → verdict accepted');
    await success('[[flaky-judge]] 주 4일제를 도입해야 할까?');
    check('judge malformed once → automatic retry produces a verdict');
    await scenario('[[fail-429]] 주 4일제를 도입해야 할까?', '요청 한도에 도달');
    check('upstream 429 → rate-limit message');
    await scenario('[[cut]] 주 4일제를 도입해야 할까?', '응답을 완료하지 못했');
    check('upstream stream cut mid-speech → interrupted');

    // 10. Daily limit is enforced server-side.
    const remaining = 10 - (await fake('/__fake/executions')).filter(item => item.operation === 'match').length;
    await fake('/__fake/fill-quota', { count: remaining });
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '처음부터 다시 시작' }).click();
    await page.getByRole('alert').filter({ hasText: '오늘의 AI 이용 횟수를 모두 사용했어요' }).waitFor();
    check('daily match limit → 429 with friendly message');

    // 11. Cross-origin POST is rejected before any AI work.
    const before = (await fake('/__fake/requests')).length;
    const forged = await fetch(base + '/api/tournament/match', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: '{}' });
    assert.equal(forged.status, 403);
    assert.equal((await fake('/__fake/requests')).length, before);
    check('cross-origin request rejected');

    // 12. Logout returns the start button to the login state.
    await page.goto(base + '/account');
    await page.getByRole('button', { name: '로그아웃', exact: true }).click();
    await page.getByRole('link', { name: '로그인하기', exact: true }).waitFor();
    const session = await page.evaluate(async () => (await fetch('/api/auth/session')).json());
    assert.equal(session.user, null);
    check('logout clears the server session');

    assert.deepEqual(pageErrors, [], 'no uncaught page errors');
    console.log(JSON.stringify({ result: 'PASS', checks: checks.length, screenshots: output }, null, 2));
} catch (error) {
    console.error('E2E FAILED after:', checks.at(-1) || '(start)');
    if (page) {
        await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
        console.error('visible alerts:', await page.getByRole('alert').allInnerTexts().catch(() => []));
    }
    console.error('server log tail:\n' + serverLog.split('\n').slice(-30).join('\n'));
    throw error;
} finally {
    await browser?.close();
    if (server) { server.kill('SIGTERM'); await new Promise(resolve => server.once('exit', resolve)); }
    await backend.close();
}
