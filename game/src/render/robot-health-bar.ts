import type { RobotRank } from '../sim/robots';

export const ROBOT_HEALTH_BAR_MAX_DISTANCE = 14;
export const ROBOT_HEALTH_BAR_INSTANCE_COUNT = 2;

interface Point { readonly x: number; readonly y: number; readonly z: number }

export interface RobotHealthBarInput {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly playerX: number;
  readonly playerZ: number;
  readonly headY: number;
  readonly scale: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly rank: RobotRank;
  readonly playerDistance: number;
}

export interface RobotHealthBarSegment {
  readonly role: 'background' | 'remaining';
  readonly start: Point;
  readonly end: Point;
  readonly radius: number;
  readonly color: readonly [number, number, number];
  readonly emission: number;
}

function localPoint(
  input: RobotHealthBarInput,
  localX: number,
  localY: number,
  localZ: number,
): Point {
  const distance = Math.max(0.001, Math.hypot(input.playerX - input.x, input.playerZ - input.z));
  const towardX = (input.playerX - input.x) / distance;
  const towardZ = (input.playerZ - input.z) / distance;
  const rightX = -towardZ;
  const rightZ = towardX;
  return {
    x: input.x + rightX * localX + towardX * localZ,
    y: localY,
    z: input.z + rightZ * localX + towardZ * localZ,
  };
}

/**
 * Returns an occlusion-correct two-capsule health bar only after a nearby,
 * non-boss Davel has taken damage. The world-space bar faces the player while
 * retaining depth occlusion; width, not color, carries the exact ratio.
 */
export function robotHealthBar(input: RobotHealthBarInput): readonly RobotHealthBarSegment[] {
  if (input.rank === 'boss' || input.health <= 0 || input.maxHealth <= 0
    || input.health >= input.maxHealth || input.playerDistance > ROBOT_HEALTH_BAR_MAX_DISTANCE) return [];
  const scale = Math.max(0.5, Math.min(2.5, input.scale));
  const ratio = Math.max(0, Math.min(1, input.health / input.maxHealth));
  const halfWidth = 0.58 * scale;
  // Keep the complete bar below the 3.1-unit wall top so maze depth can always occlude it.
  const height = Math.min(input.headY + 0.9 * scale, 2.82);
  const backgroundStart = localPoint(input, -halfWidth, height, 0.24 * scale);
  const backgroundEnd = localPoint(input, halfWidth, height, 0.24 * scale);
  const remainingStart = localPoint(input, -halfWidth, height, 0.28 * scale);
  const remainingEnd = localPoint(input, -halfWidth + halfWidth * 2 * ratio, height, 0.28 * scale);
  const color: readonly [number, number, number] = ratio > 0.55
    ? [0.18, 1, 0.68] : ratio > 0.25 ? [1, 0.78, 0.08] : [1, 0.18, 0.24];
  return [
    {
      role: 'background', start: backgroundStart, end: backgroundEnd,
      radius: 0.075 * scale, color: [0.035, 0.055, 0.1], emission: 0,
    },
    {
      role: 'remaining', start: remainingStart, end: remainingEnd,
      radius: 0.045 * scale, color, emission: 0.68,
    },
  ];
}
