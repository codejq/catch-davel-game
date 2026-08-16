import type { LevelDefinition } from '../level-definition.ts';
import { LEVEL_021 } from './level-021.ts';
import { LEVEL_022 } from './level-022.ts';
import { LEVEL_023 } from './level-023.ts';
import { LEVEL_024 } from './level-024.ts';
import { LEVEL_025 } from './level-025.ts';
import { LEVEL_026 } from './level-026.ts';
import { LEVEL_027 } from './level-027.ts';

export { LEVEL_021 } from './level-021.ts';
export { LEVEL_022 } from './level-022.ts';
export { LEVEL_023 } from './level-023.ts';
export { LEVEL_024 } from './level-024.ts';
export { LEVEL_025 } from './level-025.ts';
export { LEVEL_026 } from './level-026.ts';
export { LEVEL_027 } from './level-027.ts';

export const CHAPTER_03_LEVELS = [LEVEL_021, LEVEL_022, LEVEL_023, LEVEL_024, LEVEL_025, LEVEL_026, LEVEL_027] as const satisfies readonly LevelDefinition[];
