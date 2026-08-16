import { describe, expect, it } from 'vitest';
import {
  MECHANICAL_FRAGMENT_DURATION_TICKS, fireballSmokePuff, mechanicalFragmentSegment,
} from '../src/render/presentation-particles';

describe('bounded raw-WebGL2 presentation particles', () => {
  it('creates deterministic finite mechanical fragments for one bounded defeat window', () => {
    const effect = { robotId: 4, startTick: 100, x: 3, z: 5 };
    const segment = mechanicalFragmentSegment(effect, 112, 2, 1);
    expect(segment).toEqual(mechanicalFragmentSegment(effect, 112, 2, 1));
    expect(segment).not.toBeNull();
    expect(Object.values(segment!.start).every(Number.isFinite)).toBe(true);
    expect(Object.values(segment!.end).every(Number.isFinite)).toBe(true);
    expect(segment!.radius).toBeGreaterThan(0);
    expect(mechanicalFragmentSegment(effect, 100 + MECHANICAL_FRAGMENT_DURATION_TICKS, 2, 1)).toBeNull();
  });

  it('removes fragment scatter and arc exaggeration at zero motion', () => {
    const effect = { robotId: 2, startTick: 20, x: 7, z: 9 };
    const full = mechanicalFragmentSegment(effect, 30, 1, 1)!;
    const reduced = mechanicalFragmentSegment(effect, 30, 1, 0)!;
    const fullCenterX = (full.start.x + full.end.x) / 2;
    const reducedCenterX = (reduced.start.x + reduced.end.x) / 2;
    expect(reducedCenterX).toBeCloseTo(effect.x);
    expect(Math.abs(fullCenterX - effect.x)).toBeGreaterThan(0.01);
    expect(reduced.start.y).toBeLessThan(full.start.y);
  });

  it('places stable finite smoke puffs behind a moving fireball', () => {
    const projectile = {
      id: 9, x: 8, y: 1.2, z: 4, velocityX: 3, velocityY: 0.2, velocityZ: -4, lifeTicks: 80,
    };
    const near = fireballSmokePuff(projectile, 0, 1);
    const far = fireballSmokePuff(projectile, 2, 1);
    expect(near).toEqual(fireballSmokePuff(projectile, 0, 1));
    expect(Object.values(near).flat().every(Number.isFinite)).toBe(true);
    const nearTrailDot = (near.x - projectile.x) * projectile.velocityX
      + (near.y - projectile.y) * projectile.velocityY + (near.z - projectile.z) * projectile.velocityZ;
    expect(nearTrailDot).toBeLessThan(0);
    expect(far.radius).toBeGreaterThan(near.radius);
  });
});
