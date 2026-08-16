import type { LevelDefinition } from '../level-definition.ts';
import { LEVEL_021 } from './level-021.ts';

export { LEVEL_021 } from './level-021.ts';

export const CHAPTER_03_LEVELS = [LEVEL_021] as const satisfies readonly LevelDefinition[];
