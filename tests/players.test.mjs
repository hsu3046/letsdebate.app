import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadTS } from './helpers.mjs';
const { PLAYERS, RESERVE_CHARACTERS, playerRatings, selectRosterModels, parsePlayerDraft } = loadTS('src/lib/players.ts');
const { MASCOT_TEAMS } = loadTS('src/lib/mascots.ts');
const expected = ['google/gemini-3.8-flash', 'anthropic/claude-haiku-4.5', 'openai/gpt-5.6-luna', 'x-ai/grok-4.6', 'deepseek/deepseek-v4-pro-0813', 'qwen/qwen3.8-flash', 'moonshotai/kimi-k2.6', 'upstage/solar-pro4', 'arcee-ai/trinity-large-thinking', 'nvidia/nemotron-3-ultra-550b-a55b', 'tencent/hy4-preview', 'z-ai/glm-5.3-flash', 'minimax/minimax-m3', 'meta/muse-spark-1.3', 'sakana/sakana-namazu'];

test('요청한 15개 모델에 서로 다른 원본 캐릭터를 연결하고 예비 5종을 보존한다', () => {
  assert.deepEqual(PLAYERS.map(player => player.id), expected);
  assert.equal(new Set(PLAYERS.map(player => player.character.id)).size, 15);
  assert.equal(RESERVE_CHARACTERS.length, 5);
  assert.equal(new Set([...PLAYERS.map(player => player.character.id), ...RESERVE_CHARACTERS.map(character => character.id)]).size, 20);
  for (const player of PLAYERS) {
    assert.ok(fs.existsSync(`public${player.character.image}`));
    assert.equal(MASCOT_TEAMS.find(team => team.modelId === player.id).image, player.character.image);
  }
});

test('몸값 축은 저렴할수록 낮고 미공개 지능은 0으로 바꾸지 않는다', () => {
  const sample = PLAYERS[0];
  assert.equal(playerRatings({ ...sample, inputPerMillion: 0, outputPerMillion: 0 })[4], 0);
  assert.ok(playerRatings({ ...sample, inputPerMillion: 0.1, outputPerMillion: 0.2 })[4] < playerRatings({ ...sample, inputPerMillion: 1, outputPerMillion: 2 })[4]);
  assert.equal(playerRatings({ ...sample, intelligence: null })[1], null);
  assert.equal(playerRatings({ ...sample, intelligence: 0 })[1], 0);
  assert.equal(playerRatings({ ...sample, intelligence: 90, tokensPerSecond: 500 })[0], 100);
  assert.equal(playerRatings({ ...sample, intelligence: 90 })[1], 100);
  for (const player of PLAYERS) for (const rating of playerRatings(player)) assert.ok(rating === null || Number.isInteger(rating) && rating >= 0 && rating <= 100);
});

test('출전은 최신 허용 목록과 교집합이며 정적 능력치로 없는 모델을 되살리지 않는다', () => {
  const allowed = [{ id: expected[14], name: 'Live Namazu', promptPrice: 0.123 }, { id: 'unknown/model' }, { id: expected[0], name: 'Live Gemini' }];
  assert.deepEqual(selectRosterModels(allowed), [allowed[2], allowed[0]]);
  assert.deepEqual(selectRosterModels([]), []);
});

test('라인업 링크는 등록 선수만 허용하고 중복과 8명 초과를 제거한다', () => {
  assert.deepEqual(parsePlayerDraft(null), []);
  assert.deepEqual(parsePlayerDraft(`unknown/model,${expected[14]},${expected[14]},${expected[0]}`), [expected[14], expected[0]]);
  assert.deepEqual(parsePlayerDraft(expected.join(',')), expected.slice(0, 8));
});
