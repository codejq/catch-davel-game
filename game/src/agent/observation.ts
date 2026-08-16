import {
  PLAYER_DASH_COOLDOWN_TICKS, PLAYER_DASH_ENERGY_COST, PLAYER_DASH_UNLOCK_LEVEL, PLAYER_EYE_HEIGHT,
} from '../sim/constants';
import type { GameState } from '../sim/game';
import { isWallAtWorld, LEVEL_ORIGIN_X, LEVEL_ORIGIN_Z, levelRows, worldCell } from '../sim/level';
import { CELL_SIZE } from '../sim/constants';
import { ROBOT_DEFINITIONS } from '../sim/robots';
import { WEAPON_IDS, weaponUnlocked, type WeaponId } from '../sim/weapons';
import type { PlayableLevelId } from '../content/level-ids';
import { levelDancePerformance } from '../sim/dance-performance';
import { freezeDanceWindow, levelMechanicKind } from '../sim/level-mechanics';
import { hazardTicksUntilToggle } from '../sim/interactions';
import { campaignRunScore, runAccuracyPermille } from '../sim/run-score';
import type { DifficultyId } from '../sim/difficulty';
import { authoritativeDanceTiming } from '../sim/dance-timing';
import {
  WEAK_POINT_COIN_MULTIPLIER, WEAK_POINT_DAMAGE_MULTIPLIER, weakPointPosition, weakPointRadius,
} from '../sim/weak-point';
import { effectivePulseBurstShots, pulseSpreadRadians } from '../sim/combat';
import { campaignLevel } from '../content/levels/catalog';

export const AGENT_OBSERVATION_SCHEMA_VERSION = 17;

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
  readonly weakPoint: {
    readonly active: boolean;
    readonly relativeX: number;
    readonly relativeY: number;
    readonly relativeZ: number;
    readonly bearing: number;
    readonly elevation: number;
    readonly radius: number;
    readonly damageMultiplier: number;
    readonly coinMultiplier: number;
  };
}

export interface AgentObservation {
  readonly schemaVersion: 17;
  readonly tick: number;
  readonly seed: string;
  readonly levelId: PlayableLevelId;
  readonly difficulty: DifficultyId;
  readonly player: {
    readonly x: number;
    readonly z: number;
    readonly cellColumn: number;
    readonly cellRow: number;
    readonly yaw: number;
    readonly pitch: number;
    readonly health: number;
    readonly energy: number;
    readonly maxHealth: number;
    readonly maxEnergy: number;
    readonly coins: number;
    readonly selectedWeapon: WeaponId;
    readonly unlockedWeapons: readonly WeaponId[];
    readonly bombs: number;
    readonly swordHeat: number;
    readonly laserHeat: number;
    readonly laserOverheated: boolean;
    readonly dash: {
      readonly unlocked: boolean;
      readonly cooldownTicks: number;
      readonly maximumCooldownTicks: number;
      readonly energyCost: number;
    };
    readonly pulseBurstShots: number;
    readonly pulseSpreadRadians: number;
    readonly weaponUpgrades: {
      readonly pulseDamage: number;
      readonly pulseEfficiency: number;
      readonly swordCooling: number;
      readonly bombCapacity: number;
      readonly laserCooling: number;
    };
    readonly playerUpgrades: {
      readonly maxHealth: number;
      readonly maxEnergy: number;
    };
  };
  readonly robots: readonly RobotObservation[];
  readonly remainingRobots: number;
  readonly run: {
    readonly elapsedTicks: number;
    readonly score: number;
    readonly rangedAttacksFired: number;
    readonly rangedAttacksHit: number;
    readonly accuracyPermille: number | null;
    readonly damageTaken: number;
    readonly robotsDefeated: number;
    readonly coinsCollected: number;
    readonly secretsFound: number;
    readonly currentCombo: number;
    readonly highestCombo: number;
  };
  readonly victory: boolean;
  readonly defeat: boolean;
  readonly objective: {
    readonly id: string;
    readonly complete: boolean;
    readonly exitUnlocked: boolean;
  };
  readonly defense: {
    readonly id: 'prize-bank';
    readonly relativeX: number;
    readonly relativeZ: number;
    readonly health: number;
    readonly maxHealth: number;
    readonly attackRadius: number;
    readonly damagePerStrike: number;
    readonly attackIntervalTicks: number;
    readonly nextStrikeInTicks: number | null;
    readonly threatenedByRobotIds: readonly number[];
  } | null;
  readonly dancePerformance: {
    readonly presetId: string;
    readonly bpm: number;
    readonly visualIntensity: number;
    readonly motif: string;
    readonly absoluteStep: number;
    readonly barStep: number;
    readonly phase: 'neutral' | 'attack' | 'vulnerable' | 'frozen';
  };
  readonly encounter: {
    readonly waveIndex: number;
    readonly waveCount: number;
    readonly pendingTicks: number;
  };
  readonly levelMechanic: {
    readonly kind: 'standard' | 'branch-route' | 'key-ambush' | 'freeze-dance';
    readonly phase: 'active' | 'explore' | 'armed' | 'ambush' | 'freeze' | 'hunt';
    readonly robotsFrozen: boolean;
    readonly ticksUntilPhaseChange: number | null;
  };
  readonly pickups: readonly {
    readonly id: string;
    readonly kind: 'key' | 'health' | 'energy' | 'coin';
    readonly relativeX: number;
    readonly relativeZ: number;
    readonly active: boolean;
  }[];
  readonly hazards: readonly {
    readonly id: string;
    readonly kind: 'conveyor' | 'timed-door';
    readonly relativeX: number;
    readonly relativeZ: number;
    readonly halfWidth: number;
    readonly halfDepth: number;
    readonly directionX: number;
    readonly directionZ: number;
    readonly active: boolean;
    readonly periodTicks: number;
    readonly activeTicks: number;
    readonly ticksUntilToggle: number;
  }[];
  readonly door: {
    readonly id: string;
    readonly relativeX: number;
    readonly relativeZ: number;
    readonly open: boolean;
    readonly requiresKey: boolean;
  };
  readonly checkpoint: {
    readonly id: string;
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
  originX: number, originZ: number, targetX: number, targetZ: number, levelId: PlayableLevelId,
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
  const performance = levelDancePerformance(state.levelId);
  const danceTiming = authoritativeDanceTiming(state.levelId, state.tick);
  const mechanicKind = levelMechanicKind(state.levelId);
  const freezeWindow = freezeDanceWindow(state.levelId, state.tick);
  const playerCell = worldCell(state.player.x, state.player.z);
  const pulseBurstShots = effectivePulseBurstShots(state.tick, state.lastShotTick, state.pulseBurstShots);
  const robots = state.robots.filter((robot) => robot.active).map((robot): RobotObservation => {
    const definition = ROBOT_DEFINITIONS[robot.id]!;
    const deltaX = robot.x - state.player.x;
    const deltaZ = robot.z - state.player.z;
    const absoluteBearing = Math.atan2(deltaX, -deltaZ);
    const weakPoint = weakPointPosition(robot, definition);
    const weakDeltaX = weakPoint.x - state.player.x;
    const weakDeltaY = weakPoint.y - PLAYER_EYE_HEIGHT;
    const weakDeltaZ = weakPoint.z - state.player.z;
    const weakHorizontalDistance = Math.hypot(weakDeltaX, weakDeltaZ);
    const weakAbsoluteBearing = Math.atan2(weakDeltaX, -weakDeltaZ);
    return {
      id: robot.id,
      name: definition.name,
      dance: definition.dance,
      archetype: definition.archetype,
      rank: definition.rank,
      relativeX: round(deltaX),
      relativeZ: round(deltaZ),
      distance: round(Math.hypot(deltaX, deltaZ)),
      bearing: round(normalizeAngle(absoluteBearing - state.player.yaw)),
      elevation: round(Math.atan2(definition.scale * 1.16 - PLAYER_EYE_HEIGHT, Math.hypot(deltaX, deltaZ)) - state.player.pitch),
      heading: round(robot.heading),
      health: robot.health,
      visible: hasLineOfSight(state.player.x, state.player.z, robot.x, robot.z, state.levelId),
      combatState: robot.combatState,
      combatTicks: robot.combatTicks,
      tempoBuffed: robot.tempoBuffTicks > 0,
      bossPhase: robot.bossPhase,
      weakPoint: {
        active: danceTiming.phase === 'vulnerable',
        relativeX: round(weakDeltaX), relativeY: round(weakDeltaY), relativeZ: round(weakDeltaZ),
        bearing: round(normalizeAngle(weakAbsoluteBearing - state.player.yaw)),
        elevation: round(Math.atan2(weakDeltaY, weakHorizontalDistance) - state.player.pitch),
        radius: round(weakPointRadius(definition)),
        damageMultiplier: WEAK_POINT_DAMAGE_MULTIPLIER,
        coinMultiplier: WEAK_POINT_COIN_MULTIPLIER,
      },
    };
  });
  const primaryObjective = campaignLevel(state.levelId).objectives.find((objective) => objective.required)!;
  const defense = state.level.defense === null ? null : (() => {
    const target = state.level.defense!;
    const threatenedByRobotIds = state.robots
      .filter((robot) => robot.active && Math.hypot(robot.x - target.x, robot.z - target.z) <= target.attackRadius)
      .map((robot) => robot.id);
    const nextStrikeInTicks = !state.level.keyCollected || threatenedByRobotIds.length === 0 ? null : Math.min(
      ...threatenedByRobotIds.map((robotId) => (
        target.attackIntervalTicks - (state.tick + robotId * 11) % target.attackIntervalTicks
      ) % target.attackIntervalTicks),
    );
    return {
      id: target.id,
      relativeX: round(target.x - state.player.x), relativeZ: round(target.z - state.player.z),
      health: target.health, maxHealth: target.maxHealth,
      attackRadius: target.attackRadius, damagePerStrike: target.damagePerStrike,
      attackIntervalTicks: target.attackIntervalTicks, nextStrikeInTicks, threatenedByRobotIds,
    };
  })();
  return {
    schemaVersion: AGENT_OBSERVATION_SCHEMA_VERSION,
    tick: state.tick,
    seed: state.seed,
    levelId: state.levelId,
    difficulty: state.difficulty,
    player: {
      x: round(state.player.x), z: round(state.player.z),
      cellColumn: playerCell.column, cellRow: playerCell.row,
      yaw: round(state.player.yaw), pitch: round(state.player.pitch),
      health: round(state.player.health), energy: round(state.player.energy),
      maxHealth: state.player.maxHealth, maxEnergy: state.player.maxEnergy, coins: state.player.coins,
      selectedWeapon: state.player.selectedWeapon,
      unlockedWeapons: WEAPON_IDS.filter((weapon) => weaponUnlocked(state.player.unlockedWeaponMask, weapon)),
      bombs: state.player.bombs,
      swordHeat: round(state.player.swordHeat), laserHeat: round(state.player.laserHeat),
      laserOverheated: state.player.laserOverheated,
      dash: {
        unlocked: Number(state.levelId.slice(-3)) >= PLAYER_DASH_UNLOCK_LEVEL,
        cooldownTicks: state.player.dashCooldownTicks,
        maximumCooldownTicks: PLAYER_DASH_COOLDOWN_TICKS,
        energyCost: PLAYER_DASH_ENERGY_COST,
      },
      pulseBurstShots,
      pulseSpreadRadians: round(pulseSpreadRadians(pulseBurstShots)),
      weaponUpgrades: { ...state.player.weaponUpgrades },
      playerUpgrades: { ...state.player.playerUpgrades },
    },
    robots,
    remainingRobots: robots.length,
    run: {
      elapsedTicks: state.tick,
      score: campaignRunScore(state.levelId, state.tick, state.victory, state.player.coins, state.metrics),
      rangedAttacksFired: state.metrics.rangedAttacksFired,
      rangedAttacksHit: state.metrics.rangedAttacksHit,
      accuracyPermille: runAccuracyPermille(state.metrics),
      damageTaken: state.metrics.damageTaken,
      robotsDefeated: state.metrics.defeatedRobotIds.length,
      coinsCollected: state.player.coins - state.metrics.startingCoins,
      secretsFound: state.metrics.secretsFound,
      currentCombo: state.metrics.currentCombo,
      highestCombo: state.metrics.highestCombo,
    },
    victory: state.victory,
    defeat: state.defeat,
    objective: { id: primaryObjective.id, complete: state.level.objectiveComplete, exitUnlocked: state.level.objectiveComplete },
    defense,
    dancePerformance: { ...performance, ...danceTiming },
    encounter: { ...state.level.encounter },
    levelMechanic: {
      kind: mechanicKind,
      phase: mechanicKind === 'key-ambush' ? (state.level.keyCollected ? 'ambush' : 'armed')
        : mechanicKind === 'freeze-dance' ? (freezeWindow.frozen ? 'freeze' : 'hunt')
          : mechanicKind === 'branch-route' ? 'explore' : 'active',
      robotsFrozen: freezeWindow.frozen,
      ticksUntilPhaseChange: mechanicKind === 'freeze-dance' ? freezeWindow.ticksUntilToggle : null,
    },
    pickups: state.level.pickups.map((pickup) => ({
      id: pickup.id,
      kind: pickup.kind,
      relativeX: round(pickup.x - state.player.x),
      relativeZ: round(pickup.z - state.player.z),
      active: pickup.active,
    })),
    hazards: state.level.hazards.map((hazard) => ({
      id: hazard.id,
      kind: hazard.kind,
      relativeX: round(hazard.x - state.player.x),
      relativeZ: round(hazard.z - state.player.z),
      halfWidth: hazard.halfWidth,
      halfDepth: hazard.halfDepth,
      directionX: hazard.directionX,
      directionZ: hazard.directionZ,
      active: hazard.active,
      periodTicks: hazard.periodTicks,
      activeTicks: hazard.activeTicks,
      ticksUntilToggle: hazardTicksUntilToggle(hazard, state.tick),
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

export function levelObservation(levelId: PlayableLevelId = 'level-001'): {
  readonly levelId: PlayableLevelId;
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
