import { describe, expect, it } from 'vitest';
import { objectiveCompassReading, type ObjectiveCompassInput } from '../src/runtime/objective-compass';

function state(): ObjectiveCompassInput {
  return {
    victory: false,
    player: { x: 0, z: 0, yaw: 0 },
    level: {
      pickups: [{ kind: 'key', x: 3, z: -4, active: true }],
      door: { x: 8, z: 0, open: false },
      checkpoint: { x: 12, z: 0, activated: false },
      exit: { x: 0, z: 20 },
      objectiveComplete: false,
    },
  };
}

describe('human objective compass', () => {
  it('guides only through authored progression objects in stable order', () => {
    const initial = state();
    expect(objectiveCompassReading(initial)).toMatchObject({ target: 'key', distanceMeters: 5 });
    const withoutKey = { ...initial, level: { ...initial.level, pickups: [] } };
    expect(objectiveCompassReading(withoutKey)?.target).toBe('door');
    const throughDoor = { ...withoutKey, level: { ...withoutKey.level, door: { ...withoutKey.level.door, open: true } } };
    expect(objectiveCompassReading(throughDoor)?.target).toBe('checkpoint');
    const complete = { ...throughDoor, level: { ...throughDoor.level, objectiveComplete: true } };
    expect(objectiveCompassReading(complete)?.target).toBe('exit');
    expect(objectiveCompassReading({ ...complete, victory: true })).toBeNull();
  });

  it('reports a normalized camera-relative bearing without robot information', () => {
    const reading = objectiveCompassReading(state());
    expect(reading?.bearingRadians).toBeCloseTo(Math.atan2(3, 4));
    const turned = objectiveCompassReading({ ...state(), player: { x: 0, z: 0, yaw: Math.PI } });
    expect(turned?.bearingRadians).toBeCloseTo(Math.atan2(3, 4) - Math.PI);
  });
});
