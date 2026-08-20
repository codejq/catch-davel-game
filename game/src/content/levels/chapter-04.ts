import type { LevelDefinition } from '../level-definition.ts';
import { LEVEL_031 } from './level-031.ts';
import { LEVEL_032 } from './level-032.ts';
import { LEVEL_033 } from './level-033.ts';
import { LEVEL_034 } from './level-034.ts';
import { LEVEL_035 } from './level-035.ts';
import { LEVEL_036 } from './level-036.ts';

export { LEVEL_031 } from './level-031.ts';
export { LEVEL_032 } from './level-032.ts';
export { LEVEL_033 } from './level-033.ts';
export { LEVEL_034 } from './level-034.ts';
export { LEVEL_035 } from './level-035.ts';
export { LEVEL_036 } from './level-036.ts';

export const CHAPTER_04_LEVELS = [LEVEL_031, LEVEL_032, LEVEL_033, LEVEL_034, LEVEL_035, LEVEL_036] as const satisfies readonly LevelDefinition[];
