import type { PlayableLevelId } from '../content/level-ids';

export const CAMPAIGN_LEVEL_TITLES: Readonly<Record<PlayableLevelId, string>> = {
  'level-001': 'Wobble Workshop',
  'level-002': 'Grinning Hall',
  'level-003': 'Coin Circuit',
  'level-004': 'Wrong-Turn Boogie',
  'level-005': "Foreman's Two-Step",
  'level-006': 'Conveyor Conga',
  'level-007': 'Lights Out, Smiles On',
  'level-008': 'Shift Change',
  'level-009': 'Workshop Rush',
  'level-010': 'Chief Wobble',
  'level-011': 'Ticket Trouble',
  'level-012': 'Sliding Sideshow',
};

export function campaignLevelTitle(levelId: PlayableLevelId): string {
  return CAMPAIGN_LEVEL_TITLES[levelId];
}
