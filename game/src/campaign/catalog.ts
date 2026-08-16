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
  'level-013': "Spinner's Midway",
  'level-014': 'Firebreather Funhouse',
  'level-015': 'Tempo Tent Takeover',
  'level-016': 'Laughing Mirrors',
  'level-017': 'Prize Booth Panic',
  'level-018': 'Big Top Backtrack',
  'level-019': 'Midnight Matinee',
  'level-020': 'Ringmaster Davel',
  'level-021': 'Pipework Promenade',
  'level-022': 'Green Steam',
  'level-023': 'Firemouth Fiesta',
  'level-024': 'Valve Velocity',
};

export function campaignLevelTitle(levelId: PlayableLevelId): string {
  return CAMPAIGN_LEVEL_TITLES[levelId];
}
