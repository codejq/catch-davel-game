import { FIXED_DT_SECONDS, PLAYER_EYE_HEIGHT, PLAYER_RADIUS } from './constants';
import { isWallAtWorld } from './level';
import type { PlayerState } from './player';
import { ROBOT_DEFINITIONS, type RobotState } from './robots';
import {
  ENEMY_ATTACK_RANGE, ENEMY_PROJECTILE_DAMAGE, ENEMY_PROJECTILE_SPEED,
  ENEMY_REPEAT_COOLDOWN_BASE, ENEMY_REPEAT_COOLDOWN_STEP,
} from './balance';

export interface EnemyProjectile {
  readonly id: number;
  readonly ownerRobotId: number;
  x: number;
  y: number;
  z: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly velocityZ: number;
  lifeTicks: number;
}

export interface EnemyCombatResult {
  readonly nextProjectileId: number;
  readonly firedRobotIds: readonly number[];
  readonly playerHitRobotIds: readonly number[];
}

function clearShot(fromX: number, fromZ: number, toX: number, toZ: number): boolean {
  const deltaX = toX - fromX;
  const deltaZ = toZ - fromZ;
  const distance = Math.hypot(deltaX, deltaZ);
  if (distance > ENEMY_ATTACK_RANGE) return false;
  const steps = Math.max(1, Math.ceil(distance / 0.18));
  for (let step = 1; step < steps; step += 1) {
    const amount = step / steps;
    if (isWallAtWorld(fromX + deltaX * amount, fromZ + deltaZ * amount)) return false;
  }
  return true;
}

export function stepEnemyCombat(
  player: PlayerState,
  robots: RobotState[],
  projectiles: EnemyProjectile[],
  nextProjectileId: number,
): EnemyCombatResult {
  const firedRobotIds: number[] = [];
  const playerHitRobotIds: number[] = [];
  let nextId = nextProjectileId;
  if (player.health > 0) {
    for (const robot of robots) {
      if (!robot.active) continue;
      if (robot.attackCooldownTicks > 0) robot.attackCooldownTicks -= 1;
      if (robot.attackCooldownTicks > 0 || !clearShot(robot.x, robot.z, player.x, player.z)) continue;
      const definition = ROBOT_DEFINITIONS[robot.id]!;
      const originY = definition.scale * 1.72;
      const deltaX = player.x - robot.x;
      const deltaY = PLAYER_EYE_HEIGHT - 0.18 - originY;
      const deltaZ = player.z - robot.z;
      const distance = Math.max(0.001, Math.hypot(deltaX, deltaY, deltaZ));
      projectiles.push({
        id: nextId, ownerRobotId: robot.id, x: robot.x, y: originY, z: robot.z,
        velocityX: (deltaX / distance) * ENEMY_PROJECTILE_SPEED,
        velocityY: (deltaY / distance) * ENEMY_PROJECTILE_SPEED,
        velocityZ: (deltaZ / distance) * ENEMY_PROJECTILE_SPEED,
        lifeTicks: 240,
      });
      nextId += 1;
      firedRobotIds.push(robot.id);
      robot.attackCooldownTicks = ENEMY_REPEAT_COOLDOWN_BASE + robot.id * ENEMY_REPEAT_COOLDOWN_STEP;
    }
  }
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = projectiles[index]!;
    projectile.x += projectile.velocityX * FIXED_DT_SECONDS;
    projectile.y += projectile.velocityY * FIXED_DT_SECONDS;
    projectile.z += projectile.velocityZ * FIXED_DT_SECONDS;
    projectile.lifeTicks -= 1;
    const horizontalDistance = Math.hypot(projectile.x - player.x, projectile.z - player.z);
    const hitsPlayer = player.health > 0 && horizontalDistance < PLAYER_RADIUS + 0.18 && projectile.y > 0.2 && projectile.y < PLAYER_EYE_HEIGHT + 0.25;
    if (hitsPlayer) {
      player.health = Math.max(0, player.health - ENEMY_PROJECTILE_DAMAGE);
      playerHitRobotIds.push(projectile.ownerRobotId);
      projectiles.splice(index, 1);
    } else if (projectile.lifeTicks <= 0 || projectile.y < 0.05 || isWallAtWorld(projectile.x, projectile.z)) {
      projectiles.splice(index, 1);
    }
  }
  return { nextProjectileId: nextId, firedRobotIds, playerHitRobotIds };
}
