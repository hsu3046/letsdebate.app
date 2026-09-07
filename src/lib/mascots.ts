import { PLAYERS } from './players';

// One shared mapping keeps gallery portraits, home cards and match avatars consistent.
const homeOrder = [1, 2, 0, ...Array.from({ length: 12 }, (_, index) => index + 3)];
export const MASCOT_TEAMS = homeOrder.map((index, position) => {
  const player = PLAYERS[index];
  return {
    provider: player.id.split('/')[0], family: player.family, name: player.character.name,
    image: player.character.image, number: player.character.number, motto: player.character.tagline,
    color: ['coral', 'blue', 'yellow', 'pink', 'mint'][position % 5],
    background: player.character.color, country: player.country, modelId: player.id,
  };
});

export function getMascotTeam(provider: string) {
  return MASCOT_TEAMS.find(team => team.provider === provider);
}
