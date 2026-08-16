import type { Chapter01LevelId } from '../content/level-ids';

export const CHAPTER_01_LEVEL_TITLES: Readonly<Record<Chapter01LevelId, string>> = {
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
};

export function chapter01LevelTitle(levelId: Chapter01LevelId): string {
  return CHAPTER_01_LEVEL_TITLES[levelId];
}
