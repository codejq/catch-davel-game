import type { RobotDefinition } from './robots';

export const WEAK_POINT_DAMAGE_MULTIPLIER = 1.5;
export const WEAK_POINT_COIN_MULTIPLIER = 2;
export const WEAK_POINT_RADIUS_SCALE = 0.24;

export interface WeakPointRobotTransform {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
}

export interface WeakPointPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function weakPointPosition(
  robot: WeakPointRobotTransform,
  definition: RobotDefinition,
): WeakPointPosition {
  const forward = 0.38 * definition.torsoWidth * definition.scale;
  return {
    x: robot.x + Math.sin(robot.heading) * forward,
    y: 1.36 * definition.scale,
    z: robot.z + Math.cos(robot.heading) * forward,
  };
}

export function weakPointRadius(definition: RobotDefinition): number {
  return WEAK_POINT_RADIUS_SCALE * definition.scale;
}
