import { FIXED_DT_SECONDS, PLAYER_EYE_HEIGHT } from './constants';
import { isWallAtWorld } from './level';
import { ROBOT_DEFINITIONS, type RobotState } from './robots';
import type { PlayerState } from './player';
import { applyRobotBodyImpulse } from './xpbd';
import type { EnemyProjectile } from './enemy-combat';
import type { PlayerBomb } from './weapons';
import type { Chapter01LevelId } from '../content/levels/chapter-01';
import { isDanceWeakPointActive } from './dance-timing';
import { decision, hashSeed } from './random';
import {
  WEAK_POINT_COIN_MULTIPLIER, WEAK_POINT_DAMAGE_MULTIPLIER, weakPointPosition, weakPointRadius,
} from './weak-point';

export const PULSE_DAMAGE = 40;
export const PULSE_DAMAGE_PER_UPGRADE = 6;
export const PULSE_COOLDOWN_TICKS = 10;
export const PULSE_ENERGY_COST = 4;
export const PULSE_ENERGY_REDUCTION_PER_UPGRADE = 0.5;
export const PULSE_MAX_RANGE = 42;
export const PULSE_SPREAD_VERSION = 1;
export const PULSE_BURST_RESET_TICKS = 30;
export const PULSE_MAX_BURST_SHOTS = 4;
export const PULSE_SPREAD_RADIANS_PER_SHOT = 0.006;
export const PULSE_MAX_SPREAD_RADIANS = PULSE_MAX_BURST_SHOTS * PULSE_SPREAD_RADIANS_PER_SHOT;
export const SWORD_DAMAGE = 50;
export const SWORD_CHARGED_DAMAGE = 90;
export const SWORD_RANGE = 2.65;
export const SWORD_CHARGED_RANGE = 3.25;
export const BOMB_FUSE_TICKS = 90;
export const BOMB_COOLDOWN_TICKS = 30;
export const BOMB_BLAST_RADIUS = 5.25;
export const BOMB_DAMAGE = 78;
export const SWORD_HEAT_COOL_PER_TICK = 0.7;
export const SWORD_HEAT_REDUCTION_PER_UPGRADE = 0.12;
export const LASER_ENERGY_PER_TICK = 0.42;
export const LASER_HEAT_PER_TICK = 1.35;
export const LASER_HEAT_COOL_PER_TICK = 0.9;
export const LASER_OVERHEAT_RECOVERY = 35;
export const LASER_HEAT_REDUCTION_PER_UPGRADE = 0.12;
export const LASER_BASE_DAMAGE = 2.4;
export const LASER_MAX_FOCUS_BONUS = 3.6;

export interface ShotResult {
  readonly fired: boolean;
  readonly hitRobotId: number | null;
  readonly defeatedRobotId: number | null;
  readonly coinsAwarded: number;
  readonly weakPoint: boolean;
  readonly spreadRadians: number;
  readonly impactKind: PulseImpactKind;
  readonly impactX: number;
  readonly impactY: number;
  readonly impactZ: number;
}

export const PULSE_IMPACT_KIND = { range: 0, wall: 1, robot: 2 } as const;
export type PulseImpactKind = typeof PULSE_IMPACT_KIND[keyof typeof PULSE_IMPACT_KIND];

export interface WeaponHit {
  readonly robotId: number;
  readonly defeated: boolean;
  readonly coinsAwarded: number;
  readonly weakPoint: boolean;
}

export interface SwordResult {
  readonly activated: boolean;
  readonly charged: boolean;
  readonly hit: WeaponHit | null;
  readonly deflectedProjectileIds: readonly number[];
}

export interface LaserResult {
  readonly hit: WeaponHit | null;
  readonly beamDistance: number;
}

export interface BombStepResult {
  readonly detonations: readonly BombDetonation[];
  readonly hits: readonly WeaponHit[];
}

export interface BombDetonation {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface AimTrace {
  readonly robot: RobotState | null;
  readonly distance: number;
  readonly weakPoint: boolean;
  readonly directionX: number;
  readonly directionY: number;
  readonly directionZ: number;
  readonly wallHit: boolean;
}

const noShot: ShotResult = {
  fired: false, hitRobotId: null, defeatedRobotId: null, coinsAwarded: 0, weakPoint: false, spreadRadians: 0,
  impactKind: PULSE_IMPACT_KIND.range, impactX: 0, impactY: 0, impactZ: 0,
};

export function effectivePulseBurstShots(tick: number, lastShotTick: number, storedBurstShots: number): number {
  return tick - lastShotTick > PULSE_BURST_RESET_TICKS ? 0 : Math.min(PULSE_MAX_BURST_SHOTS, storedBurstShots);
}

export function pulseSpreadRadians(burstShots: number): number {
  return Math.min(PULSE_MAX_BURST_SHOTS, Math.max(0, burstShots)) * PULSE_SPREAD_RADIANS_PER_SHOT;
}

export function pulseSpreadOffset(
  seedText: string, shotSerial: number, burstShots: number,
): { readonly yaw: number; readonly pitch: number; readonly radians: number } {
  const radians = pulseSpreadRadians(burstShots);
  if (radians === 0) return { yaw: 0, pitch: 0, radians: 0 };
  const roll = decision(hashSeed(seedText), 0x5055_4c53, shotSerial + 1);
  const angle = roll / 0x1_0000_0000 * Math.PI * 2;
  return { yaw: Math.cos(angle) * radians, pitch: Math.sin(angle) * radians, radians };
}

function clearLine(
  fromX: number, fromZ: number, toX: number, toZ: number, levelId: Chapter01LevelId,
): boolean {
  const deltaX = toX - fromX;
  const deltaZ = toZ - fromZ;
  const distance = Math.hypot(deltaX, deltaZ);
  const steps = Math.max(1, Math.ceil(distance / 0.15));
  for (let step = 1; step < steps; step += 1) {
    const amount = step / steps;
    if (isWallAtWorld(fromX + deltaX * amount, fromZ + deltaZ * amount, levelId)) return false;
  }
  return true;
}

function wallDistance(
  originX: number, originZ: number, directionX: number, directionZ: number, maximumRange: number,
  levelId: Chapter01LevelId,
): number {
  for (let distance = 0.15; distance <= maximumRange; distance += 0.15) {
    if (isWallAtWorld(originX + directionX * distance, originZ + directionZ * distance, levelId)) return distance;
  }
  return maximumRange;
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

function traceAim(
  player: PlayerState, robots: readonly RobotState[], maximumRange: number, levelId: Chapter01LevelId, tick: number,
  yawOffset = 0, pitchOffset = 0,
): AimTrace {
  const yaw = player.yaw + yawOffset;
  const pitch = Math.max(-1.25, Math.min(1.25, player.pitch + pitchOffset));
  const cosPitch = Math.cos(pitch);
  const directionX = Math.sin(yaw) * cosPitch;
  const directionY = Math.sin(pitch);
  const directionZ = -Math.cos(yaw) * cosPitch;
  const obstructionDistance = wallDistance(player.x, player.z, directionX, directionZ, maximumRange, levelId);
  let target: RobotState | null = null;
  let targetDistance = obstructionDistance;
  let targetWeakPoint = false;
  const vulnerabilityActive = isDanceWeakPointActive(levelId, tick);
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
      if (vulnerabilityActive) {
        const weakPoint = weakPointPosition(robot, definition);
        targetWeakPoint = sphereDistance(
          player.x, PLAYER_EYE_HEIGHT, player.z,
          directionX, directionY, directionZ,
          weakPoint.x, weakPoint.y, weakPoint.z, weakPointRadius(definition),
        ) !== null;
      } else targetWeakPoint = false;
    }
  }
  return {
    robot: target, distance: targetDistance, weakPoint: targetWeakPoint,
    directionX, directionY, directionZ, wallHit: target === null && obstructionDistance < maximumRange,
  };
}

function pulseImpact(trace: AimTrace, player: PlayerState): Pick<ShotResult, 'impactKind' | 'impactX' | 'impactY' | 'impactZ'> {
  // Pull the visual anchor just in front of the traced surface so depth testing cannot bury the spark inside a wall or body.
  const visualDistance = Math.max(0, trace.distance - 0.12);
  return {
    impactKind: trace.robot !== null ? PULSE_IMPACT_KIND.robot
      : trace.wallHit ? PULSE_IMPACT_KIND.wall : PULSE_IMPACT_KIND.range,
    impactX: player.x + trace.directionX * visualDistance,
    impactY: PLAYER_EYE_HEIGHT + trace.directionY * visualDistance,
    impactZ: player.z + trace.directionZ * visualDistance,
  };
}

export function damageRobot(
  player: PlayerState,
  robot: RobotState,
  damage: number,
  impulseX: number,
  impulseY: number,
  impulseZ: number,
  weakPoint = false,
): WeaponHit {
  robot.health = Math.max(0, robot.health - damage * (weakPoint ? WEAK_POINT_DAMAGE_MULTIPLIER : 1));
  robot.hitFlashTicks = 7;
  robot.knockbackX += impulseX;
  robot.knockbackZ += impulseZ;
  applyRobotBodyImpulse(robot, impulseX * 0.74, impulseY, impulseZ * 0.74);
  if (robot.health > 0) return { robotId: robot.id, defeated: false, coinsAwarded: 0, weakPoint };
  robot.active = false;
  const reward = ROBOT_DEFINITIONS[robot.id]!.coinReward * (weakPoint ? WEAK_POINT_COIN_MULTIPLIER : 1);
  player.coins += reward;
  return { robotId: robot.id, defeated: true, coinsAwarded: reward, weakPoint };
}

export function firePulse(
  player: PlayerState, robots: RobotState[], tick: number, lastShotTick: number,
  levelId: Chapter01LevelId = 'level-001', seed = 'pulse-default', shotSerial = 0, burstShots = 0,
): ShotResult {
  const energyCost = Math.max(1, PULSE_ENERGY_COST - player.weaponUpgrades.pulseEfficiency * PULSE_ENERGY_REDUCTION_PER_UPGRADE);
  if (tick - lastShotTick < PULSE_COOLDOWN_TICKS || player.energy < energyCost) return noShot;
  player.energy -= energyCost;
  const spread = pulseSpreadOffset(seed, shotSerial, burstShots);
  const trace = traceAim(player, robots, PULSE_MAX_RANGE, levelId, tick, spread.yaw, spread.pitch);
  const impact = pulseImpact(trace, player);
  if (trace.robot === null) {
    return {
      fired: true, hitRobotId: null, defeatedRobotId: null, coinsAwarded: 0,
      weakPoint: false, spreadRadians: spread.radians, ...impact,
    };
  }
  const damage = PULSE_DAMAGE + player.weaponUpgrades.pulseDamage * PULSE_DAMAGE_PER_UPGRADE;
  const hit = damageRobot(
    player, trace.robot, damage, trace.directionX * 0.075, 0.055, trace.directionZ * 0.075, trace.weakPoint,
  );
  return {
    fired: true, hitRobotId: hit.robotId, defeatedRobotId: hit.defeated ? hit.robotId : null,
    coinsAwarded: hit.coinsAwarded, weakPoint: hit.weakPoint, spreadRadians: spread.radians, ...impact,
  };
}

export function swingSword(
  player: PlayerState,
  robots: RobotState[],
  projectiles: EnemyProjectile[],
  tick: number,
  lastSwordTick: number,
  charged: boolean,
  levelId: Chapter01LevelId = 'level-001',
): SwordResult {
  const cooldown = charged ? 40 : 14;
  const baseHeat = charged ? 44 : 18;
  const heat = baseHeat * (1 - player.weaponUpgrades.swordCooling * SWORD_HEAT_REDUCTION_PER_UPGRADE);
  if (tick - lastSwordTick < cooldown || player.swordHeat + heat > 100) {
    return { activated: false, charged, hit: null, deflectedProjectileIds: [] };
  }
  player.swordHeat += heat;
  const range = charged ? SWORD_CHARGED_RANGE : SWORD_RANGE;
  const forwardX = Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);
  const deflectedProjectileIds: number[] = [];
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = projectiles[index]!;
    const deltaX = projectile.x - player.x;
    const deltaZ = projectile.z - player.z;
    const distance = Math.hypot(deltaX, deltaZ);
    const facing = distance < 0.001 ? 1 : (deltaX * forwardX + deltaZ * forwardZ) / distance;
    if (distance <= range && facing >= -0.1 && projectile.y <= PLAYER_EYE_HEIGHT + 0.65) {
      deflectedProjectileIds.push(projectile.id);
      projectiles.splice(index, 1);
    }
  }
  const target = robots.filter((robot) => robot.active).map((robot) => {
    const deltaX = robot.x - player.x;
    const deltaZ = robot.z - player.z;
    const distance = Math.hypot(deltaX, deltaZ);
    const facing = distance < 0.001 ? 1 : (deltaX * forwardX + deltaZ * forwardZ) / distance;
    return { robot, deltaX, deltaZ, distance, facing };
  }).filter((candidate) => candidate.distance <= range && candidate.facing >= (charged ? 0.35 : 0.55)
    && clearLine(player.x, player.z, candidate.robot.x, candidate.robot.z, levelId))
    .sort((first, second) => first.distance - second.distance || first.robot.id - second.robot.id)[0];
  if (target === undefined) return { activated: true, charged, hit: null, deflectedProjectileIds };
  const inverseDistance = 1 / Math.max(0.001, target.distance);
  const force = charged ? 0.3 : 0.16;
  const hit = damageRobot(
    player, target.robot, charged ? SWORD_CHARGED_DAMAGE : SWORD_DAMAGE,
    target.deltaX * inverseDistance * force, charged ? 0.18 : 0.1, target.deltaZ * inverseDistance * force,
  );
  return { activated: true, charged, hit, deflectedProjectileIds };
}

export function fireLaser(
  player: PlayerState, robots: RobotState[], damage: number, tick: number,
  levelId: Chapter01LevelId = 'level-001',
): LaserResult {
  const trace = traceAim(player, robots, PULSE_MAX_RANGE, levelId, tick);
  if (trace.robot === null) return { hit: null, beamDistance: trace.distance };
  return {
    hit: damageRobot(
      player, trace.robot, damage, trace.directionX * 0.022, 0.012, trace.directionZ * 0.022, trace.weakPoint,
    ),
    beamDistance: trace.distance,
  };
}

export function createThrownBomb(player: PlayerState, id: number): PlayerBomb {
  const cosPitch = Math.cos(player.pitch);
  const directionX = Math.sin(player.yaw) * cosPitch;
  const directionY = Math.sin(player.pitch);
  const directionZ = -Math.cos(player.yaw) * cosPitch;
  return {
    id, x: player.x + directionX * 0.45, y: PLAYER_EYE_HEIGHT - 0.22, z: player.z + directionZ * 0.45,
    velocityX: directionX * 7.2, velocityY: 2.7 + directionY * 4.2, velocityZ: directionZ * 7.2,
    fuseTicks: BOMB_FUSE_TICKS,
  };
}

export function stepPlayerBombs(
  player: PlayerState, robots: RobotState[], bombs: PlayerBomb[], levelId: Chapter01LevelId = 'level-001',
): BombStepResult {
  const detonations: BombDetonation[] = [];
  const hits: WeaponHit[] = [];
  for (let index = bombs.length - 1; index >= 0; index -= 1) {
    const bomb = bombs[index]!;
    bomb.velocityY -= 9.8 * FIXED_DT_SECONDS;
    const nextX = bomb.x + bomb.velocityX * FIXED_DT_SECONDS;
    const nextZ = bomb.z + bomb.velocityZ * FIXED_DT_SECONDS;
    if (isWallAtWorld(nextX, bomb.z, levelId)) bomb.velocityX *= -0.52;
    else bomb.x = nextX;
    if (isWallAtWorld(bomb.x, nextZ, levelId)) bomb.velocityZ *= -0.52;
    else bomb.z = nextZ;
    bomb.y += bomb.velocityY * FIXED_DT_SECONDS;
    if (bomb.y < 0.16) {
      bomb.y = 0.16;
      bomb.velocityY = Math.abs(bomb.velocityY) * 0.42;
      bomb.velocityX *= 0.86;
      bomb.velocityZ *= 0.86;
    }
    bomb.fuseTicks -= 1;
    if (bomb.fuseTicks > 0) continue;
    for (const robot of robots) {
      if (!robot.active) continue;
      const deltaX = robot.x - bomb.x;
      const deltaZ = robot.z - bomb.z;
      const distance = Math.hypot(deltaX, deltaZ);
      if (distance > BOMB_BLAST_RADIUS || !clearLine(bomb.x, bomb.z, robot.x, robot.z, levelId)) continue;
      const amount = 1 - 0.4 * distance / BOMB_BLAST_RADIUS;
      const inverseDistance = 1 / Math.max(0.25, distance);
      hits.push(damageRobot(
        player, robot, BOMB_DAMAGE * amount,
        deltaX * inverseDistance * 0.42 * amount, 0.3 * amount, deltaZ * inverseDistance * 0.42 * amount,
      ));
    }
    detonations.push({ id: bomb.id, x: bomb.x, y: bomb.y, z: bomb.z });
    bombs.splice(index, 1);
  }
  return { detonations, hits };
}
