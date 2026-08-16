import { describe, expect, it } from 'vitest';
import {
  BOMB_DETONATION_CAPACITY, BOMB_DETONATION_DURATION_TICKS, BombDetonationTracker,
  bombFlashRadius, bombPressureRingSegment, bombRadialSparkSegment, type BombDetonationEffect,
} from '../src/render/bomb-detonation';
import { BOMB_BLAST_RADIUS } from '../src/sim/combat';

const effect = (bombId: number, startTick: number): BombDetonationEffect => ({
  bombId, startTick, x: 4, y: 0.16, z: 7,
});

describe('bounded raw-WebGL2 pulse-bomb detonation', () => {
  it('expands a deterministic segmented pressure ring to the authoritative blast radius', () => {
    const detonation = effect(3, 100);
    const early = bombPressureRingSegment(detonation, 100, 0, 12, 1)!;
    const late = bombPressureRingSegment(detonation, 129, 0, 12, 1)!;
    expect(early).toEqual(bombPressureRingSegment(detonation, 100, 0, 12, 1));
    const earlyRadius = Math.hypot(early.start.x - detonation.x, early.start.z - detonation.z);
    const lateRadius = Math.hypot(late.start.x - detonation.x, late.start.z - detonation.z);
    expect(lateRadius).toBeGreaterThan(earlyRadius);
    expect(lateRadius).toBeLessThanOrEqual(BOMB_BLAST_RADIUS);
    expect(Object.values(late.start).every(Number.isFinite)).toBe(true);
    expect(bombPressureRingSegment(detonation, 130, 0, 12, 1)).toBeNull();
  });

  it('keeps a static semantic radius in reduced motion and suppresses only the flash at zero intensity', () => {
    const detonation = effect(2, 20);
    const reduced = bombPressureRingSegment(detonation, 20, 1, 6, 0)!;
    expect(Math.hypot(reduced.start.x - detonation.x, reduced.start.z - detonation.z)).toBeCloseTo(BOMB_BLAST_RADIUS);
    expect(bombRadialSparkSegment(detonation, 24, 0, 0)?.radius).toBeGreaterThan(0);
    expect(bombFlashRadius(detonation, 20, 0)).toBeNull();
    expect(bombFlashRadius(detonation, 20, 1)).toBeGreaterThan(0);
  });

  it('deduplicates, bounds, expires, clears, and rewind-clears detonation effects', () => {
    const tracker = new BombDetonationTracker();
    tracker.emit(effect(1, 1));
    tracker.emit(effect(1, 1));
    expect(tracker.update(0)).toEqual([]);
    expect(tracker.update(1)).toHaveLength(1);
    for (let index = 2; index <= BOMB_DETONATION_CAPACITY + 2; index += 1) tracker.emit(effect(index, index));
    expect(tracker.update(BOMB_DETONATION_CAPACITY + 2)).toHaveLength(BOMB_DETONATION_CAPACITY);
    expect(tracker.update(1)).toEqual([]);
    tracker.emit(effect(8, 8));
    expect(tracker.update(8 + BOMB_DETONATION_DURATION_TICKS)).toEqual([]);
    tracker.emit(effect(9, 50));
    tracker.clear();
    expect(tracker.update(50)).toEqual([]);
  });
});
