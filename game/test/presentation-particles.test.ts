import { describe, expect, it } from 'vitest';
import {
  MECHANICAL_FRAGMENT_DURATION_TICKS, PULSE_ENERGY_CELL_CAPACITY, PULSE_ENERGY_CELL_DURATION_TICKS,
  PulseEnergyCellTracker, createPulseEnergyCellEffect, fireballSmokePuff, mechanicalFragmentSegment,
  pulseEnergyCellSegment,
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

  it('ejects one deterministic finite pulse energy cell from the first-person weapon side', () => {
    const effect = createPulseEnergyCellEffect(40, { x: 3, z: 7, yaw: 0, pitch: 0 });
    const early = pulseEnergyCellSegment(effect, 41, 1)!;
    const late = pulseEnergyCellSegment(effect, 52, 1)!;
    expect(early).toEqual(pulseEnergyCellSegment(effect, 41, 1));
    expect(Object.values(late).flatMap((value) => (
      typeof value === 'object' ? Object.values(value) : [value]
    )).every(Number.isFinite)).toBe(true);
    expect(late.center.x).toBeGreaterThan(early.center.x);
    expect(pulseEnergyCellSegment(effect, 40 + PULSE_ENERGY_CELL_DURATION_TICKS, 1)).toBeNull();
  });

  it('keeps reduced-motion cell feedback visible while removing its exaggerated arc', () => {
    const effect = createPulseEnergyCellEffect(10, { x: 0, z: 0, yaw: 0.7, pitch: -0.1 });
    const full = pulseEnergyCellSegment(effect, 20, 1)!;
    const reduced = pulseEnergyCellSegment(effect, 20, 0)!;
    expect(full.center.y).toBeGreaterThan(reduced.center.y);
    expect(reduced.radius).toBeGreaterThan(0);
    expect(reduced.glowRadius).toBeGreaterThan(0);
  });

  it('deduplicates, bounds, expires, clears, and rewind-clears renderer-local cells', () => {
    const tracker = new PulseEnergyCellTracker();
    const player = { x: 0, z: 0, yaw: 0, pitch: 0 };
    tracker.emit(createPulseEnergyCellEffect(1, player));
    tracker.emit(createPulseEnergyCellEffect(1, player));
    expect(tracker.update(0)).toHaveLength(0);
    expect(tracker.update(1)).toHaveLength(1);
    for (let tick = 2; tick <= PULSE_ENERGY_CELL_CAPACITY + 2; tick += 1) {
      tracker.emit(createPulseEnergyCellEffect(tick, player));
    }
    expect(tracker.update(PULSE_ENERGY_CELL_CAPACITY + 2)).toHaveLength(PULSE_ENERGY_CELL_CAPACITY);
    expect(tracker.update(1)).toHaveLength(0);
    tracker.emit(createPulseEnergyCellEffect(5, player));
    expect(tracker.update(5)).toHaveLength(1);
    expect(tracker.update(5 + PULSE_ENERGY_CELL_DURATION_TICKS)).toHaveLength(0);
    tracker.emit(createPulseEnergyCellEffect(50, player));
    tracker.clear();
    expect(tracker.update(50)).toHaveLength(0);
  });
});
