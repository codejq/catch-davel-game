import { describe, expect, it } from 'vitest';
import {
  CHARGED_SWORD_ARC_DURATION_TICKS, SWORD_ARC_CAPACITY, SWORD_ARC_DURATION_TICKS,
  SwordArcTracker, createSwordArcEffect, swordArcSegment,
} from '../src/render/sword-arc';

describe('bounded raw-WebGL2 sword edge arc', () => {
  const player = { x: 3, z: -4, yaw: 0.7, pitch: -0.08 };

  it('creates deterministic finite fast and charged edge segments', () => {
    const fast = createSwordArcEffect(20, false, player);
    const charged = createSwordArcEffect(20, true, player);
    const fastSegment = swordArcSegment(fast, 24, 2, 6, 1)!;
    const chargedSegment = swordArcSegment(charged, 24, 2, 6, 1)!;
    expect(fastSegment).toEqual(swordArcSegment(fast, 24, 2, 6, 1));
    expect(Object.values(fastSegment.start).every(Number.isFinite)).toBe(true);
    expect(Object.values(fastSegment.end).every(Number.isFinite)).toBe(true);
    expect(chargedSegment.radius).toBeGreaterThan(fastSegment.radius);
    expect(swordArcSegment(fast, 20 + SWORD_ARC_DURATION_TICKS, 0, 4, 1)).toBeNull();
    expect(swordArcSegment(charged, 20 + CHARGED_SWORD_ARC_DURATION_TICKS, 0, 4, 1)).toBeNull();
  });

  it('keeps a stable readable edge when motion is disabled', () => {
    const effect = createSwordArcEffect(10, false, player);
    const early = swordArcSegment(effect, 11, 1, 4, 0)!;
    const later = swordArcSegment(effect, 17, 1, 4, 0)!;
    expect(early.start).toEqual(later.start);
    expect(early.end).toEqual(later.end);
    expect(later.radius).toBeLessThan(early.radius);
  });

  it('deduplicates, bounds, expires, clears, and rewind-clears arcs', () => {
    const tracker = new SwordArcTracker();
    const first = createSwordArcEffect(1, false, player);
    tracker.emit(first);
    tracker.emit(first);
    expect(tracker.update(1)).toHaveLength(1);
    for (let tick = 2; tick <= SWORD_ARC_CAPACITY + 2; tick += 1) {
      tracker.emit(createSwordArcEffect(tick, tick % 2 === 0, player));
    }
    expect(tracker.update(SWORD_ARC_CAPACITY + 2)).toHaveLength(SWORD_ARC_CAPACITY);
    expect(tracker.update(0)).toHaveLength(0);
    tracker.emit(createSwordArcEffect(20, false, player));
    expect(tracker.update(20)).toHaveLength(1);
    tracker.clear();
    expect(tracker.update(20)).toHaveLength(0);
  });
});
