export type ObjectiveCompassTarget = 'key' | 'door' | 'checkpoint' | 'exit';

export interface ObjectiveCompassInput {
  readonly victory: boolean;
  readonly player: { readonly x: number; readonly z: number; readonly yaw: number };
  readonly level: {
    readonly pickups: readonly {
      readonly kind: 'key' | 'health' | 'energy' | 'coin';
      readonly x: number;
      readonly z: number;
      readonly active: boolean;
    }[];
    readonly door: { readonly x: number; readonly z: number; readonly open: boolean };
    readonly checkpoint: { readonly x: number; readonly z: number; readonly activated: boolean };
    readonly exit: { readonly x: number; readonly z: number };
    readonly objectiveComplete: boolean;
  };
}

export interface ObjectiveCompassReading {
  readonly target: ObjectiveCompassTarget;
  readonly bearingRadians: number;
  readonly distanceMeters: number;
}

function normalizedAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function objectiveCompassReading(state: ObjectiveCompassInput): ObjectiveCompassReading | null {
  if (state.victory) return null;
  const key = state.level.pickups.find((pickup) => pickup.kind === 'key' && pickup.active);
  const target = state.level.objectiveComplete
    ? { kind: 'exit' as const, ...state.level.exit }
    : key !== undefined
      ? { kind: 'key' as const, x: key.x, z: key.z }
      : !state.level.door.open
        ? { kind: 'door' as const, ...state.level.door }
        : !state.level.checkpoint.activated
          ? { kind: 'checkpoint' as const, ...state.level.checkpoint }
          : null;
  if (target === null) return null;
  const deltaX = target.x - state.player.x;
  const deltaZ = target.z - state.player.z;
  const worldYaw = Math.atan2(deltaX, -deltaZ);
  return {
    target: target.kind,
    bearingRadians: normalizedAngle(worldYaw - state.player.yaw),
    distanceMeters: Math.hypot(deltaX, deltaZ),
  };
}
