import { describe, expect, it } from 'vitest';
import {
  AutoQualityController, initialRenderQuality, normalizeRenderQuality, RENDER_QUALITY_PROFILES,
} from '../src/render/quality';

describe('presentation-only render quality', () => {
  it('selects a conservative initial tier from presentation capabilities', () => {
    expect(initialRenderQuality({ deviceMemoryGiB: 4, hardwareConcurrency: 8, coarsePointer: false, viewportPixels: 2_000_000 })).toBe('low');
    expect(initialRenderQuality({ deviceMemoryGiB: 8, hardwareConcurrency: 8, coarsePointer: false, viewportPixels: 2_000_000 })).toBe('medium');
    expect(initialRenderQuality({ deviceMemoryGiB: 16, hardwareConcurrency: 12, coarsePointer: false, viewportPixels: 2_000_000 })).toBe('high');
    expect(RENDER_QUALITY_PROFILES.low.pixelRatioCap).toBeLessThan(RENDER_QUALITY_PROFILES.high.pixelRatioCap);
    expect(RENDER_QUALITY_PROFILES.low.fireSmokeCount).toBeLessThan(RENDER_QUALITY_PROFILES.high.fireSmokeCount);
    expect(RENDER_QUALITY_PROFILES.low.defeatFragmentCount).toBeLessThan(RENDER_QUALITY_PROFILES.high.defeatFragmentCount);
    expect(RENDER_QUALITY_PROFILES.low.coinBurstCount).toBeLessThan(RENDER_QUALITY_PROFILES.high.coinBurstCount);
    expect(RENDER_QUALITY_PROFILES.low.bombPressureRingSegments).toBeLessThan(RENDER_QUALITY_PROFILES.high.bombPressureRingSegments);
    expect(RENDER_QUALITY_PROFILES.low.bombSparkCount).toBeLessThan(RENDER_QUALITY_PROFILES.high.bombSparkCount);
    expect(RENDER_QUALITY_PROFILES.low.laserContactSparkCount)
      .toBeLessThan(RENDER_QUALITY_PROFILES.high.laserContactSparkCount);
    expect(RENDER_QUALITY_PROFILES.low.swordArcSegmentCount)
      .toBeLessThan(RENDER_QUALITY_PROFILES.high.swordArcSegmentCount);
    expect(() => normalizeRenderQuality('ultra')).toThrow(/quality/);
  });

  it('downgrades on sustained slow frames and upgrades only after sustained headroom', () => {
    const slow = new AutoQualityController('high');
    for (let frame = 0; frame <= 120; frame += 1) slow.sample(frame * 24);
    expect(slow.tier).toBe('medium');

    const fast = new AutoQualityController('low');
    for (let frame = 0; frame <= 360; frame += 1) fast.sample(frame * 12);
    expect(fast.tier).toBe('medium');
  });

  it('discards hidden or stalled frame intervals instead of overreacting', () => {
    const controller = new AutoQualityController('high');
    controller.sample(0);
    controller.sample(1_000, false);
    for (let frame = 1; frame < 120; frame += 1) controller.sample(1_000 + frame * 24);
    expect(controller.tier).toBe('high');
  });
});
