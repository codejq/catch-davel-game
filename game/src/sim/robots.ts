import { FIXED_DT_SECONDS } from './constants';
import { cellAt, cellCenter, isWallAtWorld, type CellCoordinate } from './level';
import { decision, hashSeed } from './random';
import { createRobotBody, stepRobotBody, type RobotBodyState } from './xpbd';
import { ENEMY_INITIAL_COOLDOWN_BASE, ENEMY_INITIAL_COOLDOWN_STEP } from './balance';
import type { PlayerState } from './player';
import { chapter01Level, type Chapter01LevelId } from '../content/levels/chapter-01';
import { levelDancePerformance } from './dance-performance';
import { isKeyAmbushLevel } from './level-mechanics';

export type DanceId = 'rubber-chicken' | 'moonwalker' | 'tiny-tyrant' | 'big-bouncer' | 'broken-marionette' | 'disco-menace';
export type RobotArchetype = 'wobble-scout' | 'blue-slider' | 'yellow-spinner' | 'red-firemouth' | 'cyan-dj' | 'invoice-overlord';
export type RobotRank = 'ordinary' | 'elite' | 'boss';
export type RobotCombatState = 'patrol' | 'telegraph' | 'recover';
export type EncounterId = 'campaign' | 'boss-training';

export interface RobotDefinition {
  readonly name: string;
  readonly dance: DanceId;
  readonly archetype: RobotArchetype;
  readonly rank: RobotRank;
  readonly coinReward: number;
  readonly maxHealth: number;
  readonly route: readonly CellCoordinate[];
  readonly scale: number;
  readonly headScale: number;
  readonly torsoWidth: number;
  readonly legScale: number;
  readonly speed: number;
  readonly phaseOffset: number;
  readonly bodyColor: readonly [number, number, number];
  readonly accentColor: readonly [number, number, number];
  readonly eyeColor: readonly [number, number, number];
}

export interface RobotState {
  readonly id: number;
  spawned: boolean;
  x: number;
  z: number;
  heading: number;
  targetIndex: number;
  routeDirection: 1 | -1;
  holdTicks: number;
  arrivalCount: number;
  danceTime: number;
  health: number;
  active: boolean;
  hitFlashTicks: number;
  knockbackX: number;
  knockbackZ: number;
  readonly body: RobotBodyState;
  attackCooldownTicks: number;
  combatState: RobotCombatState;
  combatTicks: number;
  strafeDirection: 1 | -1;
  tempoBuffTicks: number;
  bossPhase: 0 | 1 | 2 | 3;
}

const cells = (...coordinates: readonly [number, number][]): readonly CellCoordinate[] => coordinates.map(([column, row]) => ({ column, row }));

export const ROBOT_DEFINITIONS: readonly RobotDefinition[] = [
  {
    name: 'Clucky-7', dance: 'rubber-chicken', archetype: 'wobble-scout', rank: 'ordinary', coinReward: 2, maxHealth: 100,
    scale: 0.92, headScale: 1.2, torsoWidth: 0.82, legScale: 0.88,
    speed: 1.35, phaseOffset: 0.15, bodyColor: [0.18, 0.82, 0.3], accentColor: [1, 0.86, 0.2], eyeColor: [0.2, 1, 0.95],
    route: cells([1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]),
  },
  {
    name: 'Velvet Slide', dance: 'moonwalker', archetype: 'blue-slider', rank: 'ordinary', coinReward: 3, maxHealth: 100,
    scale: 1.08, headScale: 0.98, torsoWidth: 0.72, legScale: 1.28,
    speed: 1.05, phaseOffset: 1.4, bodyColor: [0.1, 0.36, 0.96], accentColor: [0.18, 0.92, 1], eyeColor: [1, 0.36, 0.82],
    route: cells([7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [13, 2], [13, 3], [13, 4], [13, 5]),
  },
  {
    name: 'Tiny Tyrant', dance: 'tiny-tyrant', archetype: 'wobble-scout', rank: 'ordinary', coinReward: 2, maxHealth: 100,
    scale: 0.68, headScale: 1.5, torsoWidth: 1.05, legScale: 0.65,
    speed: 1.72, phaseOffset: 2.7, bodyColor: [1, 0.48, 0.12], accentColor: [1, 0.95, 0.34], eyeColor: [0.64, 0.04, 0.09],
    route: cells([1, 5], [2, 5], [3, 5], [3, 4], [3, 3], [2, 3], [1, 3]),
  },
  {
    name: 'Big Bouncer', dance: 'big-bouncer', archetype: 'red-firemouth', rank: 'ordinary', coinReward: 6, maxHealth: 100,
    scale: 1.35, headScale: 1.08, torsoWidth: 1.18, legScale: 0.82,
    speed: 0.84, phaseOffset: 3.5, bodyColor: [0.94, 0.11, 0.07], accentColor: [1, 0.52, 0.08], eyeColor: [1, 0.9, 0.25],
    route: cells([5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [9, 6], [9, 7], [8, 7], [7, 7]),
  },
  {
    name: 'Loose Screw', dance: 'broken-marionette', archetype: 'yellow-spinner', rank: 'ordinary', coinReward: 4, maxHealth: 100,
    scale: 0.98, headScale: 1.16, torsoWidth: 0.66, legScale: 1.1,
    speed: 1.2, phaseOffset: 4.8, bodyColor: [1, 0.72, 0.06], accentColor: [0.18, 0.5, 1], eyeColor: [1, 0.2, 0.48],
    route: cells([1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [5, 8], [5, 9], [4, 9], [3, 9], [3, 10], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [7, 12], [7, 13]),
  },
  {
    name: 'DJ Grin', dance: 'disco-menace', archetype: 'cyan-dj', rank: 'elite', coinReward: 9, maxHealth: 100,
    scale: 1.15, headScale: 1.0, torsoWidth: 0.94, legScale: 1.03,
    speed: 1.46, phaseOffset: 5.7, bodyColor: [0.06, 0.74, 0.86], accentColor: [1, 0.16, 0.72], eyeColor: [1, 0.94, 0.24],
    route: cells([7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [11, 10], [11, 11], [10, 11], [9, 11], [9, 12], [9, 13], [10, 13], [11, 13], [12, 13], [13, 13]),
  },
  {
    name: 'The Final Invoice', dance: 'big-bouncer', archetype: 'invoice-overlord', rank: 'boss', coinReward: 50, maxHealth: 420,
    scale: 1.78, headScale: 1.18, torsoWidth: 1.32, legScale: 0.94,
    speed: 0.78, phaseOffset: 0.72, bodyColor: [0.12, 0.12, 0.18], accentColor: [1, 0.68, 0.08], eyeColor: [1, 0.08, 0.18],
    route: cells([7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [11, 10], [11, 11], [10, 11], [9, 11]),
  },
  {
    name: 'Foreman Stomp', dance: 'big-bouncer', archetype: 'red-firemouth', rank: 'elite', coinReward: 14, maxHealth: 190,
    scale: 1.48, headScale: 1.02, torsoWidth: 1.3, legScale: 0.78,
    speed: 0.9, phaseOffset: 1.12, bodyColor: [0.48, 0.08, 0.04], accentColor: [1, 0.64, 0.04], eyeColor: [1, 0.92, 0.18],
    route: cells([5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [9, 6], [9, 7], [8, 7], [7, 7]),
  },
  {
    name: 'Gearbox Grin', dance: 'rubber-chicken', archetype: 'wobble-scout', rank: 'ordinary', coinReward: 3, maxHealth: 110,
    scale: 0.82, headScale: 1.38, torsoWidth: 0.74, legScale: 1.18,
    speed: 1.58, phaseOffset: 2.18, bodyColor: [0.3, 0.95, 0.28], accentColor: [0.08, 0.92, 1], eyeColor: [1, 0.18, 0.64],
    route: cells([1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [5, 8], [5, 9], [4, 9], [3, 9]),
  },
  {
    name: 'Bolt Jester', dance: 'moonwalker', archetype: 'blue-slider', rank: 'ordinary', coinReward: 4, maxHealth: 115,
    scale: 1.16, headScale: 0.9, torsoWidth: 0.64, legScale: 1.42,
    speed: 1.18, phaseOffset: 4.04, bodyColor: [0.08, 0.46, 1], accentColor: [0.92, 0.18, 1], eyeColor: [0.4, 1, 0.88],
    route: cells([7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [11, 10], [11, 11], [10, 11], [9, 11]),
  },
  {
    name: 'Clockwork Crook', dance: 'broken-marionette', archetype: 'yellow-spinner', rank: 'ordinary', coinReward: 5, maxHealth: 125,
    scale: 1.02, headScale: 1.25, torsoWidth: 0.88, legScale: 0.94,
    speed: 1.3, phaseOffset: 5.24, bodyColor: [0.96, 0.76, 0.05], accentColor: [0.14, 0.3, 0.96], eyeColor: [1, 0.12, 0.34],
    route: cells([9, 13], [10, 13], [11, 13], [12, 13], [13, 13], [13, 12], [13, 11], [13, 10], [13, 9]),
  },
] as const;

function materializeCampaignRobotWaves(levelId: Chapter01LevelId): readonly (readonly number[])[] {
  const level = chapter01Level(levelId);
  if (level.encounters.length !== 1) throw new Error(`${levelId} must resolve exactly one campaign encounter`);
  const used = new Set<number>();
  return level.encounters[0]!.waves.map((wave) => {
    const ids: number[] = [];
    for (const group of wave.spawnGroups) {
      const rank: RobotRank = group.rank === 'normal' ? 'ordinary' : group.rank;
      const candidates = ROBOT_DEFINITIONS
        .map((definition, id) => ({ definition, id }))
        .filter(({ definition, id }) => definition.archetype === group.archetypeId
          && definition.rank === rank && !used.has(id))
        .map(({ id }) => id);
      if (candidates.length < group.count) {
        throw new Error(`${levelId} group ${group.id} cannot resolve ${group.count} stable ${group.archetypeId}/${rank} Davels`);
      }
      for (const id of candidates.slice(0, group.count)) {
        used.add(id);
        ids.push(id);
      }
    }
    return ids.sort((left, right) => left - right);
  });
}

const campaignWaveCache = new Map<Chapter01LevelId, readonly (readonly number[])[]>();

export function campaignRobotIds(levelId: Chapter01LevelId): readonly number[] {
  return campaignRobotWaves(levelId).flat();
}

export function campaignRobotWaves(levelId: Chapter01LevelId): readonly (readonly number[])[] {
  let waves = campaignWaveCache.get(levelId);
  if (waves === undefined) {
    waves = materializeCampaignRobotWaves(levelId);
    campaignWaveCache.set(levelId, waves);
  }
  return waves;
}

export function validateRobotDefinitions(): void {
  for (const definition of ROBOT_DEFINITIONS) {
    if (definition.route.length < 2) throw new Error(`${definition.name} needs at least two route cells`);
    for (let index = 0; index < definition.route.length; index += 1) {
      const cell = definition.route[index]!;
      if (cellAt(cell.column, cell.row) === '#') throw new Error(`${definition.name} route enters a wall`);
      if (index > 0) {
        const previous = definition.route[index - 1]!;
        if (Math.abs(previous.column - cell.column) + Math.abs(previous.row - cell.row) !== 1) {
          throw new Error(`${definition.name} route has a disconnected step`);
        }
      }
    }
  }
}

export function createRobots(encounter: EncounterId = 'campaign', levelId: Chapter01LevelId = 'level-001'): RobotState[] {
  validateRobotDefinitions();
  const performance = levelDancePerformance(levelId);
  const definitionIds = encounter === 'boss-training' ? [6] : campaignRobotIds(levelId);
  return definitionIds.map((id) => {
    const definition = ROBOT_DEFINITIONS[id]!;
    const startIndex = Math.min(definition.route.length - 2, 2 + (id % 3));
    const start = definition.route[startIndex]!;
    const position = cellCenter(start.column, start.row);
    const waveIndex = encounter === 'boss-training'
      ? 0 : campaignRobotWaves(levelId).findIndex((wave) => wave.includes(id));
    const spawned = waveIndex === 0 && !(encounter === 'campaign' && isKeyAmbushLevel(levelId));
    const robot: Omit<RobotState, 'body'> = {
      id, x: position.x, z: position.z, heading: id * 0.83, targetIndex: startIndex + 1,
      routeDirection: 1, holdTicks: id * 7, arrivalCount: 0, danceTime: definition.phaseOffset,
      health: definition.maxHealth, spawned, active: spawned,
      hitFlashTicks: 0, knockbackX: 0, knockbackZ: 0,
      attackCooldownTicks: ENEMY_INITIAL_COOLDOWN_BASE + id * ENEMY_INITIAL_COOLDOWN_STEP,
      combatState: 'patrol', combatTicks: 0, strafeDirection: id % 2 === 0 ? 1 : -1, tempoBuffTicks: 0,
      bossPhase: definition.rank === 'boss' ? 1 : 0,
    };
    return { ...robot, body: createRobotBody(robot.x, robot.z, robot.heading, robot.danceTime, definition, performance) };
  });
}

function tryCombatMovement(
  robot: RobotState, definition: RobotDefinition, player: PlayerState, levelId: Chapter01LevelId,
): boolean {
  if (robot.combatState === 'telegraph') return true;
  const deltaX = player.x - robot.x;
  const deltaZ = player.z - robot.z;
  const distance = Math.hypot(deltaX, deltaZ);
  if (distance < 0.001 || distance > 8) return false;
  let directionX = 0;
  let directionZ = 0;
  let speedScale = 0;
  if (definition.archetype === 'wobble-scout' && distance > 1.45 && distance < 5) {
    directionX = deltaX / distance; directionZ = deltaZ / distance; speedScale = 0.72;
  } else if (definition.archetype === 'blue-slider' && distance < 7.5) {
    directionX = -deltaZ / distance * robot.strafeDirection;
    directionZ = deltaX / distance * robot.strafeDirection;
    speedScale = 0.88;
  } else if (definition.archetype === 'red-firemouth' && distance < 3.6) {
    directionX = -deltaX / distance; directionZ = -deltaZ / distance; speedScale = 0.55;
  } else return false;
  const amount = definition.speed * speedScale * FIXED_DT_SECONDS;
  const nextX = robot.x + directionX * amount;
  const nextZ = robot.z + directionZ * amount;
  let moved = false;
  if (!isWallAtWorld(nextX, robot.z, levelId)) { robot.x = nextX; moved = true; }
  if (!isWallAtWorld(robot.x, nextZ, levelId)) { robot.z = nextZ; moved = true; }
  if (!moved && definition.archetype === 'blue-slider') robot.strafeDirection = robot.strafeDirection === 1 ? -1 : 1;
  if (moved) robot.heading = Math.atan2(directionX, directionZ);
  return moved;
}

export function stepRobots(
  robots: RobotState[], seedText: string, player?: PlayerState, levelId: Chapter01LevelId = 'level-001',
): void {
  const seed = hashSeed(seedText);
  const performance = levelDancePerformance(levelId);
  for (const robot of robots) {
    if (!robot.active) continue;
    const definition = ROBOT_DEFINITIONS[robot.id]!;
    if (robot.tempoBuffTicks > 0) robot.tempoBuffTicks -= 1;
    const tempoScale = robot.tempoBuffTicks > 0 ? 1.28 : 1;
    robot.danceTime += FIXED_DT_SECONDS * (1.4 + robot.id * 0.13) * (performance.bpm / 96) * tempoScale;
    robot.hitFlashTicks = Math.max(0, robot.hitFlashTicks - 1);
    if (Math.abs(robot.knockbackX) + Math.abs(robot.knockbackZ) > 0.001) {
      const nextX = robot.x + robot.knockbackX;
      const nextZ = robot.z + robot.knockbackZ;
      if (!isWallAtWorld(nextX, robot.z, levelId)) robot.x = nextX;
      if (!isWallAtWorld(robot.x, nextZ, levelId)) robot.z = nextZ;
      robot.knockbackX *= 0.82;
      robot.knockbackZ *= 0.82;
    }
    if (player !== undefined && tryCombatMovement(robot, definition, player, levelId)) {
      // Combat movement is bounded by the same maze collision field as patrols.
    } else if (robot.holdTicks > 0) {
      robot.holdTicks -= 1;
    } else {
      const targetCell = definition.route[robot.targetIndex]!;
      const target = cellCenter(targetCell.column, targetCell.row);
      const deltaX = target.x - robot.x;
      const deltaZ = target.z - robot.z;
      const distance = Math.hypot(deltaX, deltaZ);
      const stepDistance = definition.speed * FIXED_DT_SECONDS;
      if (distance > stepDistance) {
        robot.x += (deltaX / distance) * stepDistance;
        robot.z += (deltaZ / distance) * stepDistance;
        robot.heading = Math.atan2(deltaX, deltaZ);
      } else {
        robot.x = target.x;
        robot.z = target.z;
        robot.arrivalCount += 1;
        const roll = decision(seed, robot.id, robot.arrivalCount);
        robot.holdTicks = 4 + (roll & 31) + (robot.id === 2 ? 0 : (roll >>> 8) & 15);
        if (((roll >>> 12) & 1) === 1) robot.strafeDirection = robot.strafeDirection === 1 ? -1 : 1;
        const atStart = robot.targetIndex === 0;
        const atEnd = robot.targetIndex === definition.route.length - 1;
        if (atStart || atEnd || ((roll >>> 16) & 3) === 0) robot.routeDirection = robot.routeDirection === 1 ? -1 : 1;
        robot.targetIndex += robot.routeDirection;
      }
    }
    stepRobotBody(robot, definition, performance);
  }
}
