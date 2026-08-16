import { describe, expect, it } from 'vitest';
import {
  PULSE_IMPACT_CAPACITY, PULSE_IMPACT_DURATION_TICKS, PulseImpactTracker,
  normalizePulseImpactKind, pulseImpactFlashRadius, pulseImpactSparkSegment, type PulseImpactEffect,
} from '../src/render/pulse-impact';
import { PULSE_IMPACT_KIND } from '../src/sim/combat';
import type { PulseImpactKind } from '../src/sim/combat';

const effect = (startTick: number, kind: PulseImpactKind = PULSE_IMPACT_KIND.wall): PulseImpactEffect => ({
  startTick, kind, x: 3.25, y: 1.42, z: -5.5,
});

describe('bounded raw-WebGL2 pulse contact sparks', () => {
  it('creates deterministic finite quality-scalable spark geometry', () => {
    const impact = effect(20);
    const first = pulseImpactSparkSegment(impact, 24, 0, 1)!;
    expect(first).toEqual(pulseImpactSparkSegment(impact, 24, 0, 1));
    expect(Object.values(first.start).every(Number.isFinite)).toBe(true);
    expect(Object.values(first.end).every(Number.isFinite)).toBe(true);
    expect(first.radius).toBeGreaterThan(0);
    expect(pulseImpactSparkSegment(impact, 20 + PULSE_IMPACT_DURATION_TICKS, 0, 1)).toBeNull();
  });

  it('keeps a stable semantic cue in reduced motion and obeys flash intensity', () => {
    const impact = effect(10, PULSE_IMPACT_KIND.robot);
    const early = pulseImpactSparkSegment(impact, 11, 1, 0)!;
    const later = pulseImpactSparkSegment(impact, 16, 1, 0)!;
    expect(early.end.x).toBe(later.end.x);
    expect(early.end.z).toBe(later.end.z);
    expect(pulseImpactFlashRadius(impact, 10, 0)).toBeNull();
    expect(pulseImpactFlashRadius(impact, 10, 1)).toBeGreaterThan(0);
    expect(normalizePulseImpactKind(99)).toBe(PULSE_IMPACT_KIND.range);
  });

  it('deduplicates, bounds, expires, clears, and rewind-clears effects', () => {
    const tracker = new PulseImpactTracker();
    tracker.emit(effect(1));
    tracker.emit(effect(1));
    expect(tracker.update(1)).toHaveLength(1);
    for (let tick = 2; tick <= PULSE_IMPACT_CAPACITY + 2; tick += 1) tracker.emit(effect(tick));
    expect(tracker.update(PULSE_IMPACT_CAPACITY + 2)).toHaveLength(PULSE_IMPACT_CAPACITY);
    expect(tracker.update(0)).toEqual([]);
    tracker.emit(effect(20));
    expect(tracker.update(20 + PULSE_IMPACT_DURATION_TICKS)).toEqual([]);
    tracker.emit(effect(50));
    tracker.clear();
    expect(tracker.update(50)).toEqual([]);
  });
});
