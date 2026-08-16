import type { PlayerState } from './player';
import { cellAt, cellCenter, findCell, isPlayerPositionValidWithBlockers, type CellCoordinate } from './level';
import { FIXED_DT_SECONDS, PLAYER_RADIUS } from './constants';
import { campaignRobotWaves, type EncounterId, type RobotState } from './robots';
import type { Chapter01LevelId } from '../content/level-ids';

export type PickupKind = 'key' | 'health' | 'energy';

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
  readonly kind: 'conveyor';
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
  keyCollected: boolean;
  objectiveComplete: boolean;
}

export type LevelInteractionEvent = {
  readonly type: 'key-collected' | 'health-collected' | 'energy-collected' | 'door-opened'
    | 'checkpoint-activated' | 'objective-complete' | 'exit-unlocked' | 'victory';
  readonly value?: number;
};

interface CellPlacement extends CellCoordinate { readonly amount?: number }
interface LevelInteractionDefinition {
  readonly health: CellPlacement;
  readonly key: CellPlacement;
  readonly energy: CellPlacement;
  readonly door: CellCoordinate;
  readonly checkpoint: CellCoordinate;
}

export const LEVEL_INTERACTION_DEFINITIONS: Readonly<Record<Chapter01LevelId, LevelInteractionDefinition>> = {
  'level-001': { health: { column: 5, row: 3, amount: 25 }, key: { column: 7, row: 5 }, energy: { column: 9, row: 7, amount: 35 }, door: { column: 7, row: 8 }, checkpoint: { column: 11, row: 9 } },
  'level-002': { health: { column: 3, row: 3, amount: 24 }, key: { column: 3, row: 7 }, energy: { column: 11, row: 5, amount: 34 }, door: { column: 5, row: 8 }, checkpoint: { column: 9, row: 9 } },
  'level-003': { health: { column: 11, row: 3, amount: 23 }, key: { column: 11, row: 5 }, energy: { column: 7, row: 7, amount: 33 }, door: { column: 3, row: 10 }, checkpoint: { column: 7, row: 11 } },
  'level-004': { health: { column: 1, row: 5, amount: 22 }, key: { column: 5, row: 9 }, energy: { column: 1, row: 7, amount: 32 }, door: { column: 7, row: 12 }, checkpoint: { column: 11, row: 11 } },
  'level-005': { health: { column: 9, row: 5, amount: 22 }, key: { column: 9, row: 11 }, energy: { column: 11, row: 7, amount: 31 }, door: { column: 9, row: 12 }, checkpoint: { column: 5, row: 11 } },
  'level-006': { health: { column: 5, row: 7, amount: 21 }, key: { column: 3, row: 11 }, energy: { column: 3, row: 9, amount: 30 }, door: { column: 1, row: 10 }, checkpoint: { column: 7, row: 13 } },
  'level-007': { health: { column: 13, row: 7, amount: 20 }, key: { column: 11, row: 7 }, energy: { column: 9, row: 9, amount: 29 }, door: { column: 13, row: 10 }, checkpoint: { column: 3, row: 11 } },
  'level-008': { health: { column: 3, row: 9, amount: 20 }, key: { column: 7, row: 11 }, energy: { column: 5, row: 11, amount: 28 }, door: { column: 11, row: 10 }, checkpoint: { column: 9, row: 13 } },
  'level-009': { health: { column: 11, row: 9, amount: 19 }, key: { column: 5, row: 13 }, energy: { column: 11, row: 11, amount: 27 }, door: { column: 1, row: 12 }, checkpoint: { column: 3, row: 13 } },
  'level-010': { health: { column: 7, row: 9, amount: 30 }, key: { column: 9, row: 13 }, energy: { column: 3, row: 13, amount: 40 }, door: { column: 13, row: 12 }, checkpoint: { column: 11, row: 13 } },
};

function assertValidDefinition(levelId: Chapter01LevelId, definition: LevelInteractionDefinition): void {
  const placements = [definition.health, definition.key, definition.energy, definition.door, definition.checkpoint];
  const identities = placements.map((cell) => `${cell.column},${cell.row}`);
  if (new Set(identities).size !== identities.length) throw new Error(`${levelId} interaction placements overlap`);
  for (const cell of placements) {
    if (cellAt(cell.column, cell.row, levelId) === '#') throw new Error(`${levelId} interaction placement enters a wall`);
  }
}

export function createLevelRuntime(
  levelId: Chapter01LevelId = 'level-001', encounter: EncounterId = 'campaign',
): LevelRuntimeState {
  const definition = LEVEL_INTERACTION_DEFINITIONS[levelId];
  assertValidDefinition(levelId, definition);
  const door = cellCenter(definition.door.column, definition.door.row);
  const checkpoint = cellCenter(definition.checkpoint.column, definition.checkpoint.row);
  const exitCell = findCell('E', levelId);
  const exit = cellCenter(exitCell.column, exitCell.row);
  const pickupDefinitions = [
    { id: 'repair-kit', kind: 'health' as const, ...definition.health, amount: definition.health.amount ?? 25 },
    { id: 'workshop-key', kind: 'key' as const, ...definition.key, amount: 0 },
    { id: 'pulse-cell', kind: 'energy' as const, ...definition.energy, amount: definition.energy.amount ?? 35 },
  ];
  const conveyorPoint = cellCenter(9, 7);
  const hazards: HazardRuntimeState[] = levelId === 'level-006' ? [{
    id: 'hazard-006', kind: 'conveyor', x: conveyorPoint.x, z: conveyorPoint.z,
    halfWidth: 1.15, halfDepth: 4.25, directionX: 0, directionZ: 1,
    periodTicks: 180, activeTicks: 120, phaseOffsetTicks: 0, active: true,
  }] : [];
  return {
    pickups: pickupDefinitions.map((pickup) => {
      const point = cellCenter(pickup.column, pickup.row);
      return { id: pickup.id, kind: pickup.kind, x: point.x, z: point.z, amount: pickup.amount, active: true };
    }),
    hazards,
    door: {
      id: 'workshop-lock', keyId: 'workshop-key', column: definition.door.column, row: definition.door.row,
      x: door.x, z: door.z, open: false,
    },
    checkpoint: {
      id: levelId === 'level-001' ? 'checkpoint-before-exit' : `checkpoint-${levelId.slice(-3)}`,
      x: checkpoint.x, z: checkpoint.z, activated: false,
    },
    exit,
    encounter: { waveIndex: 0, waveCount: encounter === 'campaign' ? campaignRobotWaves(levelId).length : 1, pendingTicks: 0 },
    keyCollected: false,
    objectiveComplete: false,
  };
}

export function queueNextEncounterWave(level: LevelRuntimeState): boolean {
  if (level.encounter.pendingTicks > 0 || level.encounter.waveIndex + 1 >= level.encounter.waveCount) return false;
  level.encounter.pendingTicks = 45;
  return true;
}

export function stepEncounterWaves(
  robots: RobotState[], level: LevelRuntimeState, levelId: Chapter01LevelId,
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
  player: PlayerState, level: LevelRuntimeState, tick: number, levelId: Chapter01LevelId,
): void {
  for (const hazard of level.hazards) {
    const phase = (tick + hazard.phaseOffsetTicks) % hazard.periodTicks;
    hazard.active = phase < hazard.activeTicks;
    if (!hazard.active || Math.abs(player.x - hazard.x) > hazard.halfWidth || Math.abs(player.z - hazard.z) > hazard.halfDepth) continue;
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

export function closedDoorCells(level: LevelRuntimeState): readonly CellCoordinate[] {
  return level.door.open ? [] : [{ column: level.door.column, row: level.door.row }];
}

function near(player: PlayerState, x: number, z: number, radius: number): boolean {
  return Math.hypot(player.x - x, player.z - z) <= radius;
}

export function openNearbyDoor(player: PlayerState, level: LevelRuntimeState): LevelInteractionEvent | null {
  if (level.door.open || !level.keyCollected || !near(player, level.door.x, level.door.z, 2.15)) return null;
  level.door.open = true;
  return { type: 'door-opened' };
}

export function collectLevelInteractions(player: PlayerState, level: LevelRuntimeState): LevelInteractionEvent[] {
  const events: LevelInteractionEvent[] = [];
  for (const pickup of level.pickups) {
    if (!pickup.active || !near(player, pickup.x, pickup.z, 0.82)) continue;
    if (pickup.kind === 'health' && player.health >= 100) continue;
    if (pickup.kind === 'energy' && player.energy >= 100) continue;
    pickup.active = false;
    if (pickup.kind === 'key') {
      level.keyCollected = true;
      events.push({ type: 'key-collected' });
    } else if (pickup.kind === 'health') {
      const recovered = Math.min(pickup.amount, 100 - player.health);
      player.health += recovered;
      events.push({ type: 'health-collected', value: recovered });
    } else {
      const recovered = Math.min(pickup.amount, 100 - player.energy);
      player.energy += recovered;
      events.push({ type: 'energy-collected', value: recovered });
    }
  }
  if (!level.checkpoint.activated && near(player, level.checkpoint.x, level.checkpoint.z, 0.95)) {
    level.checkpoint.activated = true;
    events.push({ type: 'checkpoint-activated' });
  }
  return events;
}

export function completePrimaryObjective(level: LevelRuntimeState): LevelInteractionEvent[] {
  if (level.objectiveComplete) return [];
  level.objectiveComplete = true;
  return [{ type: 'objective-complete' }, { type: 'exit-unlocked' }];
}

export function reachedUnlockedExit(player: PlayerState, level: LevelRuntimeState): boolean {
  return level.objectiveComplete && near(player, level.exit.x, level.exit.z, 0.95);
}
