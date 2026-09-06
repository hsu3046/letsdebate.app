/* Requires an existing Playwright runtime and a running local app. No live AI calls are made. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const runtimeRequire = createRequire(import.meta.url);
const { chromium } = runtimeRequire('playwright');
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const output = process.env.TEST_OUTPUT_DIR || '/tmp/letsdebate-qa';
const fixtureProviders = ['anthropic', 'openai', 'google', 'x-ai', 'deepseek', 'qwen', 'mistralai', 'meta-llama', 'qa'];
const models = Array.from({ length: 9 }, (_, index) => ({ id: `${fixtureProviders[index]}/qa-model-${index}`, name: `QA: Model ${String.fromCharCode(65 + index)}`, contextLength: 64000, promptPrice: 0.0000001, completionPrice: 0.0000002 }));
const verdict = { winner: 'a', scores: { a: 86, b: 78 }, reason: 'A는 구체적인 사례와 반박을 연결했습니다. B는 전제에 대한 설명이 필요합니다.', highlights: { a: '명료한 논증이 돋보였습니다.', b: '반대 관점을 새롭게 제시했습니다.' } };
const frame = event => `data: ${JSON.stringify(event)}\n\n`;
const transcript = ['a', 'b', 'b', 'a'].map((side, index) => ({ type: 'message', id: `msg-${index}`, side, round: Math.floor(index / 2) + 1, content: `테스트 발언 ${index + 1}: AI와 예술에 대한 구체적인 논거입니다.` }));

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(`${page.url()}\n${error.message}`));
  await page.route('**/api/auth/session', route => route.fulfill({ json: { configured: true, user: { id: 'qa-user', name: '테스트 팬' } } }));
  await page.route('**/api/models', route => route.fulfill({ json: { models } }));
  let mode = 'complete';
  let calls = 0;
  await page.route('**/api/tournament/match', async route => {
    calls++;
    const input = route.request().postDataJSON();
    assert.equal('apiKey' in input || 'apiKeys' in input, false, 'Browser requests must not contain credentials');
    assert.equal(route.request().headers().authorization, undefined);
    assert.notEqual(input.a, input.b);
    if (mode === 'unavailable') {
      await route.fulfill({ status: 503, json: { error: '지금은 AI 경기를 준비하고 있어요. 잠시 후 다시 시작해주세요.' } });
      return;
    }
    if (mode === 'hold') {
      await new Promise(resolve => setTimeout(resolve, 800));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: frame({ type: 'error', message: '늦게 도착한 테스트 오류' }) }).catch(() => {});
      return;
    }
    const body = mode === 'error'
      ? frame(transcript[0]) + frame({ type: 'error', message: '테스트용 모델 오류. 진출자가 없어야 합니다.' })
      : ': heartbeat\n\n' + transcript.map(frame).join('') + frame({ type: 'judging' }) + frame({ type: 'verdict', verdict }) + frame({ type: 'done' });
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body });
  });
  const go = async path => { await page.goto(baseURL + path, { waitUntil: 'domcontentloaded' }); };
  const noOverflow = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${label}: horizontal overflow`);
  const snapshot = async name => { await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: `${output}/${name}.png`, fullPage: true }); };
  try {
    await context.addInitScript(() => {
      if (!localStorage.getItem('qa-credential-migration')) {
        localStorage.setItem('letsdebate_api_keys', JSON.stringify({ state: { apiKeys: { OPENROUTER_API_KEY: 'retired-fixture-key' } } }));
        localStorage.setItem('qa-credential-migration', 'preserve');
      }
    });
    await go('/');
    await page.getByRole('heading', { name: /AI 모델들의.*토론.*배틀/ }).waitFor();
    await page.waitForFunction(() => localStorage.getItem('letsdebate_api_keys') === null);
    assert.equal(await page.evaluate(() => localStorage.getItem('qa-credential-migration')), 'preserve');
    assert.equal(await page.getByRole('link', { name: /키 연결|API 연결 설정|OpenRouter 연결하기/ }).count(), 0);
    for (const width of [320, 390, 768, 1024, 1112, 1440]) { await page.setViewportSize({ width, height: 1050 }); await noOverflow(`home ${width}`); }
    await snapshot('home-desktop');
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow('home 390');
    await snapshot('home-mobile');
    await page.setViewportSize({ width: 1440, height: 1050 });
    await go('/topics');
    await page.getByRole('textbox', { name: '주제 검색' }).fill('예술');
    await page.locator('.topic-card').first().waitFor();
    await page.locator('.bookmark-button').first().click();
    await page.reload();
    await page.getByRole('button', { name: /저장한 주제 1/ }).click();
    await page.waitForFunction(() => document.querySelectorAll('.topic-card').length === 1);
    await page.locator('.topic-card-link').click();
    await page.waitForURL('**/tournament/new?topic=*');
    assert.ok((await page.getByLabel('토론 주제', { exact: true }).inputValue()).length > 2);
    await page.locator('.model-option').first().waitFor();
    for (let index = 0; index < 4; index++) await page.locator('.model-option').filter({ hasText: `Model ${String.fromCharCode(65 + index)}` }).click();
    assert.equal(await page.locator('.model-option').filter({ hasText: 'Model E' }).isDisabled(), true);
    await page.getByRole('button', { name: '심판 선택', exact: true }).click();
    await page.getByRole('dialog').locator('.model-option').filter({ hasText: 'Model I' }).click();
    await snapshot('builder-desktop');
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow('builder 390');
    await snapshot('builder-mobile');
    await page.getByRole('button', { name: '대진표 만들기', exact: true }).click();
    await page.waitForURL('**/tournament?id=*');
    const tournamentURL = page.url();
    await page.locator('.bracket-match').first().waitFor();
    assert.equal(await page.locator('.bracket-match').count(), 3);
    assert.equal(calls, 0, 'Creating a bracket must not call a paid model');
    await page.getByRole('button', { name: '이 경기 시작하기' }).waitFor();
    await noOverflow('bracket 390');
    await snapshot('bracket-mobile');
    await page.reload();
    mode = 'unavailable';
    await page.getByRole('button', { name: '이 경기 시작하기' }).click();
    await page.getByRole('alert').filter({ hasText: 'AI 경기를 준비' }).waitFor();
    assert.equal(await page.locator('.verdict-panel').count(), 0);
    assert.equal(await page.getByRole('link', { name: '키 연결하기' }).count(), 0);
    mode = 'complete';
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '처음부터 다시 시작' }).click();
    await page.locator('.verdict-panel').waitFor();
    assert.equal(calls, 2);
    await page.getByRole('button', { name: '다음 경기 보기' }).click();
    mode = 'error';
    await page.getByRole('button', { name: '이 경기 시작하기' }).click();
    await page.getByRole('alert').filter({ hasText: '테스트용 모델 오류' }).waitFor();
    let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('walgawalbu-tournaments')).state.tournaments[0]);
    assert.equal(saved.matches[1].status, 'interrupted');
    assert.equal(saved.matches[2].b, null);
    mode = 'hold';
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '처음부터 다시 시작' }).click();
    await page.getByRole('button', { name: '경기 중단' }).click();
    await page.getByRole('alert').filter({ hasText: '경기를 중단했어요' }).waitFor();
    mode = 'complete';
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '처음부터 다시 시작' }).click();
    await page.locator('.verdict-panel').waitFor();
    await page.getByRole('button', { name: '다음 경기 보기' }).click();
    await page.getByRole('button', { name: '이 경기 시작하기' }).click();
    await page.locator('.champion-banner').waitFor();
    saved = await page.evaluate(() => JSON.parse(localStorage.getItem('walgawalbu-tournaments')).state.tournaments[0]);
    assert.equal(saved.matches.filter(match => match.status === 'completed').length, 3);
    assert.equal(saved.matches[2].winnerId, models[0].id);
    assert.ok(!JSON.stringify(saved).includes('sk-or-'));
    await snapshot('champion-mobile');
    await page.setViewportSize({ width: 1440, height: 1050 });
    await snapshot('champion-desktop');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '기록 내보내기' }).click();
    const download = await downloadPromise;
    await download.saveAs(`${output}/tournament-export.md`);
    assert.ok(fs.readFileSync(`${output}/tournament-export.md`, 'utf8').includes(verdict.reason));
    await page.reload();
    await page.locator('.champion-banner').waitFor();
    await go('/history');
    await page.getByRole('textbox', { name: '토론 기록 검색' }).fill('없는 검색어');
    await page.getByRole('heading', { name: '조건에 맞는 기록이 없어요' }).waitFor();
    await page.getByRole('textbox', { name: '토론 기록 검색' }).fill('');
    await page.locator('.history-card').first().waitFor();
    await go('/tournament/new');
    await page.getByLabel('토론 주제', { exact: true }).fill('8강 테스트: 새로운 관점은 어떻게 생길까?');
    await page.getByRole('button', { name: /8강 토너먼트/ }).click();
    for (let index = 0; index < 8; index++) await page.locator('.model-option').filter({ hasText: `Model ${String.fromCharCode(65 + index)}` }).click();
    await page.getByRole('button', { name: '심판 선택', exact: true }).click();
    await page.getByRole('dialog').locator('.model-option').filter({ hasText: 'Model I' }).click();
    await page.getByRole('button', { name: '대진표 만들기', exact: true }).click();
    await page.waitForURL('**/tournament?id=*');
    await page.locator('.bracket-match').first().waitFor();
    assert.equal(await page.locator('.bracket-match').count(), 7);
    // Simulate a reload while a run is persisted; hydration must mark it interrupted.
    await page.evaluate(() => { const key = 'walgawalbu-tournaments'; const saved = JSON.parse(localStorage.getItem(key)); saved.state.tournaments[0].matches[0].status = 'running'; saved.state.tournaments[0].matches[0].runId = 'orphaned-run'; localStorage.setItem(key, JSON.stringify(saved)); });
    await page.reload();
    await page.getByRole('alert').filter({ hasText: '페이지가 닫혀' }).waitFor();
    for (const width of [320, 390, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); await noOverflow(`8 bracket ${width}`); }
    await page.setViewportSize({ width: 390, height: 844 });
    await snapshot('bracket-8-mobile');
    await page.setViewportSize({ width: 1440, height: 1050 });
    await snapshot('bracket-8-desktop');
    for (const pathname of ['/settings', '/help', '/notice', '/feedback', '/legal?tab=privacy', '/setup', '/participants']) {
      await go(pathname);
      await page.locator('#main-content').waitFor();
      if (pathname === '/settings') await page.waitForURL('**/help');
      assert.equal(await page.locator('input[type="password"]').count(), 0);
      await page.setViewportSize({ width: 390, height: 844 });
      await noOverflow(pathname);
    }
    assert.deepEqual(errors, [], 'No browser runtime errors');
    console.log(JSON.stringify({ result: 'PASS', checks: ['topic search and bookmark persistence', 'topic prefill', '4/8 entrant selection', 'no paid call during creation', 'no-key flow and retired credential cleanup', 'service unavailable recovery', 'match completion', 'error without advancement', 'stop and stale response', 'championship', 'Markdown export', 'reload recovery', '320/390/768/1024/1440 layouts', 'secondary routes'], mockCalls: calls, screenshots: output, completedTournament: tournamentURL }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
