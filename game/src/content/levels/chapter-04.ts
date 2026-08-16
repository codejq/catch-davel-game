import type { LevelDefinition } from '../level-definition.ts';
import { LEVEL_031 } from './level-031.ts';

export { LEVEL_031 } from './level-031.ts';

export const CHAPTER_04_LEVELS = [LEVEL_031] as const satisfies readonly LevelDefinition[];
