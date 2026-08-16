import { describe, expect, it } from 'vitest';
import { WEAPON_MASK } from '../src/sim/weapons';
import { nextUnlockedWeapon, touchFireHeld, virtualStickVector } from '../src/runtime/touch-input';

describe('mobile touch input projection', () => {
  it('maps and clamps a virtual stick into the shared movement command axes', () => {
    expect(virtualStickVector(0, 0, 50)).toEqual({ strafe: 0, forward: 0, visualX: 0, visualY: 0 });
    const forwardRight = virtualStickVector(50, -50, 50);
    expect(Math.hypot(forwardRight.visualX, forwardRight.visualY)).toBeCloseTo(50);
    expect(forwardRight.forward).toBeCloseTo(Math.SQRT1_2);
    expect(forwardRight.strafe).toBeCloseTo(Math.SQRT1_2);
    expect(virtualStickVector(3, 2, 50).forward).toBe(0);
    expect(virtualStickVector(10, 0, 50, 0.25).strafe).toBe(0);
    expect(() => virtualStickVector(0, 0, 50, 1)).toThrow(/dead zone/);
  });

  it('supports hold and toggle firing without synthesizing extra attacks', () => {
    expect(touchFireHeld(false, 'hold', 'press')).toBe(true);
    expect(touchFireHeld(true, 'hold', 'release')).toBe(false);
    expect(touchFireHeld(false, 'toggle', 'press')).toBe(true);
    expect(touchFireHeld(true, 'toggle', 'release')).toBe(true);
    expect(touchFireHeld(true, 'toggle', 'press')).toBe(false);
  });

  it('cycles only through weapons present in the authoritative unlock mask', () => {
    const mask = WEAPON_MASK.pulse | WEAPON_MASK.bomb | WEAPON_MASK.laser;
    expect(nextUnlockedWeapon('pulse', mask)).toBe('bomb');
    expect(nextUnlockedWeapon('bomb', mask)).toBe('laser');
    expect(nextUnlockedWeapon('laser', mask)).toBe('pulse');
    expect(nextUnlockedWeapon('pulse', WEAPON_MASK.pulse)).toBe('pulse');
  });

  it('rejects non-finite geometry before it reaches command generation', () => {
    expect(() => virtualStickVector(Number.NaN, 0, 50)).toThrow(/finite/);
    expect(() => virtualStickVector(0, 0, 0)).toThrow(/positive radius/);
  });
});
