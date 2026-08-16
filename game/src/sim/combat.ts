import { PLAYER_EYE_HEIGHT } from './constants';
import { isWallAtWorld } from './level';
import { ROBOT_DEFINITIONS, type RobotState } from './robots';
import type { PlayerState } from './player';
import { applyRobotBodyImpulse } from './xpbd';

export const PULSE_DAMAGE = 40;
export const PULSE_COOLDOWN_TICKS = 10;
export const PULSE_ENERGY_COST = 4;
export const PULSE_MAX_RANGE = 42;

export interface ShotResult {
  readonly fired: boolean;
  readonly hitRobotId: number | null;
  readonly defeatedRobotId: number | null;
  readonly coinsAwarded: number;
}

const noShot: ShotResult = { fired: false, hitRobotId: null, defeatedRobotId: null, coinsAwarded: 0 };

function wallDistance(originX: number, originZ: number, directionX: number, directionZ: number): number {
  for (let distance = 0.15; distance <= PULSE_MAX_RANGE; distance += 0.15) {
    if (isWallAtWorld(originX + directionX * distance, originZ + directionZ * distance)) return distance;
  }
  return PULSE_MAX_RANGE;
}

function sphereDistance(
  originX: number, originY: number, originZ: number,
  directionX: number, directionY: number, directionZ: number,
  centerX: number, centerY: number, centerZ: number, radius: number,
): number | null {
  const offsetX = originX - centerX;
  const offsetY = originY - centerY;
  const offsetZ = originZ - centerZ;
  const b = offsetX * directionX + offsetY * directionY + offsetZ * directionZ;
  const c = offsetX * offsetX + offsetY * offsetY + offsetZ * offsetZ - radius * radius;
  const discriminant = b * b - c;
  if (discriminant < 0) return null;
  const near = -b - Math.sqrt(discriminant);
  if (near >= 0) return near;
  const far = -b + Math.sqrt(discriminant);
  return far >= 0 ? far : null;
}

export function firePulse(player: PlayerState, robots: RobotState[], tick: number, lastShotTick: number): ShotResult {
  if (tick - lastShotTick < PULSE_COOLDOWN_TICKS || player.energy < PULSE_ENERGY_COST) return noShot;
  player.energy -= PULSE_ENERGY_COST;
  const cosPitch = Math.cos(player.pitch);
  const directionX = Math.sin(player.yaw) * cosPitch;
  const directionY = Math.sin(player.pitch);
  const directionZ = -Math.cos(player.yaw) * cosPitch;
  const obstructionDistance = wallDistance(player.x, player.z, directionX, directionZ);
  let target: RobotState | null = null;
  let targetDistance = obstructionDistance;
  for (const robot of robots) {
    if (!robot.active) continue;
    const definition = ROBOT_DEFINITIONS[robot.id]!;
    const distance = sphereDistance(
      player.x, PLAYER_EYE_HEIGHT, player.z,
      directionX, directionY, directionZ,
      robot.x, definition.scale * 1.16, robot.z, definition.scale * 0.76,
    );
    if (distance !== null && distance < targetDistance) {
      target = robot;
      targetDistance = distance;
    }
  }
  if (target === null) return { fired: true, hitRobotId: null, defeatedRobotId: null, coinsAwarded: 0 };
  target.health = Math.max(0, target.health - PULSE_DAMAGE);
  target.hitFlashTicks = 7;
  target.knockbackX += directionX * 0.075;
  target.knockbackZ += directionZ * 0.075;
  applyRobotBodyImpulse(target, directionX * 0.055, 0.055, directionZ * 0.055);
  if (target.health > 0) return { fired: true, hitRobotId: target.id, defeatedRobotId: null, coinsAwarded: 0 };
  target.active = false;
  const reward = 10 + target.id * 3;
  player.coins += reward;
  return { fired: true, hitRobotId: target.id, defeatedRobotId: target.id, coinsAwarded: reward };
}
