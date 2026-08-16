import { describe, expect, it } from 'vitest';
import { laserContactSparkSegment } from '../src/render/laser-contact';

describe('bounded raw-WebGL2 laser contact sparks', () => {
  const contact = { x: 3, y: 1.2, z: -4 };
  const beamDirection = { x: 0.6, y: 0, z: -0.8 };

  it('creates deterministic finite starburst segments at the beam endpoint', () => {
    const spark = laserContactSparkSegment(contact, beamDirection, 75, 3, 1, 60);
    expect(spark).toEqual(laserContactSparkSegment(contact, beamDirection, 75, 3, 1, 60));
    expect(Object.values(spark.start).every(Number.isFinite)).toBe(true);
    expect(Object.values(spark.end).every(Number.isFinite)).toBe(true);
    expect(spark.radius).toBeGreaterThan(0);
    expect(Math.hypot(
      spark.end.x - contact.x, spark.end.y - contact.y, spark.end.z - contact.z,
    )).toBeLessThan(0.5);
  });

  it('keeps a stable visible contact cue when motion is disabled', () => {
    const first = laserContactSparkSegment(contact, beamDirection, 20, 1, 0, 20);
    const later = laserContactSparkSegment(contact, beamDirection, 80, 1, 0, 20);
    expect(later).toEqual(first);
    expect(first.radius).toBeGreaterThan(0);
    expect(first.end).not.toEqual(contact);
  });

  it('grows the bounded spark slightly as focus escalates', () => {
    const unfocused = laserContactSparkSegment(contact, beamDirection, 16, 0, 1, 0);
    const focused = laserContactSparkSegment(contact, beamDirection, 16, 0, 1, 90);
    expect(focused.radius).toBeGreaterThan(unfocused.radius);
    expect(focused.radius).toBeLessThanOrEqual(0.032);
  });
});
