import { CHARACTER_CARDS } from './characterCards';
import type { OpenRouterModel } from './tournament';

export const PLAYER_DATA_DATE = '2026-09-07';
export const COUNTRIES = {
  US: { name: '미국', flag: '🇺🇸' },
  CN: { name: '중국', flag: '🇨🇳' },
  KR: { name: '한국', flag: '🇰🇷' },
  JP: { name: '일본', flag: '🇯🇵' },
} as const;
export type CountryCode = keyof typeof COUNTRIES;

// Prices / AA: OpenRouter public catalog snapshot. Speed: model-page provider P50 (1 week).
// Brand and personality are fictional scouting settings, never benchmark results.
const SCOUTING = [
  {
    "id": "google/gemini-3.8-flash",
    "logo": "/logos/gemini.png",
    "name": "Gemini 3.8 Flash",
    "characterId": "14-chacha",
    "developer": "Google",
    "family": "Gemini",
    "country": "US",
    "playStyle": "호기심 만렙",
    "brand": 96,
    "personality": 91,
    "tokensPerSecond": 105,
    "speedProvider": "Google AI Studio",
    "inputPerMillion": 0.75,
    "outputPerMillion": 3.75,
    "intelligence": 47.1,
    "source": "https://openrouter.ai/google/gemini-3.8-flash"
  },
  {
    "id": "anthropic/claude-haiku-4.5",
    "logo": "/logos/anthropic.svg",
    "name": "Claude Haiku 4.5",
    "characterId": "07-tori",
    "developer": "Anthropic",
    "family": "Claude",
    "country": "US",
    "playStyle": "차분한 받아치기",
    "brand": 94,
    "personality": 70,
    "tokensPerSecond": 60,
    "speedProvider": "Anthropic",
    "inputPerMillion": 1.0,
    "outputPerMillion": 5.0,
    "intelligence": 22.5,
    "source": "https://openrouter.ai/anthropic/claude-haiku-4.5"
  },
  {
    "id": "openai/gpt-5.6-luna",
    "logo": "/logos/openai.svg",
    "name": "GPT-5.6 Luna",
    "characterId": "19-miro",
    "developer": "OpenAI",
    "family": "GPT",
    "country": "US",
    "playStyle": "자신감 있는 첫 수",
    "brand": 100,
    "personality": 83,
    "tokensPerSecond": 130,
    "speedProvider": "Amazon Bedrock · US",
    "inputPerMillion": 0.2,
    "outputPerMillion": 1.2,
    "intelligence": 43.4,
    "source": "https://openrouter.ai/openai/gpt-5.6-luna-20260709"
  },
  {
    "id": "x-ai/grok-4.6",
    "logo": "/logos/grok.svg",
    "name": "Grok 4.6",
    "characterId": "04-spark",
    "developer": "xAI",
    "family": "Grok",
    "country": "US",
    "playStyle": "거침없는 한 방",
    "brand": 87,
    "personality": 98,
    "tokensPerSecond": 61,
    "speedProvider": "SpaceXAI · ZDR",
    "inputPerMillion": 2.0,
    "outputPerMillion": 6.0,
    "intelligence": 50.6,
    "source": "https://openrouter.ai/x-ai/grok-4.6"
  },
  {
    "id": "deepseek/deepseek-v4-pro-0813",
    "logo": "/logos/deepseek.svg",
    "name": "DeepSeek V4 Pro",
    "characterId": "13-bambi",
    "developer": "DeepSeek",
    "family": "DeepSeek",
    "country": "CN",
    "playStyle": "빈틈을 찾는 탐험가",
    "brand": 80,
    "personality": 87,
    "tokensPerSecond": 77,
    "speedProvider": "DeepInfra",
    "inputPerMillion": 1.1154,
    "outputPerMillion": 3.3461999999999996,
    "intelligence": 42.1,
    "source": "https://openrouter.ai/deepseek/deepseek-v4-pro-0813"
  },
  {
    "id": "qwen/qwen3.8-flash",
    "logo": "/logos/qwen.svg",
    "name": "Qwen3.8 Flash",
    "characterId": "03-momo",
    "developer": "Alibaba",
    "family": "Qwen",
    "country": "CN",
    "playStyle": "경쾌한 속공",
    "brand": 73,
    "personality": 90,
    "tokensPerSecond": 50,
    "speedProvider": "Alibaba",
    "inputPerMillion": 0.15,
    "outputPerMillion": 0.47,
    "intelligence": null,
    "source": "https://openrouter.ai/qwen/qwen3.8-flash"
  },
  {
    "id": "moonshotai/kimi-k2.6",
    "logo": "/logos/kimi.svg",
    "name": "Kimi K2.6",
    "characterId": "06-dodo",
    "developer": "Moonshot AI",
    "family": "Kimi",
    "country": "CN",
    "playStyle": "흐름을 바꾸는 한 수",
    "brand": 66,
    "personality": 92,
    "tokensPerSecond": 129,
    "speedProvider": "Decart",
    "inputPerMillion": 0.95,
    "outputPerMillion": 4.0,
    "intelligence": 36,
    "source": "https://openrouter.ai/moonshotai/kimi-k2.6"
  },
  {
    "id": "upstage/solar-pro4",
    "logo": "/logos/upstage.svg",
    "name": "Solar Pro 4",
    "characterId": "15-yuni",
    "developer": "Upstage",
    "family": "Solar",
    "country": "KR",
    "playStyle": "흔들림 없는 페이스",
    "brand": 57,
    "personality": 79,
    "tokensPerSecond": 37,
    "speedProvider": "Upstage",
    "inputPerMillion": 0.03,
    "outputPerMillion": 0.12,
    "intelligence": 33,
    "source": "https://openrouter.ai/upstage/solar-pro4"
  },
  {
    "id": "arcee-ai/trinity-large-thinking",
    "logo": "/logos/arcee.svg",
    "name": "Trinity Large Thinking",
    "characterId": "08-loop",
    "developer": "Arcee AI",
    "family": "Trinity",
    "country": "US",
    "playStyle": "생각을 잇는 연결고리",
    "brand": 42,
    "personality": 85,
    "tokensPerSecond": 96,
    "speedProvider": "Arcee AI",
    "inputPerMillion": 0.25,
    "outputPerMillion": 0.7999999999999999,
    "intelligence": 12,
    "source": "https://openrouter.ai/arcee-ai/trinity-large-thinking"
  },
  {
    "id": "nvidia/nemotron-3-ultra-550b-a55b",
    "logo": "/logos/nvidia.svg",
    "name": "Nemotron 3 Ultra",
    "characterId": "09-kong",
    "developer": "NVIDIA",
    "family": "Nemotron",
    "country": "US",
    "playStyle": "차근차근 쌓는 논리",
    "brand": 92,
    "personality": 72,
    "tokensPerSecond": 130,
    "speedProvider": "Baseten · US",
    "inputPerMillion": 0.625,
    "outputPerMillion": 3.125,
    "intelligence": 29,
    "source": "https://openrouter.ai/nvidia/nemotron-3-ultra-550b-a55b"
  },
  {
    "id": "tencent/hy4-preview",
    "logo": "/logos/hy.svg",
    "name": "Hy4",
    "characterId": "05-nuri",
    "developer": "Tencent",
    "family": "HY4",
    "country": "CN",
    "playStyle": "내 방식대로 돌파",
    "brand": 77,
    "personality": 93,
    "tokensPerSecond": 40,
    "speedProvider": "Tencent Cloud",
    "inputPerMillion": 0.834,
    "outputPerMillion": 2.501,
    "intelligence": null,
    "source": "https://openrouter.ai/tencent/hy4-preview"
  },
  {
    "id": "z-ai/glm-5.3-flash",
    "logo": "/logos/zai.svg",
    "name": "GLM 5.3 Flash",
    "characterId": "02-pick",
    "developer": "Z.ai",
    "family": "GLM",
    "country": "CN",
    "playStyle": "순간을 잡는 반박",
    "brand": 60,
    "personality": 88,
    "tokensPerSecond": 139,
    "speedProvider": "Baseten",
    "inputPerMillion": 0.075,
    "outputPerMillion": 0.25,
    "intelligence": 46.2,
    "source": "https://openrouter.ai/z-ai/glm-5.3-flash"
  },
  {
    "id": "minimax/minimax-m3",
    "logo": "/logos/minimax.svg",
    "name": "MiniMax M3",
    "characterId": "20-bibi",
    "developer": "MiniMax",
    "family": "MiniMax",
    "country": "CN",
    "playStyle": "작지만 또렷한 존재감",
    "brand": 61,
    "personality": 86,
    "tokensPerSecond": 69,
    "speedProvider": "Together",
    "inputPerMillion": 0.3,
    "outputPerMillion": 1.2,
    "intelligence": 35.7,
    "source": "https://openrouter.ai/minimax/minimax-m3"
  },
  {
    "id": "meta/muse-spark-1.3",
    "logo": "/logos/meta.svg",
    "name": "Muse Spark 1.3",
    "characterId": "10-pado",
    "developer": "Meta",
    "family": "Muse",
    "country": "US",
    "playStyle": "상상 밖의 패스",
    "brand": 94,
    "personality": 96,
    "tokensPerSecond": 92,
    "speedProvider": "Meta",
    "inputPerMillion": 1.25,
    "outputPerMillion": 4.25,
    "intelligence": 53,
    "source": "https://openrouter.ai/meta/muse-spark-1.3"
  },
  {
    "id": "sakana/sakana-namazu",
    "logo": "/logos/sakanaai.png",
    "name": "Sakana Namazu",
    "characterId": "17-jelly",
    "developer": "Sakana AI",
    "family": "Namazu",
    "country": "JP",
    "playStyle": "유연하게 방향 전환",
    "brand": 45,
    "personality": 95,
    "tokensPerSecond": 28,
    "speedProvider": "Sakana AI",
    "inputPerMillion": 0.95,
    "outputPerMillion": 4.0,
    "intelligence": null,
    "source": "https://openrouter.ai/sakana/sakana-namazu"
  }
] as const;

// Direct AA references supplement missing OpenRouter indices; preserve evaluation settings.
export const INTELLIGENCE_REFERENCES: Record<string, { url: string; note: string }> = {
  "moonshotai/kimi-k2.6": { url: "https://artificialanalysis.ai/models/kimi-k2-6", note: "v4.2 · 추정치 · reasoning" },
  "upstage/solar-pro4": { url: "https://artificialanalysis.ai/models/solar-pro4", note: "v4.2 · 추정치" },
  "arcee-ai/trinity-large-thinking": { url: "https://artificialanalysis.ai/models/trinity-large-thinking", note: "v4.2 · 추정치" },
  "nvidia/nemotron-3-ultra-550b-a55b": { url: "https://artificialanalysis.ai/models/nvidia-nemotron-3-ultra-550b-a55b", note: "v4.2 · Reasoning" },
  "meta/muse-spark-1.3": { url: "https://artificialanalysis.ai/models/muse-spark-1-3", note: "v4.2 · max 설정" },
};

export const PLAYERS = SCOUTING.map(player => {
  const character = CHARACTER_CARDS.find(card => card.id === player.characterId);
  if (!character) throw new Error(`Missing player artwork: ${player.characterId}`);
  return { ...player, character };
});
export type Player = (typeof PLAYERS)[number];
export const RESERVE_CHARACTERS = CHARACTER_CARDS.filter(card => !PLAYERS.some(player => player.characterId === card.id));
export const getPlayer = (id: string) => PLAYERS.find(player => player.id === id);

export const RADAR_AXES = ['속도', '지능', '개성', '지명도', '몸값'] as const;
const clamp = (value: number) => Math.round(Math.max(0, Math.min(100, value)));
export function playerRatings(player: Player): (number | null)[] {
  // Fixed reference scales avoid changing every player's chart when the roster changes.
  const blendedPrice = (2 * player.inputPerMillion + player.outputPerMillion) / 3;
  return [
    clamp(player.tokensPerSecond / 150 * 100),
    player.intelligence === null ? null : clamp(player.intelligence / 60 * 100),
    player.personality,
    player.brand,
    clamp(100 * blendedPrice / (blendedPrice + 2)),
  ];
}

// Never substitute the scouting snapshot for the current, operator-filtered catalog.
export function selectRosterModels(models: OpenRouterModel[]): OpenRouterModel[] {
  return PLAYERS.flatMap(player => {
    const model = models.find(item => item.id === player.id);
    return model ? [model] : [];
  });
}

export function parsePlayerDraft(value: string | null): string[] {
  return [...new Set((value || '').split(',').filter(id => !!getPlayer(id)))].slice(0, 8);
}
