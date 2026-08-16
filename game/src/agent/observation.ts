import { PLAYER_EYE_HEIGHT } from '../sim/constants';
import type { GameState } from '../sim/game';
import { isWallAtWorld, LEVEL_ORIGIN_X, LEVEL_ORIGIN_Z, levelRows, worldCell } from '../sim/level';
import { CELL_SIZE } from '../sim/constants';
import { ROBOT_DEFINITIONS } from '../sim/robots';
import { WEAPON_IDS, weaponUnlocked, type WeaponId } from '../sim/weapons';
import type { Chapter01LevelId } from '../content/levels/chapter-01';

export interface RobotObservation {
  readonly id: number;
  readonly name: string;
  readonly dance: string;
  readonly archetype: string;
  readonly rank: 'ordinary' | 'elite' | 'boss';
  readonly relativeX: number;
  readonly relativeZ: number;
  readonly distance: number;
  readonly bearing: number;
  readonly elevation: number;
  readonly heading: number;
  readonly health: number;
  readonly visible: boolean;
  readonly combatState: 'patrol' | 'telegraph' | 'recover';
  readonly combatTicks: number;
  readonly tempoBuffed: boolean;
  readonly bossPhase: 0 | 1 | 2 | 3;
}

export interface AgentObservation {
  readonly schemaVersion: 5;
  readonly tick: number;
  readonly seed: string;
  readonly levelId: Chapter01LevelId;
  readonly player: {
    readonly x: number;
    readonly z: number;
    readonly cellColumn: number;
    readonly cellRow: number;
    readonly yaw: number;
    readonly pitch: number;
    readonly health: number;
    readonly energy: number;
    readonly coins: number;
    readonly selectedWeapon: WeaponId;
    readonly unlockedWeapons: readonly WeaponId[];
    readonly bombs: number;
    readonly swordHeat: number;
    readonly laserHeat: number;
    readonly laserOverheated: boolean;
    readonly weaponUpgrades: {
      readonly pulseDamage: number;
      readonly pulseEfficiency: number;
      readonly swordCooling: number;
      readonly bombCapacity: number;
      readonly laserCooling: number;
    };
  };
  readonly robots: readonly RobotObservation[];
  readonly remainingRobots: number;
  readonly victory: boolean;
  readonly defeat: boolean;
  readonly objective: {
    readonly id: 'deactivate-davels';
    readonly complete: boolean;
    readonly exitUnlocked: boolean;
  };
  readonly pickups: readonly {
    readonly id: string;
    readonly kind: 'key' | 'health' | 'energy';
    readonly relativeX: number;
    readonly relativeZ: number;
    readonly active: boolean;
  }[];
  readonly door: {
    readonly id: 'workshop-lock';
    readonly relativeX: number;
    readonly relativeZ: number;
    readonly open: boolean;
    readonly requiresKey: boolean;
  };
  readonly checkpoint: {
    readonly id: 'checkpoint-before-exit';
    readonly relativeX: number;
    readonly relativeZ: number;
    readonly activated: boolean;
  };
  readonly exit: {
    readonly relativeX: number;
    readonly relativeZ: number;
    readonly unlocked: boolean;
  };
  readonly hostileProjectiles: readonly {
    readonly id: number;
    readonly ownerRobotId: number;
    readonly kind: 'slider-bolt' | 'beat-bolt' | 'fireball';
    readonly relativeX: number;
    readonly relativeY: number;
    readonly relativeZ: number;
    readonly velocityX: number;
    readonly velocityY: number;
    readonly velocityZ: number;
  }[];
  readonly playerBombs: readonly {
    readonly id: number;
    readonly relativeX: number;
    readonly relativeY: number;
    readonly relativeZ: number;
    readonly velocityX: number;
    readonly velocityY: number;
    readonly velocityZ: number;
    readonly fuseTicks: number;
  }[];
  readonly laser: {
    readonly active: boolean;
    readonly beamDistance: number;
    readonly focusTicks: number;
    readonly targetRobotId: number | null;
  };
}

function round(value: number): number { return Math.round(value * 1_000) / 1_000; }

function normalizeAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function hasLineOfSight(
  originX: number, originZ: number, targetX: number, targetZ: number, levelId: Chapter01LevelId,
): boolean {
  const deltaX = targetX - originX;
  const deltaZ = targetZ - originZ;
  const distance = Math.hypot(deltaX, deltaZ);
  const steps = Math.max(1, Math.ceil(distance / 0.16));
  for (let step = 1; step < steps; step += 1) {
    const amount = step / steps;
    if (isWallAtWorld(originX + deltaX * amount, originZ + deltaZ * amount, levelId)) return false;
  }
  return true;
}

export function createObservation(state: GameState): AgentObservation {
  const playerCell = worldCell(state.player.x, state.player.z);
  const robots = state.robots.filter((robot) => robot.active).map((robot): RobotObservation => {
    const deltaX = robot.x - state.player.x;
    const deltaZ = robot.z - state.player.z;
    const absoluteBearing = Math.atan2(deltaX, -deltaZ);
    return {
      id: robot.id,
      name: ROBOT_DEFINITIONS[robot.id]!.name,
      dance: ROBOT_DEFINITIONS[robot.id]!.dance,
      archetype: ROBOT_DEFINITIONS[robot.id]!.archetype,
      rank: ROBOT_DEFINITIONS[robot.id]!.rank,
      relativeX: round(deltaX),
      relativeZ: round(deltaZ),
      distance: round(Math.hypot(deltaX, deltaZ)),
      bearing: round(normalizeAngle(absoluteBearing - state.player.yaw)),
      elevation: round(Math.atan2(ROBOT_DEFINITIONS[robot.id]!.scale * 1.16 - PLAYER_EYE_HEIGHT, Math.hypot(deltaX, deltaZ)) - state.player.pitch),
      heading: round(robot.heading),
      health: robot.health,
      visible: hasLineOfSight(state.player.x, state.player.z, robot.x, robot.z, state.levelId),
      combatState: robot.combatState,
      combatTicks: robot.combatTicks,
      tempoBuffed: robot.tempoBuffTicks > 0,
      bossPhase: robot.bossPhase,
    };
  });
  return {
    schemaVersion: 5,
    tick: state.tick,
    seed: state.seed,
    levelId: state.levelId,
    player: {
      x: round(state.player.x), z: round(state.player.z),
      cellColumn: playerCell.column, cellRow: playerCell.row,
      yaw: round(state.player.yaw), pitch: round(state.player.pitch),
      health: round(state.player.health), energy: round(state.player.energy), coins: state.player.coins,
      selectedWeapon: state.player.selectedWeapon,
      unlockedWeapons: WEAPON_IDS.filter((weapon) => weaponUnlocked(state.player.unlockedWeaponMask, weapon)),
      bombs: state.player.bombs,
      swordHeat: round(state.player.swordHeat), laserHeat: round(state.player.laserHeat),
      laserOverheated: state.player.laserOverheated,
      weaponUpgrades: { ...state.player.weaponUpgrades },
    },
    robots,
    remainingRobots: robots.length,
    victory: state.victory,
    defeat: state.defeat,
    objective: { id: 'deactivate-davels', complete: state.level.objectiveComplete, exitUnlocked: state.level.objectiveComplete },
    pickups: state.level.pickups.map((pickup) => ({
      id: pickup.id,
      kind: pickup.kind,
      relativeX: round(pickup.x - state.player.x),
      relativeZ: round(pickup.z - state.player.z),
      active: pickup.active,
    })),
    door: {
      id: state.level.door.id,
      relativeX: round(state.level.door.x - state.player.x),
      relativeZ: round(state.level.door.z - state.player.z),
      open: state.level.door.open,
      requiresKey: !state.level.keyCollected,
    },
    checkpoint: {
      id: state.level.checkpoint.id,
      relativeX: round(state.level.checkpoint.x - state.player.x),
      relativeZ: round(state.level.checkpoint.z - state.player.z),
      activated: state.level.checkpoint.activated,
    },
    exit: {
      relativeX: round(state.level.exit.x - state.player.x),
      relativeZ: round(state.level.exit.z - state.player.z),
      unlocked: state.level.objectiveComplete,
    },
    hostileProjectiles: state.projectiles.map((projectile) => ({
      id: projectile.id,
      ownerRobotId: projectile.ownerRobotId,
      kind: projectile.kind,
      relativeX: round(projectile.x - state.player.x),
      relativeY: round(projectile.y - PLAYER_EYE_HEIGHT),
      relativeZ: round(projectile.z - state.player.z),
      velocityX: round(projectile.velocityX),
      velocityY: round(projectile.velocityY),
      velocityZ: round(projectile.velocityZ),
    })),
    playerBombs: state.playerBombs.map((bomb) => ({
      id: bomb.id,
      relativeX: round(bomb.x - state.player.x), relativeY: round(bomb.y - PLAYER_EYE_HEIGHT),
      relativeZ: round(bomb.z - state.player.z), velocityX: round(bomb.velocityX),
      velocityY: round(bomb.velocityY), velocityZ: round(bomb.velocityZ), fuseTicks: bomb.fuseTicks,
    })),
    laser: {
      active: state.laserActive, beamDistance: round(state.laserBeamDistance), focusTicks: state.laserFocusTicks,
      targetRobotId: state.laserTargetRobotId,
    },
  };
}

export function levelObservation(levelId: Chapter01LevelId = 'level-001'): {
  readonly levelId: Chapter01LevelId;
  readonly rows: readonly string[];
  readonly cellSize: number;
  readonly originX: number;
  readonly originZ: number;
  readonly coordinateSystem: string;
} {
  return {
    levelId, rows: levelRows(levelId), cellSize: CELL_SIZE, originX: LEVEL_ORIGIN_X, originZ: LEVEL_ORIGIN_Z,
    coordinateSystem: `right-handed world; +x east, +z south, yaw 0 faces -z; player eye y=${PLAYER_EYE_HEIGHT}`,
  };
}
