import { ROBOT_DEFINITIONS } from '../sim/robots';
import type { RenderRobotState } from '../render/render-model';

export interface BossPresentation {
  readonly robotId: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly healthRatio: number;
  readonly phase: 1 | 2 | 3;
}

export function bossPresentation(robots: readonly RenderRobotState[]): BossPresentation | null {
  const boss = robots.find((robot) => robot.active && robot.bossPhase > 0);
  if (boss === undefined) return null;
  const definition = ROBOT_DEFINITIONS[boss.id];
  if (definition === undefined || definition.rank !== 'boss') return null;
  const health = Math.max(0, Math.min(definition.maxHealth, boss.health));
  return {
    robotId: boss.id,
    health,
    maxHealth: definition.maxHealth,
    healthRatio: health / definition.maxHealth,
    phase: boss.bossPhase as 1 | 2 | 3,
  };
}
