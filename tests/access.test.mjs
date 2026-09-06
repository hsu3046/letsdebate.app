import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';
import { PGlite } from '@electric-sql/pglite';
import { loadTS } from './helpers.mjs';

const userId = 'aa000000-0000-4000-8000-000000000001';
const key = 'bb000000-0000-4000-8000-000000000001';
const executionId = 'cc000000-0000-4000-8000-000000000001';
const makeRequest = (headers = {}, body = '{}') => new Request('https://app.test/api/tournament/match', { method: 'POST', headers: { origin: 'https://app.test', 'Idempotency-Key': key, ...headers }, body });
const json = (body, status = 200) => Response.json(body, { status });

function access({ user = { id: userId }, authError = false, dbError = false, enabled = true, reservation = { id: executionId, remaining: 2 } } = {}) {
  const writes = [], admissions = [];
  const store = new AsyncLocalStorage();
  const admin = {
    rpc: async (_name, args) => { admissions.push(args); return { data: reservation, error: dbError ? {} : null }; },
    from: () => ({ update: data => { writes.push(data); return { eq: () => ({ eq: async () => ({ error: null }) }) }; } }),
  };
  const { withAIRequest } = loadTS('src/lib/ai/access/guard.ts', {
    '@/lib/auth/server': { getVerifiedUser: async () => { if (authError) throw Error('unavailable'); return user; }, createAdminClient: () => admin, authJSON: json },
    '@/lib/ai/service': { isAIServiceConfigured: () => enabled, AI_SERVICE_UNAVAILABLE: '준비 중' },
    './context': { executionContext: store },
  });
  let calls = 0;
  const route = withAIRequest('match', async () => {
    calls++;
    store.getStore().usage.push({ id: 'gen-test', model: 'test/model', inputTokens: 100, outputTokens: 40, cost: 0.005 });
    return new Response('data: {"type":"done"}\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  });
  return { route, writes, admissions, calls: () => calls };
}

test('로그인 실패와 다른 출처 요청은 AI 호출 및 한도 차감 전에 거부한다', async () => {
  for (const [options, headers, status] of [[{ user: null }, {}, 401], [{ authError: true }, {}, 503], [{ enabled: false }, {}, 503], [{}, { origin: 'https://evil.test' }, 403]]) {
    const fixture = access(options);
    assert.equal((await fixture.route(makeRequest(headers))).status, status);
    assert.equal(fixture.calls(), 0);
    assert.equal(fixture.admissions.length, 0);
  }
});

test('저장소 오류와 한도 초과 및 중복 요청에서는 유료 호출을 허용하지 않는다', async () => {
  for (const [options, status] of [[{ dbError: true },503], [{ reservation:{error:'quota'} },429], [{ reservation:{error:'busy'} },409], [{ reservation:{error:'duplicate'} },409], [{ reservation:{error:'conflict'} },409]]) {
    const fixture=access(options);
    assert.equal((await fixture.route(makeRequest())).status,status);
    assert.equal(fixture.calls(),0);
  }
});

test('완료된 요청은 저장된 응답을 반환하고 다시 모델을 호출하지 않는다', async () => {
  const fixture=access({reservation:{replay:true,body:'saved result',contentType:'text/plain',status:200}});
  const response=await fixture.route(makeRequest());
  assert.equal(response.headers.get('X-Execution-Replay'),'true');
  assert.equal(await response.text(),'saved result');
  assert.equal(fixture.calls(),0);
});

test('검증된 계정으로 예약하고 스트림 종료 후 실제 비용을 기록한다', async () => {
  const fixture=access();
  const response=await fixture.route(makeRequest({}, JSON.stringify({userId:'spoofed-user'})));
  assert.equal(response.status,200);
  await response.text();
  assert.equal(fixture.admissions[0].p_user_id,userId);
  assert.equal(fixture.calls(),1);
  assert.equal(fixture.writes[0].status,'completed');
  assert.equal(fixture.writes[0].cost_usd,0.005);
  assert.match(fixture.writes[0].response_body,/done/);
});

test('큰 입력과 잘못된 실행 키를 거부한다', async () => {
  const fixture=access();
  assert.equal((await fixture.route(makeRequest({'Idempotency-Key':'invalid'}))).status,400);
  assert.equal((await fixture.route(makeRequest({}, 'x'.repeat(65537)))).status,413);
  assert.equal(fixture.calls(),0);
});

test('OAuth 복귀 경로는 외부 URL과 API 경로를 허용하지 않는다', () => {
  const {safeReturnTo}=loadTS('src/lib/auth/policy.ts');
  for (const value of ['https://evil.test','//evil.test','/\\evil.test','/api/auth/logout',null,'/\n/evil.test','/'+ 'x'.repeat(2048)]) assert.equal(safeReturnTo(value),'/tournament');
  assert.equal(safeReturnTo('/tournament?id=abc'),'/tournament?id=abc');
});

test('운영 플래그와 키와 모델 허용 목록이 모두 준비되어야 실행을 허용한다', () => {
  const environment = { AI_EXECUTION_ENABLED: 'true', OPENROUTER_API_KEY: 'fixture-key', OPENROUTER_ALLOWED_MODELS: 'test/model' };
  const configured = env => loadTS('src/lib/ai/service.ts', {}, env).isAIServiceConfigured();
  assert.equal(configured(environment), true);
  for (const change of [{AI_EXECUTION_ENABLED:'false'},{OPENROUTER_API_KEY:''},{OPENROUTER_ALLOWED_MODELS:''},{OPENROUTER_ALLOWED_MODELS:' , , '}]) assert.equal(configured({...environment,...change}),false);
});

test('분할된 OpenRouter 스트림의 원본 바이트를 보존하며 최종 비용을 수집한다', async () => {
  const originalFetch = globalThis.fetch;
  const source = ': heartbeat\r\n\r\ndata: {"id":"gen-stream","model":"test/model","choices":[{"delta":{"content":"안녕"}}]}\r\n\r\ndata: {"usage":{"prompt_tokens":12,"completion_tokens":4,"cost":0.003}}\n\ndata: [DONE]\n\n';
  const bytes = new TextEncoder().encode(source);
  const context = {signal:new AbortController().signal,usage:[],failed:false};
  try {
    globalThis.fetch = async () => new Response(new ReadableStream({start(controller) {
      for (let index=0; index<bytes.length; index+=7) controller.enqueue(bytes.slice(index,index+7));
      controller.close();
    }}),{headers:{'content-type':'text/event-stream'}});
    const {createTrackedFetch}=loadTS('src/lib/ai/access/trackedFetch.ts');
    const response=await createTrackedFetch(context)('https://provider.test');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
    assert.deepEqual(context.usage,[{id:'gen-stream',model:'test/model',inputTokens:12,outputTokens:4,cost:0.003}]);
    assert.equal(context.failed,false);
  } finally {globalThis.fetch=originalFetch;}
});

test('OpenRouter 응답을 중단하면 업스트림도 취소하고 비용을 미확인 상태로 남긴다', async () => {
  const originalFetch=globalThis.fetch;
  const context={signal:new AbortController().signal,usage:[],failed:false};
  let cancelled=false;
  try {
    globalThis.fetch=async () => new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('data: {"id":"gen-cancel"}\n\n'));},cancel(){cancelled=true;}}),{headers:{'content-type':'text/event-stream'}});
    const {createTrackedFetch}=loadTS('src/lib/ai/access/trackedFetch.ts');
    const response=await createTrackedFetch(context)('https://provider.test');
    const reader=response.body.getReader();
    await reader.read();
    await reader.cancel();
    assert.equal(cancelled,true);
    assert.equal(context.failed,true);
    assert.equal(context.usage[0].cost,null);
  } finally {globalThis.fetch=originalFetch;}
});

test('비용 미수집을 0으로 기록하지 않고 토큰과 실제 비용을 판독한다', () => {
  const {parseGenerationUsage,totalCost}=loadTS('src/lib/ai/access/usage.ts');
  const empty={id:null,model:null,inputTokens:null,outputTokens:null,cost:null};
  assert.equal(totalCost([empty]),null);
  assert.equal(totalCost([]),null);
  const usage=parseGenerationUsage({id:'gen-x',model:'test/model',usage:{prompt_tokens:100,completion_tokens:40,cost:0.02}},empty);
  assert.equal(totalCost([usage]),0.02);
  assert.equal(parseGenerationUsage({usage:{cost:-1}},empty).cost,null);
});

test('Postgres 예약 함수가 계정별 한도와 동시 실행 및 재전송을 원자적으로 구분한다', async () => {
  const db=new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values ('${userId}'),('aa000000-0000-4000-8000-000000000002');`);
    await db.exec(fs.readFileSync('supabase/migrations/202609060001_ai_execution_access.sql','utf8'));
    const reserve=async(k,hash='hash',user=userId,kind='match') => (await db.query('select public.debate_reserve_execution($1::uuid,$2::uuid,$3,$4,1,3) as result',[user,k,hash,kind])).rows[0].result;
    const first=await reserve(key);
    assert.ok(first.id);
    assert.equal(first.remaining,0);
    assert.equal((await reserve(key)).error,'duplicate');
    assert.equal((await reserve(key,'different')).error,'conflict');
    assert.equal((await reserve('bb000000-0000-4000-8000-000000000002')).error,'busy');
    await db.query("update public.debate_ai_executions set status='completed', response_body='saved', response_type='text/plain', response_status=200 where id=$1",[first.id]);
    assert.equal((await reserve(key)).body,'saved');
    assert.equal((await reserve('bb000000-0000-4000-8000-000000000002')).error,'quota');
    assert.ok((await reserve(key,'hash','aa000000-0000-4000-8000-000000000002')).id);
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from public.debate_ai_executions'),/permission denied/);
    await assert.rejects(reserve(key),/permission denied/);
    await db.exec('reset role');
  } finally { await db.close(); }
});
