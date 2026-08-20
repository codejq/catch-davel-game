import type { LevelDefinition } from '../level-definition.ts';
import { PLAYABLE_LEVEL_IDS, type PlayableLevelId } from '../level-ids.ts';
import { CHAPTER_01_LEVELS } from './chapter-01.ts';
import { CHAPTER_02_LEVELS } from './chapter-02.ts';
import { CHAPTER_03_LEVELS } from './chapter-03.ts';
import { CHAPTER_04_LEVELS } from './chapter-04.ts';

export { PLAYABLE_LEVEL_IDS, type PlayableLevelId } from '../level-ids.ts';

/**
 * The only runtime registry of fully authored, validated campaign levels.
 * Reserved 001–036 IDs do not become playable merely by existing in the public
 * numbering envelope; a definition must be added here and pass catalog tests.
 */
export const PLAYABLE_LEVELS: readonly LevelDefinition[] = [
  ...CHAPTER_01_LEVELS, ...CHAPTER_02_LEVELS, ...CHAPTER_03_LEVELS, ...CHAPTER_04_LEVELS,
];

const PLAYABLE_LEVEL_BY_ID: ReadonlyMap<PlayableLevelId, LevelDefinition> = new Map(
  PLAYABLE_LEVELS.map((level) => [level.id as PlayableLevelId, level]),
);

if (PLAYABLE_LEVELS.length !== PLAYABLE_LEVEL_IDS.length
  || PLAYABLE_LEVEL_IDS.some((levelId, index) => PLAYABLE_LEVELS[index]?.id !== levelId)) {
  throw new Error('Playable level registry and ID order disagree');
}

export function campaignLevel(levelId: PlayableLevelId): LevelDefinition {
  const level = PLAYABLE_LEVEL_BY_ID.get(levelId);
  if (level === undefined) throw new Error(`Unknown playable campaign level ${levelId}`);
  return level;
}
