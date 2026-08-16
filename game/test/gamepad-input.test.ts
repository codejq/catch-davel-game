import { describe, expect, it } from 'vitest';
import { projectStandardGamepad, type GamepadButtonLike } from '../src/runtime/gamepad-input';

const buttons = (pressed: readonly number[]): GamepadButtonLike[] => Array.from({ length: 16 }, (_, index) => ({
  pressed: pressed.includes(index), value: pressed.includes(index) ? 1 : 0,
}));

describe('standard gamepad projection', () => {
  it('dead-zones analog axes and maps standard buttons into shared human actions', () => {
    expect(projectStandardGamepad(null).connected).toBe(false);
    const quiet = projectStandardGamepad({ connected: true, axes: [0.1, -0.1, 0, 0], buttons: buttons([]) });
    expect(quiet).toMatchObject({ forward: 0, strafe: 0, sprint: false, dash: false, fire: false, altFire: false });
    const active = projectStandardGamepad({ connected: true, axes: [0.59, -1, 0.59, -0.59], buttons: buttons([1, 7, 6, 5, 9, 10]) });
    expect(active.forward).toBe(1);
    expect(active.strafe).toBeCloseTo(0.5);
    expect(active.yawDelta).toBeCloseTo(0.0325);
    expect(active.pitchDelta).toBeCloseTo(0.025);
    expect(active).toMatchObject({ sprint: true, dash: true, fire: true, altFire: true, cycleWeapon: true, campaign: true, shop: false });
  });
});
