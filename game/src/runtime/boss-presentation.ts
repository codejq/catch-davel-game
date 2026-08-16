import { ROBOT_DEFINITIONS } from '../sim/robots';
import type { RenderRobotState } from '../render/render-model';
import { difficultyRobotHealth, type DifficultyId } from '../sim/difficulty';

export interface BossPresentation {
  readonly robotId: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly healthRatio: number;
  readonly phase: 1 | 2 | 3;
}

export function bossPresentation(
  robots: readonly RenderRobotState[], difficulty: DifficultyId = 'standard',
): BossPresentation | null {
  const boss = robots.find((robot) => robot.active && robot.bossPhase > 0);
  if (boss === undefined) return null;
  const definition = ROBOT_DEFINITIONS[boss.id];
  if (definition === undefined || definition.rank !== 'boss') return null;
  const maxHealth = difficultyRobotHealth(definition.maxHealth, difficulty);
  const health = Math.max(0, Math.min(maxHealth, boss.health));
  return {
    robotId: boss.id,
    health,
    maxHealth,
    healthRatio: health / maxHealth,
    phase: boss.bossPhase as 1 | 2 | 3,
  };
}
