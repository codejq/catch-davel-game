import type { LevelDefinition } from '../level-definition.ts';
import { LEVEL_031 } from './level-031.ts';
import { LEVEL_032 } from './level-032.ts';
import { LEVEL_033 } from './level-033.ts';

export { LEVEL_031 } from './level-031.ts';
export { LEVEL_032 } from './level-032.ts';
export { LEVEL_033 } from './level-033.ts';

export const CHAPTER_04_LEVELS = [LEVEL_031, LEVEL_032, LEVEL_033] as const satisfies readonly LevelDefinition[];
