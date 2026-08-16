import type { PlayerState } from './player';
import { cellCenter, findCell, type CellCoordinate } from './level';

export type PickupKind = 'key' | 'health' | 'energy';

export interface PickupState {
  readonly id: string;
  readonly kind: PickupKind;
  readonly x: number;
  readonly z: number;
  readonly amount: number;
  active: boolean;
}

export interface LevelRuntimeState {
  readonly pickups: PickupState[];
  readonly door: {
    readonly id: 'workshop-lock';
    readonly keyId: 'workshop-key';
    readonly column: number;
    readonly row: number;
    readonly x: number;
    readonly z: number;
    open: boolean;
  };
  readonly checkpoint: {
    readonly id: 'checkpoint-before-exit';
    readonly x: number;
    readonly z: number;
    activated: boolean;
  };
  readonly exit: {
    readonly x: number;
    readonly z: number;
  };
  keyCollected: boolean;
  objectiveComplete: boolean;
}

export type LevelInteractionEvent = {
  readonly type: 'key-collected' | 'health-collected' | 'energy-collected' | 'door-opened'
    | 'checkpoint-activated' | 'objective-complete' | 'exit-unlocked' | 'victory';
  readonly value?: number;
};

const PICKUP_DEFINITIONS = [
  { id: 'repair-kit', kind: 'health', column: 5, row: 3, amount: 25 },
  { id: 'workshop-key', kind: 'key', column: 7, row: 5, amount: 0 },
  { id: 'pulse-cell', kind: 'energy', column: 9, row: 7, amount: 35 },
] as const;

const DOOR_CELL = { column: 7, row: 8 } as const;
const CHECKPOINT_CELL = { column: 11, row: 9 } as const;

export function createLevelRuntime(): LevelRuntimeState {
  const door = cellCenter(DOOR_CELL.column, DOOR_CELL.row);
  const checkpoint = cellCenter(CHECKPOINT_CELL.column, CHECKPOINT_CELL.row);
  const exitCell = findCell('E');
  const exit = cellCenter(exitCell.column, exitCell.row);
  return {
    pickups: PICKUP_DEFINITIONS.map((definition) => {
      const point = cellCenter(definition.column, definition.row);
      return { id: definition.id, kind: definition.kind, x: point.x, z: point.z, amount: definition.amount, active: true };
    }),
    door: {
      id: 'workshop-lock', keyId: 'workshop-key', column: DOOR_CELL.column, row: DOOR_CELL.row,
      x: door.x, z: door.z, open: false,
    },
    checkpoint: { id: 'checkpoint-before-exit', x: checkpoint.x, z: checkpoint.z, activated: false },
    exit,
    keyCollected: false,
    objectiveComplete: false,
  };
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
