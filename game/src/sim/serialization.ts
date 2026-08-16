import { GAME_SCHEMA_VERSION } from './constants';
import type { EnemyProjectile } from './enemy-combat';
import type { GameState } from './game';
import type { PlayerState } from './player';
import { ROBOT_DEFINITIONS, type RobotState } from './robots';
import { BODY_POINT_COUNT } from './xpbd';

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
  readonly active: boolean;
  readonly hitFlashTicks: number;
  readonly knockbackX: number;
  readonly knockbackZ: number;
  readonly attackCooldownTicks: number;
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
  readonly player: PlayerState;
  readonly robots: readonly RobotSnapshotV1[];
  readonly lastShotTick: number;
  readonly shotSerial: number;
  readonly victory: boolean;
  readonly defeat: boolean;
  readonly projectiles: readonly EnemyProjectile[];
  readonly nextProjectileId: number;
}

function copyPlayer(player: PlayerState): PlayerState {
  return { ...player };
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
    active: robot.active,
    hitFlashTicks: robot.hitFlashTicks,
    knockbackX: robot.knockbackX,
    knockbackZ: robot.knockbackZ,
    attackCooldownTicks: robot.attackCooldownTicks,
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
    player: copyPlayer(state.player),
    robots: state.robots.map(snapshotRobot),
    lastShotTick: state.lastShotTick,
    shotSerial: state.shotSerial,
    victory: state.victory,
    defeat: state.defeat,
    projectiles: state.projectiles.map((projectile) => ({ ...projectile })),
    nextProjectileId: state.nextProjectileId,
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
  assertExactKeys(value, ['x', 'z', 'yaw', 'pitch', 'health', 'energy', 'coins', 'bobPhase'], 'snapshot.player');
  return {
    x: finite(value.x, 'player.x'), z: finite(value.z, 'player.z'),
    yaw: finite(value.yaw, 'player.yaw'), pitch: finite(value.pitch, 'player.pitch'),
    health: finite(value.health, 'player.health'), energy: finite(value.energy, 'player.energy'),
    coins: integer(value.coins, 'player.coins'), bobPhase: finite(value.bobPhase, 'player.bobPhase'),
  };
}

function validateRobot(value: unknown, expectedId: number): RobotState {
  assertRecord(value, `robots[${expectedId}]`);
  assertExactKeys(value, [
    'id', 'x', 'z', 'heading', 'targetIndex', 'routeDirection', 'holdTicks', 'arrivalCount', 'danceTime', 'health',
    'active', 'hitFlashTicks', 'knockbackX', 'knockbackZ', 'attackCooldownTicks', 'body',
  ], `robots[${expectedId}]`);
  const id = integer(value.id, `robots[${expectedId}].id`);
  if (id !== expectedId) throw new Error(`robots must have stable ordered IDs; expected ${expectedId}`);
  const routeDirection = finite(value.routeDirection, `robots[${id}].routeDirection`);
  if (routeDirection !== 1 && routeDirection !== -1) throw new Error(`robots[${id}].routeDirection must be -1 or 1`);
  const targetIndex = integer(value.targetIndex, `robots[${id}].targetIndex`);
  if (targetIndex >= ROBOT_DEFINITIONS[id]!.route.length) throw new Error(`robots[${id}].targetIndex is outside its route`);
  assertRecord(value.body, `robots[${id}].body`);
  assertExactKeys(value.body, ['positions', 'previous', 'restLengths'], `robots[${id}].body`);
  return {
    id,
    x: finite(value.x, `robots[${id}].x`), z: finite(value.z, `robots[${id}].z`),
    heading: finite(value.heading, `robots[${id}].heading`), targetIndex,
    routeDirection,
    holdTicks: integer(value.holdTicks, `robots[${id}].holdTicks`),
    arrivalCount: integer(value.arrivalCount, `robots[${id}].arrivalCount`),
    danceTime: finite(value.danceTime, `robots[${id}].danceTime`),
    health: finite(value.health, `robots[${id}].health`),
    active: booleanValue(value.active, `robots[${id}].active`),
    hitFlashTicks: integer(value.hitFlashTicks, `robots[${id}].hitFlashTicks`),
    knockbackX: finite(value.knockbackX, `robots[${id}].knockbackX`),
    knockbackZ: finite(value.knockbackZ, `robots[${id}].knockbackZ`),
    attackCooldownTicks: integer(value.attackCooldownTicks, `robots[${id}].attackCooldownTicks`, -10_000),
    body: {
      positions: new Float64Array(numberArray(value.body.positions, BODY_POINT_COUNT * 3, `robots[${id}].body.positions`)),
      previous: new Float64Array(numberArray(value.body.previous, BODY_POINT_COUNT * 3, `robots[${id}].body.previous`)),
      restLengths: new Float64Array(numberArray(value.body.restLengths, 10, `robots[${id}].body.restLengths`)),
    },
  };
}

function validateProjectile(value: unknown, index: number): EnemyProjectile {
  assertRecord(value, `projectiles[${index}]`);
  assertExactKeys(value, ['id', 'ownerRobotId', 'x', 'y', 'z', 'velocityX', 'velocityY', 'velocityZ', 'lifeTicks'], `projectiles[${index}]`);
  const ownerRobotId = integer(value.ownerRobotId, `projectiles[${index}].ownerRobotId`);
  if (ownerRobotId >= ROBOT_DEFINITIONS.length) throw new Error(`projectiles[${index}].ownerRobotId is invalid`);
  return {
    id: integer(value.id, `projectiles[${index}].id`, 1), ownerRobotId,
    x: finite(value.x, `projectiles[${index}].x`), y: finite(value.y, `projectiles[${index}].y`), z: finite(value.z, `projectiles[${index}].z`),
    velocityX: finite(value.velocityX, `projectiles[${index}].velocityX`),
    velocityY: finite(value.velocityY, `projectiles[${index}].velocityY`),
    velocityZ: finite(value.velocityZ, `projectiles[${index}].velocityZ`),
    lifeTicks: integer(value.lifeTicks, `projectiles[${index}].lifeTicks`, 1),
  };
}

export function restoreSimulationState(snapshotValue: unknown): GameState {
  assertRecord(snapshotValue, 'snapshot');
  assertExactKeys(snapshotValue, [
    'snapshotFormatVersion', 'simulationSchemaVersion', 'tick', 'seed', 'player', 'robots', 'lastShotTick', 'shotSerial',
    'victory', 'defeat', 'projectiles', 'nextProjectileId',
  ], 'snapshot');
  if (snapshotValue.snapshotFormatVersion !== SNAPSHOT_FORMAT_VERSION) throw new Error('Unsupported snapshot format version');
  if (snapshotValue.simulationSchemaVersion !== GAME_SCHEMA_VERSION) throw new Error('Unsupported simulation schema version');
  if (typeof snapshotValue.seed !== 'string' || snapshotValue.seed.length === 0 || snapshotValue.seed.length > 256) throw new Error('snapshot.seed is invalid');
  if (!Array.isArray(snapshotValue.robots) || snapshotValue.robots.length !== ROBOT_DEFINITIONS.length) {
    throw new Error(`snapshot must contain ${ROBOT_DEFINITIONS.length} robots`);
  }
  if (!Array.isArray(snapshotValue.projectiles)) throw new Error('snapshot.projectiles must be an array');
  const projectiles = snapshotValue.projectiles.map(validateProjectile);
  const nextProjectileId = integer(snapshotValue.nextProjectileId, 'snapshot.nextProjectileId', 1);
  if (projectiles.some((projectile) => projectile.id >= nextProjectileId)) throw new Error('snapshot.nextProjectileId must exceed every projectile ID');
  return {
    tick: integer(snapshotValue.tick, 'snapshot.tick'),
    seed: snapshotValue.seed,
    player: validatePlayer(snapshotValue.player),
    robots: snapshotValue.robots.map(validateRobot),
    events: [],
    lastShotTick: integer(snapshotValue.lastShotTick, 'snapshot.lastShotTick', -1_000_000_000),
    shotSerial: integer(snapshotValue.shotSerial, 'snapshot.shotSerial'),
    victory: booleanValue(snapshotValue.victory, 'snapshot.victory'),
    defeat: booleanValue(snapshotValue.defeat, 'snapshot.defeat'),
    projectiles,
    nextProjectileId,
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
