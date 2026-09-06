import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Run isolated TypeScript domain and route tests using the project's existing compiler.
function loadTS(relativePath, overrides = {}, environment = {}) {
  const filename = path.resolve(import.meta.dirname, '..', relativePath);
  const requireFromFile = createRequire(filename);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loadedModule = { exports: {} };
  const requireLocal = id => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id === 'server-only') return {};
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.resolve('src', id.slice(2)) : path.resolve(path.dirname(filename), id);
      const target = [base + '.ts', path.join(base, 'index.ts')].find(file => fs.existsSync(file));
      if (target) return loadTS(target, overrides, environment);
    }
    return requireFromFile(id);
  };
  vm.runInThisContext(`(function(exports,require,module,__filename,__dirname,process){${source}\n})`, { filename })(loadedModule.exports, requireLocal, loadedModule, filename, path.dirname(filename), { env: environment });
  return loadedModule.exports;
}
const { createBracket, advanceWinner, tournamentMarkdown } = loadTS('src/lib/tournament.ts');
const { parseMatchEvent, verdictSchema } = loadTS('src/lib/tournamentProtocol.ts');
const models = Array.from({ length: 8 }, (_, index) => ({ id: `test/model-${index}`, name: `Test: Model ${index}`, contextLength: 32000, promptPrice: 0, completionPrice: 0 }));
const verdict = { winner: 'a', scores: { a: 84, b: 76 }, reason: '구체적인 반박이 더 설득력 있었습니다.', highlights: { a: '근거가 구체적입니다.', b: '핵심 전제의 보완이 필요합니다.' } };
const makeTournament = size => ({ id: 'test-tournament', topic: 'AI가 만든 작품도 예술일까?', context: '', entrants: models.slice(0, size), judge: models[7], turnsPerSide: 2, matches: createBracket(models.slice(0, size)), createdAt: 0 });

test('4강과 8강의 모든 진출자가 중복 없이 결승으로 연결된다', () => {
  for (const size of [4, 8]) {
    let tournament = makeTournament(size);
    assert.equal(tournament.matches.length, size - 1);
    for (const match of tournament.matches) {
      const ready = tournament.matches.find(item => item.id === match.id);
      assert.ok(ready.a && ready.b);
      tournament = { ...tournament, matches: tournament.matches.map(item => item.id === ready.id ? { ...item, status: 'running', runId: 'run' } : item) };
      tournament = advanceWinner(tournament, ready.id, 'run', verdict);
    }
    assert.equal(tournament.matches.filter(match => match.status === 'completed').length, size - 1);
    assert.equal(tournament.matches.at(-1).winnerId, models[0].id);
  }
});

test('중복 모델, 잘못된 인원, 미완성 대진표를 거부한다', () => {
  assert.throws(() => createBracket(models.slice(0, 3)));
  assert.throws(() => createBracket([models[0], models[0], models[1], models[2]]));
  const tournament = makeTournament(4);
  assert.equal(advanceWinner(tournament, 'r1-m0', 'run', verdict), tournament);
});

test('종료된 경기와 이전 실행의 판정은 다시 반영하지 않는다', () => {
  let tournament = makeTournament(4);
  tournament.matches[0] = { ...tournament.matches[0], status: 'running', runId: 'current' };
  assert.equal(advanceWinner(tournament, 'r0-m0', 'stale', verdict), tournament);
  const completed = advanceWinner(tournament, 'r0-m0', 'current', verdict);
  assert.equal(advanceWinner(completed, 'r0-m0', 'current', { ...verdict, winner: 'b' }), completed);
});

test('프로토콜은 heartbeat를 무시하고 점수 모순과 손상된 판정을 거부한다', () => {
  assert.equal(parseMatchEvent(': heartbeat'), null);
  assert.equal(parseMatchEvent(`data: ${JSON.stringify({ type: 'verdict', verdict })}`).verdict.winner, 'a');
  assert.throws(() => parseMatchEvent('data: {invalid-json}'));
  assert.equal(verdictSchema.safeParse({ ...verdict, winner: 'b' }).success, false);
  assert.equal(verdictSchema.safeParse({ ...verdict, scores: { a: 101, b: 80 } }).success, false);
});

test('내보내기에 발언과 판정이 포함되고 입력 문자열을 그대로 보존한다', () => {
  const tournament = makeTournament(4);
  tournament.matches[0].messages.push({ id: '1-a', side: 'a', round: 1, content: '$&와 $1도 원문 그대로 남아야 합니다.' });
  tournament.matches[0].verdict = verdict;
  const text = tournamentMarkdown(tournament);
  assert.ok(text.includes('$&와 $1도 원문 그대로'));
  assert.ok(text.includes(verdict.reason));
});

function mockRoute({ fail, invalidJudge = false, configured = true, allowedModels = '' } = {}) {
  const calledModels = [];
  const route = loadTS('src/app/api/tournament/match/route.ts', {
    '@ai-sdk/openai': { createOpenAI: options => {
      assert.equal(options.baseURL, 'https://openrouter.ai/api/v1');
      assert.equal(options.apiKey, 'server-fixture-not-a-real-key');
      return { chat: model => { calledModels.push(model); return model; } };
    } },
    ai: {
      streamText: options => {
        assert.equal(options.maxRetries, 0);
        return { textStream: (async function* () { if (fail) throw fail; yield '서로 다른 '; yield '관점입니다.'; })(), finishReason: Promise.resolve('stop') };
      },
      generateText: async options => { assert.ok(!options.prompt.includes('test/model-')); return { text: invalidJudge ? '{bad-json}' : JSON.stringify(verdict) }; },
    },
  }, { OPENROUTER_API_KEY: configured ? 'server-fixture-not-a-real-key' : '', OPENROUTER_ALLOWED_MODELS: allowedModels });
  return { ...route, calledModels };
}
const request = extra => new Request('http://localhost/api/tournament/match', { method: 'POST', body: JSON.stringify({ topic: 'AI가 만든 작품도 예술일까?', context: '', a: models[0].id, b: models[1].id, judge: models[2].id, turnsPerSide: 2, ...extra }) });
const eventsFrom = text => text.split('\n\n').map(parseMatchEvent).filter(Boolean);

test('경기 API가 두 모델을 번갈아 호출하고 익명 심판 판정 후에만 완료한다', async () => {
  const route = mockRoute();
  const response = await route.POST(request());
  assert.equal(response.headers.get('cache-control'), 'no-cache, no-store, no-transform');
  const body = await response.text();
  const events = eventsFrom(body);
  assert.deepEqual(events.filter(event => event.type === 'message').map(event => event.side), ['a', 'b', 'b', 'a']);
  assert.deepEqual(route.calledModels, [models[0].id, models[1].id, models[1].id, models[0].id, models[2].id]);
  assert.equal(events.at(-1).type, 'done');
  assert.ok(!body.includes('server-fixture-not-a-real-key'));
});

test('인증·잔액 오류는 모델 대체와 승자 없이 안전한 오류만 반환한다', async () => {
  for (const statusCode of [401, 402, 429]) {
    const route = mockRoute({ fail: { statusCode, message: 'SECRET REQUEST DETAILS' } });
    const text = await (await route.POST(request())).text();
    const events = eventsFrom(text);
    assert.equal(events.at(-1).type, 'error');
    assert.ok(!events.some(event => event.type === 'verdict'));
    assert.equal(route.calledModels.length, 1);
    assert.ok(!text.includes('SECRET REQUEST DETAILS'));
  }
});

test('손상된 심판 응답과 잘못된 요청은 진출자를 만들지 않는다', async () => {
  const route = mockRoute({ invalidJudge: true });
  const events = eventsFrom(await (await route.POST(request())).text());
  assert.equal(events.at(-1).type, 'error');
  assert.ok(!events.some(event => event.type === 'verdict'));
  assert.equal((await route.POST(request({ a: models[0].id, b: models[0].id }))).status, 400);
  assert.equal((await route.POST(request({ topic: ' ' }))).status, 400);
});

test('카탈로그는 텍스트 실시간 모델만 반환하고 잘못된 가격을 무료로 표시하지 않는다', async () => {
  const originalFetch = globalThis.fetch;
  const valid = { id: 'provider/text', name: 'Provider: Text', context_length: 32000, architecture: { input_modalities: ['text'], output_modalities: ['text'] }, pricing: { prompt: '0.000001', completion: '0.000002' } };
  globalThis.fetch = async () => Response.json({ data: [valid, { ...valid, id: 'provider/text:batch' }, { ...valid, id: 'provider/invalid', pricing: { prompt: null, completion: '' } }, { ...valid, id: 'provider/embed', architecture: { input_modalities: ['text'], output_modalities: ['embeddings'] } }] });
  try {
    const route = loadTS('src/app/api/models/route.ts', { 'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } } });
    const result = await (await route.GET()).json();
    assert.equal(result.models.length, 1);
    assert.equal(result.models[0].id, 'provider/text');
    assert.equal(result.models[0].promptPrice, 0.000001);
  } finally { globalThis.fetch = originalFetch; }
});

test('카탈로그 장애에는 재시도 가능한 오류를 반환한다', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('', { status: 503 });
  try {
    const route = loadTS('src/app/api/models/route.ts', { 'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } } });
    const response = await route.GET();
    assert.equal(response.status, 502);
    assert.ok((await response.json()).error);
  } finally { globalThis.fetch = originalFetch; }
});


test('개인 키를 받지 않고 서버 연결이 없으면 준비 중 오류를 반환한다', async () => {
  const route = mockRoute({ configured: false });
  const response = await route.POST(request());
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /AI 경기를 준비/);
  assert.equal(route.calledModels.length, 0);
  for (const extra of [{ apiKey: 'client-injected-key' }, { apiKeys: { OPENROUTER_API_KEY: 'client-injected-key' } }]) {
    assert.equal((await mockRoute().POST(request(extra))).status, 400);
  }
});

test('서버 제공 모델 제한은 심판까지 적용한다', async () => {
  const denied = mockRoute({ allowedModels: models.slice(0, 2).map(model => model.id).join(',') });
  assert.equal((await denied.POST(request())).status, 400);
  assert.equal(denied.calledModels.length, 0);
  const allowed = mockRoute({ allowedModels: models.slice(0, 3).map(model => model.id).join(',') });
  assert.equal(eventsFrom(await (await allowed.POST(request())).text()).at(-1).type, 'done');
});

test('기존 캐릭터 엔진도 서버 OpenRouter 키로만 연결한다', () => {
  const calls = [];
  const { createProviders, MODELS } = loadTS('src/lib/ai/config.ts', {
    '@ai-sdk/openai': { createOpenAI: options => {
      assert.equal(options.apiKey, 'server-fixture');
      return { chat: id => { calls.push(id); return id; } };
    } },
  }, { OPENROUTER_API_KEY: 'server-fixture' });
  const providers = createProviders({ OPENROUTER_API_KEY: 'ignored-client-key' });
  providers.anthropic(MODELS.CLAUDE);
  providers.google(MODELS.GEMINI);
  assert.deepEqual(calls, ['anthropic/claude-haiku-4.5', 'google/gemini-3-flash-preview']);
});

test('카탈로그에 운영자가 제공하도록 지정한 모델만 표시한다', async () => {
  const originalFetch = globalThis.fetch;
  const model = id => ({ id, name: id, context_length: 32000, architecture: { input_modalities: ['text'], output_modalities: ['text'] }, pricing: { prompt: '0', completion: '0' } });
  globalThis.fetch = async () => Response.json({ data: [model('test/allowed'), model('test/hidden')] });
  try {
    const route = loadTS('src/app/api/models/route.ts', { 'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } } }, { OPENROUTER_ALLOWED_MODELS: ' test/allowed ' });
    assert.deepEqual((await (await route.GET()).json()).models.map(item => item.id), ['test/allowed']);
  } finally { globalThis.fetch = originalFetch; }
});

test('기존 토론 API도 브라우저 키로 서버 연결을 우회할 수 없다', async () => {
  const names = ['analyze', 'coach', 'debate', 'director', 'evaluate', 'judge', 'moderator', 'moderator/analyze-interaction', 'questions', 'summary', 'summarize-opening'];
  const overrides = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/ai/config': {}, '@/lib/ai/modelMapping': {}, '@/lib/prompts/v4': {},
  };
  for (const name of names) {
    const route = loadTS(`src/app/api/${name}/route.ts`, overrides);
    const response = await route.POST(new Request(`http://localhost/api/${name}`, { method: 'POST', body: JSON.stringify({ apiKeys: { GOOGLE_GENERATIVE_AI_API_KEY: 'client-fixture', OPENROUTER_API_KEY: 'client-fixture' } }) }));
    assert.equal(response.status, 503, name);
    const body = await response.text();
    assert.ok(!body.includes('client-fixture'));
    assert.match(body, /AI 경기를 준비/);
  }
});
