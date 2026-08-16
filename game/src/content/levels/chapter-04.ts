import type { LevelDefinition } from '../level-definition.ts';
import { LEVEL_031 } from './level-031.ts';
import { LEVEL_032 } from './level-032.ts';

export { LEVEL_031 } from './level-031.ts';
export { LEVEL_032 } from './level-032.ts';

export const CHAPTER_04_LEVELS = [LEVEL_031, LEVEL_032] as const satisfies readonly LevelDefinition[];
