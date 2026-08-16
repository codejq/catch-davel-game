import type { LevelDefinition } from '../level-definition.ts';
import { LEVEL_021 } from './level-021.ts';
import { LEVEL_022 } from './level-022.ts';
import { LEVEL_023 } from './level-023.ts';
import { LEVEL_024 } from './level-024.ts';

export { LEVEL_021 } from './level-021.ts';
export { LEVEL_022 } from './level-022.ts';
export { LEVEL_023 } from './level-023.ts';
export { LEVEL_024 } from './level-024.ts';

export const CHAPTER_03_LEVELS = [LEVEL_021, LEVEL_022, LEVEL_023, LEVEL_024] as const satisfies readonly LevelDefinition[];
