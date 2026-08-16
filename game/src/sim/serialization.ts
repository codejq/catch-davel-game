import { GAME_SCHEMA_VERSION } from './constants';
import type { EnemyProjectile, EnemyProjectileKind } from './enemy-combat';
import type { GameState } from './game';
import type { PlayerState } from './player';
import { ROBOT_DEFINITIONS, campaignRobotIds, campaignRobotWaves, type EncounterId, type RobotState } from './robots';
import { BODY_POINT_COUNT } from './xpbd';
import { createLevelRuntime, type LevelRuntimeState, type PickupKind } from './interactions';
import {
  isWeaponId, normalizeWeaponUpgradeLevels, WEAPON_UPGRADE_IDS, type PlayerBomb, type WeaponUpgradeLevels,
} from './weapons';
import { isChapter01LevelId, type Chapter01LevelId } from '../content/level-ids';

export const SNAPSHOT_FORMAT_VERSION = 1;

export interface RobotSnapshotV1 {
  readonly id: number;
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly targetIndex: number;
  readonly routeDirection: 1 | -1;
  readonly holdTicks: number;
  readonly arrivalCount: number;
  readonly danceTime: number;
  readonly health: number;
  readonly spawned: boolean;
  readonly active: boolean;
  readonly hitFlashTicks: number;
  readonly knockbackX: number;
  readonly knockbackZ: number;
  readonly attackCooldownTicks: number;
  readonly combatState: 'patrol' | 'telegraph' | 'recover';
  readonly combatTicks: number;
  readonly strafeDirection: 1 | -1;
  readonly tempoBuffTicks: number;
  readonly bossPhase: 0 | 1 | 2 | 3;
  readonly body: {
    readonly positions: readonly number[];
    readonly previous: readonly number[];
    readonly restLengths: readonly number[];
  };
}

export interface SimulationSnapshotV1 {
  readonly snapshotFormatVersion: 1;
  readonly simulationSchemaVersion: number;
  readonly tick: number;
  readonly seed: string;
  readonly levelId: Chapter01LevelId;
  readonly encounter: EncounterId;
  readonly player: PlayerState;
  readonly robots: readonly RobotSnapshotV1[];
  readonly lastShotTick: number;
  readonly shotSerial: number;
  readonly victory: boolean;
  readonly defeat: boolean;
  readonly projectiles: readonly EnemyProjectile[];
  readonly nextProjectileId: number;
  readonly playerBombs: readonly PlayerBomb[];
  readonly nextPlayerBombId: number;
  readonly lastSwordTick: number;
  readonly lastBombTick: number;
  readonly laserFocusTicks: number;
  readonly laserTargetRobotId: number | null;
  readonly laserActive: boolean;
  readonly laserBeamDistance: number;
  readonly level: LevelRuntimeState;
}

function copyPlayer(player: PlayerState): PlayerState {
  return { ...player, weaponUpgrades: { ...player.weaponUpgrades } };
}

function snapshotRobot(robot: RobotState): RobotSnapshotV1 {
  return {
    id: robot.id,
    x: robot.x,
    z: robot.z,
    heading: robot.heading,
    targetIndex: robot.targetIndex,
    routeDirection: robot.routeDirection,
    holdTicks: robot.holdTicks,
    arrivalCount: robot.arrivalCount,
    danceTime: robot.danceTime,
    health: robot.health,
    spawned: robot.spawned,
    active: robot.active,
    hitFlashTicks: robot.hitFlashTicks,
    knockbackX: robot.knockbackX,
    knockbackZ: robot.knockbackZ,
    attackCooldownTicks: robot.attackCooldownTicks,
    combatState: robot.combatState,
    combatTicks: robot.combatTicks,
    strafeDirection: robot.strafeDirection,
    tempoBuffTicks: robot.tempoBuffTicks,
    bossPhase: robot.bossPhase,
    body: {
      positions: [...robot.body.positions],
      previous: [...robot.body.previous],
      restLengths: [...robot.body.restLengths],
    },
  };
}

export function createSimulationSnapshot(state: GameState): SimulationSnapshotV1 {
  return {
    snapshotFormatVersion: SNAPSHOT_FORMAT_VERSION,
    simulationSchemaVersion: GAME_SCHEMA_VERSION,
    tick: state.tick,
    seed: state.seed,
    levelId: state.levelId,
    encounter: state.encounter,
    player: copyPlayer(state.player),
    robots: state.robots.map(snapshotRobot),
    lastShotTick: state.lastShotTick,
    shotSerial: state.shotSerial,
    victory: state.victory,
    defeat: state.defeat,
    projectiles: state.projectiles.map((projectile) => ({ ...projectile })),
    nextProjectileId: state.nextProjectileId,
    playerBombs: state.playerBombs.map((bomb) => ({ ...bomb })),
    nextPlayerBombId: state.nextPlayerBombId,
    lastSwordTick: state.lastSwordTick,
    lastBombTick: state.lastBombTick,
    laserFocusTicks: state.laserFocusTicks,
    laserTargetRobotId: state.laserTargetRobotId,
    laserActive: state.laserActive,
    laserBeamDistance: state.laserBeamDistance,
    level: {
      pickups: state.level.pickups.map((pickup) => ({ ...pickup })),
      hazards: state.level.hazards.map((hazard) => ({ ...hazard })),
      door: { ...state.level.door },
      checkpoint: { ...state.level.checkpoint },
      exit: { ...state.level.exit },
      encounter: { ...state.level.encounter },
      keyCollected: state.level.keyCollected,
      objectiveComplete: state.level.objectiveComplete,
    },
  };
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
}

function assertExactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} has unknown or missing fields`);
  }
}

function finite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}

function integer(value: unknown, label: string, minimum = 0): number {
  const result = finite(value, label);
  if (!Number.isInteger(result) || result < minimum) throw new Error(`${label} must be an integer >= ${minimum}`);
  return result;
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be boolean`);
  return value;
}

function numberArray(value: unknown, length: number, label: string): number[] {
  if (!Array.isArray(value) || value.length !== length) throw new Error(`${label} must contain ${length} numbers`);
  return value.map((entry, index) => finite(entry, `${label}[${index}]`));
}

function validatePlayer(value: unknown): PlayerState {
  assertRecord(value, 'snapshot.player');
  assertExactKeys(value, [
    'x', 'z', 'yaw', 'pitch', 'health', 'energy', 'coins', 'bobPhase', 'selectedWeapon', 'unlockedWeaponMask',
    'bombs', 'swordHeat', 'laserHeat', 'laserOverheated', 'weaponUpgrades',
  ], 'snapshot.player');
  if (!isWeaponId(value.selectedWeapon)) throw new Error('player.selectedWeapon is invalid');
  const unlockedWeaponMask = integer(value.unlockedWeaponMask, 'player.unlockedWeaponMask', 1);
  if (unlockedWeaponMask > 15 || (unlockedWeaponMask & 1) === 0) throw new Error('player.unlockedWeaponMask is invalid');
  const weaponBit = 1 << ['pulse', 'sword', 'bomb', 'laser'].indexOf(value.selectedWeapon);
  if ((unlockedWeaponMask & weaponBit) === 0) throw new Error('player.selectedWeapon must be unlocked');
  assertRecord(value.weaponUpgrades, 'player.weaponUpgrades');
  assertExactKeys(value.weaponUpgrades, WEAPON_UPGRADE_IDS, 'player.weaponUpgrades');
  const rawUpgrades: Record<string, number> = {};
  for (const id of WEAPON_UPGRADE_IDS) rawUpgrades[id] = integer(value.weaponUpgrades[id], `player.weaponUpgrades.${id}`);
  const weaponUpgrades: WeaponUpgradeLevels = normalizeWeaponUpgradeLevels(rawUpgrades);
  return {
    x: finite(value.x, 'player.x'), z: finite(value.z, 'player.z'),
    yaw: finite(value.yaw, 'player.yaw'), pitch: finite(value.pitch, 'player.pitch'),
    health: finite(value.health, 'player.health'), energy: finite(value.energy, 'player.energy'),
    coins: integer(value.coins, 'player.coins'), bobPhase: finite(value.bobPhase, 'player.bobPhase'),
    selectedWeapon: value.selectedWeapon, unlockedWeaponMask,
    bombs: integer(value.bombs, 'player.bombs'), swordHeat: finite(value.swordHeat, 'player.swordHeat'),
    laserHeat: finite(value.laserHeat, 'player.laserHeat'),
    laserOverheated: booleanValue(value.laserOverheated, 'player.laserOverheated'),
    weaponUpgrades,
  };
}

function validatePlayerBomb(value: unknown, index: number): PlayerBomb {
  assertRecord(value, `playerBombs[${index}]`);
  assertExactKeys(value, ['id', 'x', 'y', 'z', 'velocityX', 'velocityY', 'velocityZ', 'fuseTicks'], `playerBombs[${index}]`);
  return {
    id: integer(value.id, `playerBombs[${index}].id`, 1),
    x: finite(value.x, `playerBombs[${index}].x`), y: finite(value.y, `playerBombs[${index}].y`),
    z: finite(value.z, `playerBombs[${index}].z`),
    velocityX: finite(value.velocityX, `playerBombs[${index}].velocityX`),
    velocityY: finite(value.velocityY, `playerBombs[${index}].velocityY`),
    velocityZ: finite(value.velocityZ, `playerBombs[${index}].velocityZ`),
    fuseTicks: integer(value.fuseTicks, `playerBombs[${index}].fuseTicks`, 1),
  };
}

function validateRobot(value: unknown, index: number): RobotState {
  assertRecord(value, `robots[${index}]`);
  assertExactKeys(value, [
    'id', 'x', 'z', 'heading', 'targetIndex', 'routeDirection', 'holdTicks', 'arrivalCount', 'danceTime', 'health',
    'spawned', 'active', 'hitFlashTicks', 'knockbackX', 'knockbackZ', 'attackCooldownTicks', 'combatState', 'combatTicks',
    'strafeDirection', 'tempoBuffTicks', 'bossPhase', 'body',
  ], `robots[${index}]`);
  const id = integer(value.id, `robots[${index}].id`);
  if (id >= ROBOT_DEFINITIONS.length) throw new Error(`robots[${index}].id is invalid`);
  const routeDirection = finite(value.routeDirection, `robots[${id}].routeDirection`);
  if (routeDirection !== 1 && routeDirection !== -1) throw new Error(`robots[${id}].routeDirection must be -1 or 1`);
  const strafeDirection = finite(value.strafeDirection, `robots[${id}].strafeDirection`);
  if (strafeDirection !== 1 && strafeDirection !== -1) throw new Error(`robots[${id}].strafeDirection must be -1 or 1`);
  if (value.combatState !== 'patrol' && value.combatState !== 'telegraph' && value.combatState !== 'recover') {
    throw new Error(`robots[${id}].combatState is invalid`);
  }
  const targetIndex = integer(value.targetIndex, `robots[${id}].targetIndex`);
  if (targetIndex >= ROBOT_DEFINITIONS[id]!.route.length) throw new Error(`robots[${id}].targetIndex is outside its route`);
  const bossPhaseValue = integer(value.bossPhase, `robots[${id}].bossPhase`);
  if (bossPhaseValue > 3) throw new Error(`robots[${id}].bossPhase is invalid`);
  const bossPhase = bossPhaseValue as 0 | 1 | 2 | 3;
  if ((ROBOT_DEFINITIONS[id]!.rank === 'boss') !== (bossPhase > 0)) throw new Error(`robots[${id}].bossPhase conflicts with rank`);
  assertRecord(value.body, `robots[${id}].body`);
  assertExactKeys(value.body, ['positions', 'previous', 'restLengths'], `robots[${id}].body`);
  const spawned = booleanValue(value.spawned, `robots[${id}].spawned`);
  const active = booleanValue(value.active, `robots[${id}].active`);
  if (active && !spawned) throw new Error(`robots[${id}] cannot be active before it is spawned`);
  return {
    id,
    x: finite(value.x, `robots[${id}].x`), z: finite(value.z, `robots[${id}].z`),
    heading: finite(value.heading, `robots[${id}].heading`), targetIndex,
    routeDirection,
    holdTicks: integer(value.holdTicks, `robots[${id}].holdTicks`),
    arrivalCount: integer(value.arrivalCount, `robots[${id}].arrivalCount`),
    danceTime: finite(value.danceTime, `robots[${id}].danceTime`),
    health: finite(value.health, `robots[${id}].health`),
    spawned,
    active,
    hitFlashTicks: integer(value.hitFlashTicks, `robots[${id}].hitFlashTicks`),
    knockbackX: finite(value.knockbackX, `robots[${id}].knockbackX`),
    knockbackZ: finite(value.knockbackZ, `robots[${id}].knockbackZ`),
    attackCooldownTicks: integer(value.attackCooldownTicks, `robots[${id}].attackCooldownTicks`, -10_000),
    combatState: value.combatState,
    combatTicks: integer(value.combatTicks, `robots[${id}].combatTicks`, -10_000),
    strafeDirection,
    tempoBuffTicks: integer(value.tempoBuffTicks, `robots[${id}].tempoBuffTicks`),
    bossPhase,
    body: {
      positions: new Float64Array(numberArray(value.body.positions, BODY_POINT_COUNT * 3, `robots[${id}].body.positions`)),
      previous: new Float64Array(numberArray(value.body.previous, BODY_POINT_COUNT * 3, `robots[${id}].body.previous`)),
      restLengths: new Float64Array(numberArray(value.body.restLengths, 10, `robots[${id}].body.restLengths`)),
    },
  };
}

function validateProjectile(value: unknown, index: number): EnemyProjectile {
  assertRecord(value, `projectiles[${index}]`);
  assertExactKeys(value, ['id', 'ownerRobotId', 'kind', 'x', 'y', 'z', 'velocityX', 'velocityY', 'velocityZ', 'lifeTicks'], `projectiles[${index}]`);
  const ownerRobotId = integer(value.ownerRobotId, `projectiles[${index}].ownerRobotId`);
  if (ownerRobotId >= ROBOT_DEFINITIONS.length) throw new Error(`projectiles[${index}].ownerRobotId is invalid`);
  if (value.kind !== 'slider-bolt' && value.kind !== 'beat-bolt' && value.kind !== 'fireball') {
    throw new Error(`projectiles[${index}].kind is invalid`);
  }
  return {
    id: integer(value.id, `projectiles[${index}].id`, 1), ownerRobotId, kind: value.kind as EnemyProjectileKind,
    x: finite(value.x, `projectiles[${index}].x`), y: finite(value.y, `projectiles[${index}].y`), z: finite(value.z, `projectiles[${index}].z`),
    velocityX: finite(value.velocityX, `projectiles[${index}].velocityX`),
    velocityY: finite(value.velocityY, `projectiles[${index}].velocityY`),
    velocityZ: finite(value.velocityZ, `projectiles[${index}].velocityZ`),
    lifeTicks: integer(value.lifeTicks, `projectiles[${index}].lifeTicks`, 1),
  };
}

function validateLevel(value: unknown, levelId: Chapter01LevelId, encounter: EncounterId): LevelRuntimeState {
  assertRecord(value, 'snapshot.level');
  assertExactKeys(value, ['pickups', 'hazards', 'door', 'checkpoint', 'exit', 'encounter', 'keyCollected', 'objectiveComplete'], 'snapshot.level');
  const expected = createLevelRuntime(levelId, encounter);
  if (!Array.isArray(value.pickups) || value.pickups.length !== expected.pickups.length) {
    throw new Error(`snapshot.level.pickups must contain ${expected.pickups.length} records`);
  }
  const pickups = value.pickups.map((pickupValue, index) => {
    assertRecord(pickupValue, `snapshot.level.pickups[${index}]`);
    assertExactKeys(pickupValue, ['id', 'kind', 'x', 'z', 'amount', 'active'], `snapshot.level.pickups[${index}]`);
    const expectedPickup = expected.pickups[index]!;
    if (pickupValue.id !== expectedPickup.id || pickupValue.kind !== expectedPickup.kind) {
      throw new Error(`snapshot.level.pickups[${index}] has an invalid stable identity`);
    }
    const kind = pickupValue.kind as PickupKind;
    const x = finite(pickupValue.x, `snapshot.level.pickups[${index}].x`);
    const z = finite(pickupValue.z, `snapshot.level.pickups[${index}].z`);
    const amount = integer(pickupValue.amount, `snapshot.level.pickups[${index}].amount`);
    if (x !== expectedPickup.x || z !== expectedPickup.z || amount !== expectedPickup.amount) {
      throw new Error(`snapshot.level.pickups[${index}] changed immutable level data`);
    }
    return { id: expectedPickup.id, kind, x, z, amount, active: booleanValue(pickupValue.active, `snapshot.level.pickups[${index}].active`) };
  });
  if (!Array.isArray(value.hazards) || value.hazards.length !== expected.hazards.length) {
    throw new Error(`snapshot.level.hazards must contain ${expected.hazards.length} records`);
  }
  const hazards = value.hazards.map((hazardValue, index) => {
    assertRecord(hazardValue, `snapshot.level.hazards[${index}]`);
    assertExactKeys(hazardValue, [
      'id', 'kind', 'x', 'z', 'halfWidth', 'halfDepth', 'directionX', 'directionZ',
      'periodTicks', 'activeTicks', 'phaseOffsetTicks', 'active',
    ], `snapshot.level.hazards[${index}]`);
    const expectedHazard = expected.hazards[index]!;
    if (hazardValue.id !== expectedHazard.id || hazardValue.kind !== expectedHazard.kind) {
      throw new Error(`snapshot.level.hazards[${index}] has an invalid stable identity`);
    }
    for (const field of [
      'x', 'z', 'halfWidth', 'halfDepth', 'directionX', 'directionZ',
      'periodTicks', 'activeTicks', 'phaseOffsetTicks',
    ] as const) {
      if (finite(hazardValue[field], `snapshot.level.hazards[${index}].${field}`) !== expectedHazard[field]) {
        throw new Error(`snapshot.level.hazards[${index}].${field} changed immutable level data`);
      }
    }
    return { ...expectedHazard, active: booleanValue(hazardValue.active, `snapshot.level.hazards[${index}].active`) };
  });
  assertRecord(value.door, 'snapshot.level.door');
  assertExactKeys(value.door, ['id', 'keyId', 'column', 'row', 'x', 'z', 'open'], 'snapshot.level.door');
  assertRecord(value.checkpoint, 'snapshot.level.checkpoint');
  assertExactKeys(value.checkpoint, ['id', 'x', 'z', 'activated'], 'snapshot.level.checkpoint');
  assertRecord(value.exit, 'snapshot.level.exit');
  assertExactKeys(value.exit, ['x', 'z'], 'snapshot.level.exit');
  assertRecord(value.encounter, 'snapshot.level.encounter');
  assertExactKeys(value.encounter, ['waveIndex', 'waveCount', 'pendingTicks'], 'snapshot.level.encounter');
  const doorStaticMatches = value.door.id === expected.door.id && value.door.keyId === expected.door.keyId
    && value.door.column === expected.door.column && value.door.row === expected.door.row
    && value.door.x === expected.door.x && value.door.z === expected.door.z;
  if (!doorStaticMatches) throw new Error('snapshot.level.door changed immutable level data');
  const checkpointStaticMatches = value.checkpoint.id === expected.checkpoint.id
    && value.checkpoint.x === expected.checkpoint.x && value.checkpoint.z === expected.checkpoint.z;
  if (!checkpointStaticMatches) throw new Error('snapshot.level.checkpoint changed immutable level data');
  if (value.exit.x !== expected.exit.x || value.exit.z !== expected.exit.z) throw new Error('snapshot.level.exit changed immutable level data');
  const waveIndex = integer(value.encounter.waveIndex, 'snapshot.level.encounter.waveIndex');
  const waveCount = integer(value.encounter.waveCount, 'snapshot.level.encounter.waveCount', 1);
  const pendingTicks = integer(value.encounter.pendingTicks, 'snapshot.level.encounter.pendingTicks');
  if (waveCount !== expected.encounter.waveCount) throw new Error('snapshot.level.encounter.waveCount changed immutable level data');
  if (waveIndex >= waveCount) throw new Error('snapshot.level.encounter.waveIndex is outside the encounter');
  if (pendingTicks > 45) throw new Error('snapshot.level.encounter.pendingTicks exceeds the inter-wave delay');
  if (pendingTicks > 0 && waveIndex + 1 >= waveCount) throw new Error('snapshot.level.encounter cannot queue beyond its final wave');
  return {
    pickups,
    hazards,
    door: { ...expected.door, open: booleanValue(value.door.open, 'snapshot.level.door.open') },
    checkpoint: { ...expected.checkpoint, activated: booleanValue(value.checkpoint.activated, 'snapshot.level.checkpoint.activated') },
    exit: { ...expected.exit },
    encounter: { waveIndex, waveCount, pendingTicks },
    keyCollected: booleanValue(value.keyCollected, 'snapshot.level.keyCollected'),
    objectiveComplete: booleanValue(value.objectiveComplete, 'snapshot.level.objectiveComplete'),
  };
}

export function restoreSimulationState(snapshotValue: unknown): GameState {
  assertRecord(snapshotValue, 'snapshot');
  assertExactKeys(snapshotValue, [
    'snapshotFormatVersion', 'simulationSchemaVersion', 'tick', 'seed', 'levelId', 'encounter', 'player', 'robots', 'lastShotTick', 'shotSerial',
    'victory', 'defeat', 'projectiles', 'nextProjectileId', 'playerBombs', 'nextPlayerBombId', 'lastSwordTick',
    'lastBombTick', 'laserFocusTicks', 'laserTargetRobotId', 'laserActive', 'laserBeamDistance', 'level',
  ], 'snapshot');
  if (snapshotValue.snapshotFormatVersion !== SNAPSHOT_FORMAT_VERSION) throw new Error('Unsupported snapshot format version');
  if (snapshotValue.simulationSchemaVersion !== GAME_SCHEMA_VERSION) throw new Error('Unsupported simulation schema version');
  if (typeof snapshotValue.seed !== 'string' || snapshotValue.seed.length === 0 || snapshotValue.seed.length > 256) throw new Error('snapshot.seed is invalid');
  if (typeof snapshotValue.levelId !== 'string' || !isChapter01LevelId(snapshotValue.levelId)) throw new Error('snapshot.levelId is invalid');
  const levelId = snapshotValue.levelId;
  if (snapshotValue.encounter !== 'campaign' && snapshotValue.encounter !== 'boss-training') throw new Error('snapshot.encounter is invalid');
  const encounter = snapshotValue.encounter as EncounterId;
  if (!Array.isArray(snapshotValue.robots)) throw new Error('snapshot.robots must be an array');
  if (!Array.isArray(snapshotValue.projectiles)) throw new Error('snapshot.projectiles must be an array');
  const projectiles = snapshotValue.projectiles.map(validateProjectile);
  const nextProjectileId = integer(snapshotValue.nextProjectileId, 'snapshot.nextProjectileId', 1);
  if (projectiles.some((projectile) => projectile.id >= nextProjectileId)) throw new Error('snapshot.nextProjectileId must exceed every projectile ID');
  if (!Array.isArray(snapshotValue.playerBombs)) throw new Error('snapshot.playerBombs must be an array');
  const playerBombs = snapshotValue.playerBombs.map(validatePlayerBomb);
  const nextPlayerBombId = integer(snapshotValue.nextPlayerBombId, 'snapshot.nextPlayerBombId', 1);
  if (playerBombs.some((bomb) => bomb.id >= nextPlayerBombId)) throw new Error('snapshot.nextPlayerBombId must exceed every bomb ID');
  const robots = snapshotValue.robots.map(validateRobot);
  const expectedRobotIds = encounter === 'campaign' ? campaignRobotIds(levelId) : [6];
  if (robots.length !== expectedRobotIds.length || robots.some((robot, index) => robot.id !== expectedRobotIds[index])) {
    throw new Error(`snapshot robots do not match ${encounter}`);
  }
  const level = validateLevel(snapshotValue.level, levelId, encounter);
  const victory = booleanValue(snapshotValue.victory, 'snapshot.victory');
  const defeat = booleanValue(snapshotValue.defeat, 'snapshot.defeat');
  const key = level.pickups.find((pickup) => pickup.kind === 'key')!;
  if (level.keyCollected === key.active) throw new Error('snapshot.level key state is inconsistent');
  if (level.door.open && !level.keyCollected) throw new Error('snapshot.level door cannot open before its key is collected');
  if (encounter === 'campaign') {
    const waves = campaignRobotWaves(levelId);
    for (let waveIndex = 0; waveIndex < waves.length; waveIndex += 1) {
      const shouldBeSpawned = waveIndex <= level.encounter.waveIndex;
      for (const id of waves[waveIndex]!) {
        const robot = robots.find((candidate) => candidate.id === id)!;
        if (robot.spawned !== shouldBeSpawned) throw new Error(`snapshot robot ${id} has an inconsistent wave state`);
      }
    }
    if (level.encounter.pendingTicks > 0 && robots.some((robot) => robot.active)) {
      throw new Error('snapshot.level encounter cannot count down while Davels remain active');
    }
  }
  if (level.objectiveComplete && (robots.some((robot) => robot.active) || robots.some((robot) => !robot.spawned))) {
    throw new Error('snapshot.level objective cannot complete before every Davel is spawned and inactive');
  }
  if (victory && !level.objectiveComplete) throw new Error('snapshot victory requires the primary objective');
  if (victory && defeat) throw new Error('snapshot cannot be both victory and defeat');
  return {
    tick: integer(snapshotValue.tick, 'snapshot.tick'),
    seed: snapshotValue.seed,
    levelId,
    encounter,
    player: validatePlayer(snapshotValue.player),
    robots,
    events: [],
    lastShotTick: integer(snapshotValue.lastShotTick, 'snapshot.lastShotTick', -1_000_000_000),
    shotSerial: integer(snapshotValue.shotSerial, 'snapshot.shotSerial'),
    victory,
    defeat,
    projectiles,
    nextProjectileId,
    playerBombs,
    nextPlayerBombId,
    lastSwordTick: integer(snapshotValue.lastSwordTick, 'snapshot.lastSwordTick', -1_000_000_000),
    lastBombTick: integer(snapshotValue.lastBombTick, 'snapshot.lastBombTick', -1_000_000_000),
    laserFocusTicks: integer(snapshotValue.laserFocusTicks, 'snapshot.laserFocusTicks'),
    laserTargetRobotId: snapshotValue.laserTargetRobotId === null ? null : integer(snapshotValue.laserTargetRobotId, 'snapshot.laserTargetRobotId'),
    laserActive: booleanValue(snapshotValue.laserActive, 'snapshot.laserActive'),
    laserBeamDistance: finite(snapshotValue.laserBeamDistance, 'snapshot.laserBeamDistance'),
    level,
  };
}

export function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Canonical JSON cannot encode non-finite numbers');
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  throw new Error(`Canonical JSON cannot encode ${typeof value}`);
}

export function parseSimulationSnapshot(serialized: string): SimulationSnapshotV1 {
  const parsed: unknown = JSON.parse(serialized);
  const state = restoreSimulationState(parsed);
  return createSimulationSnapshot(state);
}

export function serializeSimulationSnapshot(state: GameState): string {
  return canonicalJson(createSimulationSnapshot(state));
}

function checksumText(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let hash = 0xcbf29ce484222325n;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

export function checksumCanonical(value: unknown): string {
  return checksumText(canonicalJson(value));
}

export function stateChecksum(state: GameState): string {
  return checksumText(serializeSimulationSnapshot(state));
}
