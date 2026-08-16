import { describe, expect, it } from 'vitest';
import {
  PROJECTILE_NEAR_MISS_MAX_REQUESTS, ProjectileNearMissTracker, type ProjectileNearMissSnapshot,
} from '../src/runtime/projectile-near-miss';

function projectile(id: number, x: number, z: number, kind: 'slider-bolt' | 'beat-bolt' | 'fireball' = 'slider-bolt') {
  return { id, kind, x, y: 1.2, z, velocityX: 8, velocityY: 0, velocityZ: 0 };
}

function snapshot(
  tick: number,
  projectiles: ProjectileNearMissSnapshot['projectiles'],
  overrides: Partial<ProjectileNearMissSnapshot> = {},
): ProjectileNearMissSnapshot {
  return {
    levelId: 'level-001', tick, player: { x: 0, z: 0 }, projectiles, victory: false, defeat: false,
    ...overrides,
  };
}

describe('snapshot-derived hostile projectile near misses', () => {
  it('primes silently then emits once after a projectile passes through the safe near-miss annulus', () => {
    const tracker = new ProjectileNearMissTracker();
    expect(tracker.sample(snapshot(10, [projectile(7, -0.4, 0.9)]))).toEqual([]);
    const requests = tracker.sample(snapshot(20, [projectile(7, 0.4, 0.9)]));
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      cue: 'projectile-near-miss', projectileId: 7, kind: 'slider-bolt', x: 0, z: 0.9,
    });
    expect(requests[0]!.gainScale).toBeGreaterThanOrEqual(0.34);
    expect(requests[0]!.gainScale).toBeLessThanOrEqual(0.68);
    expect(tracker.sample(snapshot(30, [projectile(7, 1.2, 0.9)]))).toEqual([]);
  });

  it('rejects collision paths, distant passes, and harmless overhead travel', () => {
    const tracker = new ProjectileNearMissTracker();
    tracker.sample(snapshot(1, [projectile(1, -1, 0.2), projectile(2, -1, 2)]));
    expect(tracker.sample(snapshot(2, [projectile(1, 1, 0.2), projectile(2, 1, 2)]))).toEqual([]);

    tracker.reset();
    const high = { ...projectile(3, -1, 0.9), y: 3 };
    tracker.sample(snapshot(3, [high]));
    expect(tracker.sample(snapshot(4, [{ ...high, x: 1 }]))).toEqual([]);
  });

  it('uses relative player/projectile travel and gives each projectile kind a stable pitch identity', () => {
    const tracker = new ProjectileNearMissTracker();
    tracker.sample(snapshot(1, [projectile(1, -1, 0.85, 'fireball')], { player: { x: -0.5, z: 0 } }));
    const fire = tracker.sample(snapshot(2, [projectile(1, 1, 0.85, 'fireball')], { player: { x: 0.5, z: 0 } }));
    expect(fire[0]).toMatchObject({ kind: 'fireball', pitchScale: 0.82 });

    tracker.reset();
    tracker.sample(snapshot(3, [projectile(2, -1, 0.85, 'beat-bolt')]));
    const beat = tracker.sample(snapshot(4, [projectile(2, 1, 0.85, 'beat-bolt')]));
    expect(beat[0]).toMatchObject({ kind: 'beat-bolt', pitchScale: 1.05 });
  });

  it('caps simultaneous cues by closest pass then stable ID', () => {
    const tracker = new ProjectileNearMissTracker();
    const before = [projectile(4, -1, 1), projectile(3, -1, 0.8), projectile(2, -1, 0.8)];
    const after = [projectile(4, 1, 1), projectile(3, 1, 0.8), projectile(2, 1, 0.8)];
    tracker.sample(snapshot(1, before));
    const requests = tracker.sample(snapshot(2, after));
    expect(requests).toHaveLength(PROJECTILE_NEAR_MISS_MAX_REQUESTS);
    expect(requests.map((request) => request.projectileId)).toEqual([2, 3]);
  });

  it('consumes disabled passes and silently reprimes across removal, rewind, level change, and reset', () => {
    const tracker = new ProjectileNearMissTracker();
    tracker.sample(snapshot(10, [projectile(1, -1, 0.9)]));
    expect(tracker.sample(snapshot(20, [projectile(1, 1, 0.9)]), false)).toEqual([]);
    expect(tracker.sample(snapshot(21, [projectile(1, 2, 0.9)]))).toEqual([]);
    expect(tracker.sample(snapshot(22, []))).toEqual([]);
    expect(tracker.sample(snapshot(5, [projectile(1, -1, 0.9)]))).toEqual([]);
    expect(tracker.sample(snapshot(6, [projectile(1, 1, 0.9)], { levelId: 'level-002' }))).toEqual([]);
    tracker.reset();
    expect(tracker.sample(snapshot(7, [projectile(1, 1, 0.9)]))).toEqual([]);
  });
});
