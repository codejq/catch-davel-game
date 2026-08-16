import { describe, expect, it } from 'vitest';
import { projectileWakeSegments } from '../src/render/projectile-wake';
import type { RenderProjectileState } from '../src/render/render-model';

function projectile(kind: RenderProjectileState['kind'], velocityX = 8): RenderProjectileState {
  return {
    id: 1, ownerRobotId: 0, kind, x: 4, y: 1.2, z: 3,
    velocityX, velocityY: 0, velocityZ: 0, lifeTicks: 60,
  };
}

describe('world-space projectile travel wakes', () => {
  it('creates exactly two tapered segments behind every moving projectile kind', () => {
    for (const kind of ['slider-bolt', 'beat-bolt', 'fireball'] as const) {
      const segments = projectileWakeSegments(projectile(kind));
      expect(segments).toHaveLength(2);
      expect(segments[0]!.end).toEqual({ x: 4, y: 1.2, z: 3 });
      expect(segments[1]!.radius).toBeLessThan(segments[0]!.radius);
      expect(segments[1]!.emission).toBeLessThan(segments[0]!.emission);
      expect(segments.flatMap((segment) => [
        ...Object.values(segment.start), ...Object.values(segment.end), segment.radius, segment.emission,
      ]).every(Number.isFinite)).toBe(true);
    }
  });

  it('normalizes direction so difficulty speed changes do not stretch the visual cue', () => {
    const slow = projectileWakeSegments(projectile('slider-bolt', 4));
    const fast = projectileWakeSegments(projectile('slider-bolt', 12));
    expect(slow).toEqual(fast);
  });

  it('preserves velocity direction and suppresses invalid or stationary geometry', () => {
    const forward = projectileWakeSegments(projectile('beat-bolt', 8));
    const backward = projectileWakeSegments(projectile('beat-bolt', -8));
    expect(forward[1]!.start.x).toBeLessThan(4);
    expect(backward[1]!.start.x).toBeGreaterThan(4);
    expect(projectileWakeSegments(projectile('fireball', 0))).toEqual([]);
    expect(projectileWakeSegments(projectile('fireball', Number.NaN))).toEqual([]);
  });
});
