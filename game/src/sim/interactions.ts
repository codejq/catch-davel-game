import type { PlayerState } from './player';
import { BOMB_SEAL_BREAK_RADIUS } from './level-mechanics';
import { cellAt, cellCenter, findCell, isPlayerPositionValidWithBlockers, worldCell, type CellCoordinate } from './level';
import { FIXED_DT_SECONDS, PLAYER_RADIUS } from './constants';
import { campaignRobotWaves, type EncounterId, type RobotState } from './robots';
import { PLAYABLE_LEVEL_IDS, type PlayableLevelId } from '../content/level-ids';
import { campaignLevel } from '../content/levels/catalog';
import {
  hazardRuntimeProfile, mazeRuntimeProfile, type LevelInteractionRuntimeProfile,
} from '../content/runtime-manifests';
import { difficultyProfile, type DifficultyId } from './difficulty';

export type PickupKind = 'key' | 'health' | 'energy' | 'coin';

export interface PickupState {
  readonly id: string;
  readonly kind: PickupKind;
  readonly x: number;
  readonly z: number;
  readonly amount: number;
  active: boolean;
}

export interface HazardRuntimeState {
  readonly id: string;
  readonly kind: 'conveyor' | 'timed-door';
  readonly column: number;
  readonly row: number;
  readonly x: number;
  readonly z: number;
  readonly halfWidth: number;
  readonly halfDepth: number;
  readonly directionX: number;
  readonly directionZ: number;
  readonly periodTicks: number;
  readonly activeTicks: number;
  readonly phaseOffsetTicks: number;
  active: boolean;
}

export interface DefenseTargetState {
  readonly id: 'prize-bank';
  readonly column: number;
  readonly row: number;
  readonly x: number;
  readonly z: number;
  readonly maxHealth: number;
  health: number;
  readonly attackRadius: number;
  readonly damagePerStrike: number;
  readonly attackIntervalTicks: number;
}

export interface LevelRuntimeState {
  readonly pickups: PickupState[];
  readonly hazards: HazardRuntimeState[];
  readonly door: {
    readonly id: string;
    readonly keyId: string;
    readonly column: number;
    readonly row: number;
    readonly x: number;
    readonly z: number;
    open: boolean;
  };
  readonly checkpoint: {
    readonly id: string;
    readonly x: number;
    readonly z: number;
    activated: boolean;
  };
  readonly exit: {
    readonly x: number;
    readonly z: number;
  };
  readonly encounter: {
    waveIndex: number;
    readonly waveCount: number;
    pendingTicks: number;
  };
  readonly defense: DefenseTargetState | null;
  keyCollected: boolean;
  objectiveComplete: boolean;
}

export type LevelInteractionEvent = {
  readonly type: 'key-collected' | 'health-collected' | 'energy-collected' | 'coin-collected' | 'door-opened'
    | 'checkpoint-activated' | 'objective-complete' | 'exit-unlocked' | 'victory';
  readonly value?: number;
};

export const LEVEL_INTERACTION_DEFINITIONS: Readonly<Record<PlayableLevelId, LevelInteractionRuntimeProfile>> =
  Object.fromEntries(PLAYABLE_LEVEL_IDS.map((levelId) => [
    levelId,
    mazeRuntimeProfile(campaignLevel(levelId).maze.templateSetId).interactions,
  ])) as Readonly<Record<PlayableLevelId, LevelInteractionRuntimeProfile>>;

function assertValidDefinition(levelId: PlayableLevelId, definition: LevelInteractionRuntimeProfile): void {
  const placements = [
    definition.health, definition.key, definition.energy, definition.door, definition.checkpoint,
    ...(definition.coin === undefined ? [] : [definition.coin]),
    ...(definition.secretCoin === undefined ? [] : [definition.secretCoin]),
    ...(definition.defense === undefined ? [] : [definition.defense]),
  ];
  const identities = placements.map((cell) => `${cell.column},${cell.row}`);
  if (new Set(identities).size !== identities.length) throw new Error(`${levelId} interaction placements overlap`);
  for (const cell of placements) {
    if (cellAt(cell.column, cell.row, levelId) === '#') throw new Error(`${levelId} interaction placement enters a wall`);
  }
}

export function createLevelRuntime(
  levelId: PlayableLevelId = 'level-001', encounter: EncounterId = 'campaign',
): LevelRuntimeState {
  const definition = LEVEL_INTERACTION_DEFINITIONS[levelId];
  assertValidDefinition(levelId, definition);
  const door = cellCenter(definition.door.column, definition.door.row);
  const checkpoint = cellCenter(definition.checkpoint.column, definition.checkpoint.row);
  const exitCell = findCell('E', levelId);
  const exit = cellCenter(exitCell.column, exitCell.row);
  const levelDefinition = campaignLevel(levelId);
  const primaryObjective = levelDefinition.objectives.find((objective) => objective.required)!;
  if ((primaryObjective.type === 'defend') !== (definition.defense !== undefined)) {
    throw new Error(`${levelId} defend objective and runtime target must be declared together`);
  }
  const keyDefinition = levelDefinition.maze.keys[0];
  if (keyDefinition === undefined) throw new Error(`${levelId} has no campaign key`);
  const keyedEdge = levelDefinition.maze.edges.find((edge) => edge.requiredKeyId === keyDefinition.id);
  if (keyedEdge === undefined) throw new Error(`${levelId} has no door for campaign key ${keyDefinition.id}`);
  const pickupDefinitions: { readonly id: string; readonly kind: PickupKind; readonly column: number; readonly row: number; readonly amount: number }[] = [
    { id: 'repair-kit', kind: 'health' as const, ...definition.health, amount: definition.health.amount ?? 25 },
    { id: keyDefinition.id, kind: 'key' as const, ...definition.key, amount: 0 },
    { id: 'pulse-cell', kind: 'energy' as const, ...definition.energy, amount: definition.energy.amount ?? 35 },
  ];
  if (definition.coin !== undefined) pickupDefinitions.push({
    id: 'coin-cache', kind: 'coin', ...definition.coin, amount: definition.coin.amount ?? 5,
  });
  if (definition.secretCoin !== undefined) pickupDefinitions.push({
    id: 'secret-coin-cache', kind: 'coin', ...definition.secretCoin, amount: definition.secretCoin.amount ?? 12,
  });
  const hazards: HazardRuntimeState[] = levelDefinition.maze.hazards.map((hazard) => {
    const profile = hazardRuntimeProfile(hazard.collisionProfileId);
    if (cellAt(profile.column, profile.row, levelId) === '#') {
      throw new Error(`${levelId} hazard ${hazard.id} enters a wall`);
    }
    const point = cellCenter(profile.column, profile.row);
    const phase = profile.phaseOffsetTicks % hazard.periodTicks;
    return {
      id: hazard.id, kind: profile.kind, column: profile.column, row: profile.row, x: point.x, z: point.z,
      halfWidth: profile.halfWidth, halfDepth: profile.halfDepth,
      directionX: profile.directionX, directionZ: profile.directionZ,
      periodTicks: hazard.periodTicks, activeTicks: hazard.activeTicks,
      phaseOffsetTicks: profile.phaseOffsetTicks,
      active: profile.activation === 'before-key' || profile.activation === 'until-bomb'
        || profile.activation === 'until-bomb-optional'
        || (profile.activation !== 'after-key' && profile.activation !== 'after-tick' && phase < hazard.activeTicks),
    };
  });
  const defense = definition.defense === undefined || encounter !== 'campaign' ? null : (() => {
    const point = cellCenter(definition.defense.column, definition.defense.row);
    return {
      id: 'prize-bank' as const,
      column: definition.defense.column,
      row: definition.defense.row,
      x: point.x,
      z: point.z,
      maxHealth: definition.defense.maxHealth,
      health: definition.defense.maxHealth,
      attackRadius: definition.defense.attackRadius,
      damagePerStrike: definition.defense.damagePerStrike,
      attackIntervalTicks: definition.defense.attackIntervalTicks,
    };
  })();
  return {
    pickups: pickupDefinitions.map((pickup) => {
      const point = cellCenter(pickup.column, pickup.row);
      return { id: pickup.id, kind: pickup.kind, x: point.x, z: point.z, amount: pickup.amount, active: true };
    }),
    hazards,
    door: {
      id: keyedEdge.doorType, keyId: keyDefinition.id, column: definition.door.column, row: definition.door.row,
      x: door.x, z: door.z, open: false,
    },
    checkpoint: {
      id: levelId === 'level-001' ? 'checkpoint-before-exit' : `checkpoint-${levelId.slice(-3)}`,
      x: checkpoint.x, z: checkpoint.z, activated: false,
    },
    exit,
    encounter: { waveIndex: 0, waveCount: encounter === 'campaign' ? campaignRobotWaves(levelId).length : 1, pendingTicks: 0 },
    defense,
    keyCollected: false,
    objectiveComplete: false,
  };
}

export interface DefenseStrike {
  readonly robotId: number;
  readonly damage: number;
}

export function stepDefenseTarget(
  level: LevelRuntimeState,
  robots: readonly RobotState[],
  tick: number,
  difficulty: DifficultyId = 'standard',
): readonly DefenseStrike[] {
  const target = level.defense;
  if (target === null || !level.keyCollected || level.objectiveComplete || target.health <= 0) return [];
  const multiplier = difficultyProfile(difficulty).incomingDamageMultiplier;
  const strikes: DefenseStrike[] = [];
  for (const robot of robots) {
    if (!robot.active || Math.hypot(robot.x - target.x, robot.z - target.z) > target.attackRadius) continue;
    if ((tick + robot.id * 11) % target.attackIntervalTicks !== 0) continue;
    const damage = Math.max(1, Math.round(target.damagePerStrike * multiplier));
    target.health = Math.max(0, target.health - damage);
    strikes.push({ robotId: robot.id, damage });
    if (target.health === 0) break;
  }
  return strikes;
}

export function queueNextEncounterWave(level: LevelRuntimeState, difficulty: DifficultyId = 'standard'): boolean {
  if (level.encounter.pendingTicks > 0 || level.encounter.waveIndex + 1 >= level.encounter.waveCount) return false;
  level.encounter.pendingTicks = difficultyProfile(difficulty).interWaveDelayTicks;
  return true;
}

export function stepEncounterWaves(
  robots: RobotState[], level: LevelRuntimeState, levelId: PlayableLevelId,
): void {
  if (level.encounter.pendingTicks <= 0) return;
  level.encounter.pendingTicks -= 1;
  if (level.encounter.pendingTicks > 0) return;
  level.encounter.waveIndex += 1;
  const ids = new Set(campaignRobotWaves(levelId)[level.encounter.waveIndex] ?? []);
  for (const robot of robots) {
    if (!ids.has(robot.id)) continue;
    robot.spawned = true;
    robot.active = true;
  }
}

export function stepLevelHazards(
  player: PlayerState, level: LevelRuntimeState, tick: number, levelId: PlayableLevelId,
): void {
  stepLevelHazardPhases(level, tick, levelId);
  for (const hazard of level.hazards) {
    if (hazard.kind !== 'conveyor' || !hazard.active
      || Math.abs(player.x - hazard.x) > hazard.halfWidth || Math.abs(player.z - hazard.z) > hazard.halfDepth) continue;
    const distance = 2.1 * FIXED_DT_SECONDS;
    const nextX = player.x + hazard.directionX * distance;
    const nextZ = player.z + hazard.directionZ * distance;
    const blockers = closedDoorCells(level);
    if (isPlayerPositionValidWithBlockers(nextX, nextZ, PLAYER_RADIUS, blockers, levelId)) {
      player.x = nextX;
      player.z = nextZ;
    }
  }
}

export function stepLevelHazardPhases(
  level: LevelRuntimeState, tick: number, levelId: PlayableLevelId = 'level-001',
): void {
  for (const hazard of level.hazards) {
    hazard.active = hazardActiveAtTick(hazard, tick, level.keyCollected, levelId);
  }
}

function hazardActivation(
  levelId: PlayableLevelId, hazardId: string,
): 'periodic' | 'before-key' | 'after-key' | 'after-tick' | 'until-bomb' | 'until-bomb-optional' {
  const authored = campaignLevel(levelId).maze.hazards.find((hazard) => hazard.id === hazardId);
  if (authored === undefined) return 'periodic';
  return hazardRuntimeProfile(authored.collisionProfileId).activation ?? 'periodic';
}

export function hazardActiveAtTick(
  hazard: HazardRuntimeState, tick: number, keyCollected = false, levelId: PlayableLevelId = 'level-001',
): boolean {
  const activation = hazardActivation(levelId, hazard.id);
  if (activation === 'before-key') return !keyCollected;
  if (activation === 'after-key') return keyCollected;
  if (activation === 'after-tick') return tick >= hazard.phaseOffsetTicks;
  if (activation === 'until-bomb' || activation === 'until-bomb-optional') return hazard.active;
  return (tick + hazard.phaseOffsetTicks) % hazard.periodTicks < hazard.activeTicks;
}

export function hazardTicksUntilToggle(
  hazard: HazardRuntimeState, tick: number, levelId: PlayableLevelId = 'level-001',
): number {
  const activation = hazardActivation(levelId, hazard.id);
  if (activation === 'after-tick') return Math.max(0, hazard.phaseOffsetTicks - tick);
  if (activation !== 'periodic') return 0;
  const phase = (tick + hazard.phaseOffsetTicks) % hazard.periodTicks;
  return phase < hazard.activeTicks ? hazard.activeTicks - phase : hazard.periodTicks - phase;
}

export function breakBombSeals(
  level: LevelRuntimeState,
  detonations: readonly { readonly x: number; readonly z: number }[],
  levelId: PlayableLevelId,
): readonly string[] {
  if (detonations.length === 0) return [];
  const broken: string[] = [];
  for (const hazard of level.hazards) {
    const activation = hazardActivation(levelId, hazard.id);
    if (!hazard.active || (activation !== 'until-bomb' && activation !== 'until-bomb-optional')) continue;
    if (!detonations.some((detonation) => Math.hypot(detonation.x - hazard.x, detonation.z - hazard.z) <= BOMB_SEAL_BREAK_RADIUS)) continue;
    hazard.active = false;
    broken.push(hazard.id);
  }
  return broken;
}

export function closedDoorCells(level: LevelRuntimeState, player?: Pick<PlayerState, 'x' | 'z'>): readonly CellCoordinate[] {
  const result: CellCoordinate[] = level.door.open ? [] : [{ column: level.door.column, row: level.door.row }];
  const occupiedCell = player === undefined ? null : worldCell(player.x, player.z);
  if (level.defense !== null
    && (occupiedCell?.column !== level.defense.column || occupiedCell.row !== level.defense.row)) {
    result.push({ column: level.defense.column, row: level.defense.row });
  }
  for (const hazard of level.hazards) {
    if (hazard.kind !== 'timed-door' || !hazard.active) continue;
    if (occupiedCell?.column === hazard.column && occupiedCell.row === hazard.row) continue;
    result.push({ column: hazard.column, row: hazard.row });
  }
  return result;
}

function near(player: PlayerState, x: number, z: number, radius: number): boolean {
  return Math.hypot(player.x - x, player.z - z) <= radius;
}

export function openNearbyDoor(player: PlayerState, level: LevelRuntimeState): LevelInteractionEvent | null {
  if (level.door.open || !level.keyCollected || !near(player, level.door.x, level.door.z, 2.15)) return null;
  level.door.open = true;
  return { type: 'door-opened' };
}

export function collectLevelInteractions(
  player: PlayerState, level: LevelRuntimeState, difficulty: DifficultyId = 'standard',
): LevelInteractionEvent[] {
  const events: LevelInteractionEvent[] = [];
  const resourceMultiplier = difficultyProfile(difficulty).resourceMultiplier;
  for (const pickup of level.pickups) {
    if (!pickup.active || !near(player, pickup.x, pickup.z, 0.82)) continue;
    if (pickup.kind === 'health' && player.health >= player.maxHealth) continue;
    if (pickup.kind === 'energy' && player.energy >= player.maxEnergy) continue;
    pickup.active = false;
    if (pickup.kind === 'key') {
      level.keyCollected = true;
      events.push({ type: 'key-collected' });
    } else if (pickup.kind === 'health') {
      const recovered = Math.min(Math.round(pickup.amount * resourceMultiplier), player.maxHealth - player.health);
      player.health += recovered;
      events.push({ type: 'health-collected', value: recovered });
    } else if (pickup.kind === 'energy') {
      const recovered = Math.min(Math.round(pickup.amount * resourceMultiplier), player.maxEnergy - player.energy);
      player.energy += recovered;
      events.push({ type: 'energy-collected', value: recovered });
    } else {
      const awarded = Math.max(1, Math.round(pickup.amount * resourceMultiplier));
      player.coins += awarded;
      events.push({ type: 'coin-collected', value: awarded });
    }
  }
  if (!level.checkpoint.activated && near(player, level.checkpoint.x, level.checkpoint.z, 0.95)) {
    level.checkpoint.activated = true;
    events.push({ type: 'checkpoint-activated' });
  }
  return events;
}

export function completePrimaryObjective(
  level: LevelRuntimeState, levelId: PlayableLevelId = 'level-001',
  tick = 0,
): LevelInteractionEvent[] {
  const primaryObjective = campaignLevel(levelId).objectives.find((objective) => objective.required)!;
  if (level.objectiveComplete || level.hazards.some(
    (hazard) => hazard.active && hazardActivation(levelId, hazard.id) === 'until-bomb',
  ) || (primaryObjective.completionMode === 'timer' && tick < primaryObjective.durationTicks!)) return [];
  level.objectiveComplete = true;
  return [{ type: 'objective-complete' }, { type: 'exit-unlocked' }];
}

export function reachedUnlockedExit(player: PlayerState, level: LevelRuntimeState): boolean {
  return level.objectiveComplete && near(player, level.exit.x, level.exit.z, 0.95);
}
