import { FIXED_DT_SECONDS, PLAYER_EYE_HEIGHT, PLAYER_RADIUS } from './constants';
import { isWallAtWorld } from './level';
import type { PlayerState } from './player';
import { ROBOT_DEFINITIONS, type RobotArchetype, type RobotState } from './robots';
import {
  ENEMY_ATTACK_RANGE, ENEMY_DJ_BUFF_RADIUS, ENEMY_DJ_BUFF_TICKS, ENEMY_FIREBALL_DAMAGE,
  ENEMY_FIREBALL_SPEED, ENEMY_MELEE_DAMAGE, ENEMY_PROJECTILE_DAMAGE, ENEMY_PROJECTILE_SPEED,
  ENEMY_REPEAT_COOLDOWN_BASE, ENEMY_REPEAT_COOLDOWN_STEP, ENEMY_SLIDER_BOLT_SPEED,
} from './balance';

export type EnemyProjectileKind = 'slider-bolt' | 'beat-bolt' | 'fireball';

export interface EnemyProjectile {
  readonly id: number;
  readonly ownerRobotId: number;
  readonly kind: EnemyProjectileKind;
  x: number;
  y: number;
  z: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  lifeTicks: number;
}

export interface EnemyCombatResult {
  readonly nextProjectileId: number;
  readonly firedRobotIds: readonly number[];
  readonly telegraphRobotIds: readonly number[];
  readonly meleeRobotIds: readonly number[];
  readonly buffRobotIds: readonly number[];
  readonly playerHitRobotIds: readonly number[];
}

function clearShot(fromX: number, fromZ: number, toX: number, toZ: number, maximumRange = ENEMY_ATTACK_RANGE): boolean {
  const deltaX = toX - fromX;
  const deltaZ = toZ - fromZ;
  const distance = Math.hypot(deltaX, deltaZ);
  if (distance > maximumRange) return false;
  const steps = Math.max(1, Math.ceil(distance / 0.18));
  for (let step = 1; step < steps; step += 1) {
    const amount = step / steps;
    if (isWallAtWorld(fromX + deltaX * amount, fromZ + deltaZ * amount)) return false;
  }
  return true;
}

function telegraphTicks(archetype: RobotArchetype): number {
  if (archetype === 'wobble-scout') return 24;
  if (archetype === 'blue-slider') return 18;
  if (archetype === 'yellow-spinner') return 30;
  if (archetype === 'red-firemouth') return 38;
  return 34;
}

function projectileKind(archetype: RobotArchetype): EnemyProjectileKind {
  if (archetype === 'blue-slider') return 'slider-bolt';
  if (archetype === 'red-firemouth') return 'fireball';
  return 'beat-bolt';
}

function projectileSpeed(kind: EnemyProjectileKind): number {
  if (kind === 'slider-bolt') return ENEMY_SLIDER_BOLT_SPEED;
  if (kind === 'fireball') return ENEMY_FIREBALL_SPEED;
  return ENEMY_PROJECTILE_SPEED;
}

function projectileDamage(kind: EnemyProjectileKind): number {
  return kind === 'fireball' ? ENEMY_FIREBALL_DAMAGE : ENEMY_PROJECTILE_DAMAGE;
}

function canBeginAttack(robot: RobotState, player: PlayerState): boolean {
  const definition = ROBOT_DEFINITIONS[robot.id]!;
  const distance = Math.hypot(player.x - robot.x, player.z - robot.z);
  if (definition.archetype === 'wobble-scout') return distance <= 1.85 && clearShot(robot.x, robot.z, player.x, player.z, 2.1);
  if (definition.archetype === 'cyan-dj') return distance <= 10;
  return clearShot(robot.x, robot.z, player.x, player.z);
}

function fireProjectile(robot: RobotState, player: PlayerState, id: number): EnemyProjectile {
  const definition = ROBOT_DEFINITIONS[robot.id]!;
  const kind = projectileKind(definition.archetype);
  const originY = definition.scale * 1.72;
  const deltaX = player.x - robot.x;
  const deltaY = PLAYER_EYE_HEIGHT - 0.18 - originY;
  const deltaZ = player.z - robot.z;
  const distance = Math.max(0.001, Math.hypot(deltaX, deltaY, deltaZ));
  const speed = projectileSpeed(kind);
  return {
    id, ownerRobotId: robot.id, kind, x: robot.x, y: originY, z: robot.z,
    velocityX: (deltaX / distance) * speed,
    velocityY: (deltaY / distance) * speed,
    velocityZ: (deltaZ / distance) * speed,
    lifeTicks: kind === 'fireball' ? 300 : 240,
  };
}

export function stepEnemyCombat(
  player: PlayerState,
  robots: RobotState[],
  projectiles: EnemyProjectile[],
  nextProjectileId: number,
): EnemyCombatResult {
  const firedRobotIds: number[] = [];
  const telegraphRobotIds: number[] = [];
  const meleeRobotIds: number[] = [];
  const buffRobotIds: number[] = [];
  const playerHitRobotIds: number[] = [];
  let nextId = nextProjectileId;
  if (player.health > 0) {
    for (const robot of robots) {
      if (!robot.active) continue;
      const definition = ROBOT_DEFINITIONS[robot.id]!;
      if (robot.combatState === 'recover') {
        robot.combatTicks -= 1;
        if (robot.combatTicks <= 0) robot.combatState = 'patrol';
        continue;
      }
      if (robot.combatState === 'telegraph') {
        robot.combatTicks -= 1;
        if (robot.combatTicks > 0) continue;
        if (definition.archetype === 'wobble-scout') {
          if (canBeginAttack(robot, player)) {
            player.health = Math.max(0, player.health - ENEMY_MELEE_DAMAGE);
            meleeRobotIds.push(robot.id);
            playerHitRobotIds.push(robot.id);
          }
        } else if (definition.archetype === 'cyan-dj') {
          for (const ally of robots) {
            if (!ally.active || ally.id === robot.id || Math.hypot(ally.x - robot.x, ally.z - robot.z) > ENEMY_DJ_BUFF_RADIUS) continue;
            ally.tempoBuffTicks = Math.max(ally.tempoBuffTicks, ENEMY_DJ_BUFF_TICKS);
            ally.attackCooldownTicks = Math.min(ally.attackCooldownTicks, 36);
          }
          buffRobotIds.push(robot.id);
        } else if (clearShot(robot.x, robot.z, player.x, player.z)) {
          projectiles.push(fireProjectile(robot, player, nextId));
          nextId += 1;
          firedRobotIds.push(robot.id);
        }
        robot.combatState = 'recover';
        robot.combatTicks = definition.archetype === 'red-firemouth' ? 32 : 20;
        robot.attackCooldownTicks = ENEMY_REPEAT_COOLDOWN_BASE + robot.id * ENEMY_REPEAT_COOLDOWN_STEP;
        continue;
      }
      if (robot.attackCooldownTicks > 0) robot.attackCooldownTicks -= robot.tempoBuffTicks > 0 ? 2 : 1;
      if (robot.attackCooldownTicks > 0 || !canBeginAttack(robot, player)) continue;
      robot.combatState = 'telegraph';
      robot.combatTicks = telegraphTicks(definition.archetype);
      telegraphRobotIds.push(robot.id);
    }
  }
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = projectiles[index]!;
    projectile.x += projectile.velocityX * FIXED_DT_SECONDS;
    projectile.y += projectile.velocityY * FIXED_DT_SECONDS;
    projectile.z += projectile.velocityZ * FIXED_DT_SECONDS;
    projectile.lifeTicks -= 1;
    const radius = projectile.kind === 'fireball' ? 0.34 : 0.18;
    const horizontalDistance = Math.hypot(projectile.x - player.x, projectile.z - player.z);
    const hitsPlayer = player.health > 0 && horizontalDistance < PLAYER_RADIUS + radius
      && projectile.y > 0.15 && projectile.y < PLAYER_EYE_HEIGHT + radius;
    if (hitsPlayer) {
      player.health = Math.max(0, player.health - projectileDamage(projectile.kind));
      playerHitRobotIds.push(projectile.ownerRobotId);
      projectiles.splice(index, 1);
    } else if (projectile.lifeTicks <= 0 || projectile.y < 0.05 || isWallAtWorld(projectile.x, projectile.z)) {
      projectiles.splice(index, 1);
    }
  }
  return { nextProjectileId: nextId, firedRobotIds, telegraphRobotIds, meleeRobotIds, buffRobotIds, playerHitRobotIds };
}
