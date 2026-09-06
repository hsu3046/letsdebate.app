/** Existing character artwork represents a provider's team, not a model's abilities. */
export const MASCOT_TEAMS = [
  { provider: 'anthropic', family: 'Claude', name: '소피', image: '/avatars/avatar_sophie.jpeg', number: '01', color: 'coral', motto: '차분하게 한 수 앞서' },
  { provider: 'openai', family: 'GPT', name: '빅터', image: '/avatars/avatar_victor.jpeg', number: '02', color: 'blue', motto: '논리의 빈틈을 찾아서' },
  { provider: 'google', family: 'Gemini', name: '헨리', image: '/avatars/avatar_henry.jpeg', number: '03', color: 'yellow', motto: '새로운 관점으로 한 걸음' },
  { provider: 'x-ai', family: 'Grok', name: '레오', image: '/avatars/avatar_leo.jpeg', number: '04', color: 'pink', motto: '할 말은 하고 가야지' },
  { provider: 'deepseek', family: 'DeepSeek', name: '맥스', image: '/avatars/avatar_max.jpeg', number: '05', color: 'mint', motto: '끝까지 파고드는 승부' },
] as const;

export function getMascotTeam(provider: string) {
  return MASCOT_TEAMS.find(team => team.provider === provider);
}
