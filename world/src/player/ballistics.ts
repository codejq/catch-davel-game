import type { CollisionWorld, Vec3 } from '../core/collision';
import { raySentry, type SentryState } from '../enemies/sentry';

export const MUZZLE_VELOCITY = 820;
export const GRAVITY = 9.81;
export const ZERO_RANGE = 100;
export const MAX_FLIGHT_SECONDS = 2.2;

export interface Bullet {
  position: Vec3;
  velocity: Vec3;
  age: number;
  alive: boolean;
  /** Previous positions for drawing a short tracer. */
  readonly trail: Vec3[];
}

export type BulletImpact =
  | { readonly kind: 'sentry'; readonly sentry: SentryState; readonly headshot: boolean; readonly point: Vec3; readonly distance: number }
  | { readonly kind: 'world'; readonly point: Vec3; readonly surface: 'terrain' | 'solid' | 'glass' | 'tree' };

/** Upward angle that makes the bullet cross the line of sight again at the zero range. */
export function zeroAngle(range = ZERO_RANGE): number {
  const time = range / MUZZLE_VELOCITY;
  return Math.atan2(0.5 * GRAVITY * time * time, range);
}

export function fireBullet(origin: Vec3, direction: Vec3): Bullet {
  const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
  const dx = direction.x / length; const dy = direction.y / length; const dz = direction.z / length;
  // Tilt the bore up by the zero angle in the vertical plane of the shot.
  const angle = zeroAngle();
  const horizontal = Math.hypot(dx, dz);
  const pitch = Math.atan2(dy, horizontal) + angle;
  const scale = horizontal > 1e-6 ? 1 / horizontal : 0;
  const vx = Math.cos(pitch) * dx * scale; const vz = Math.cos(pitch) * dz * scale;
  return {
    position: { ...origin },
    velocity: { x: vx * MUZZLE_VELOCITY, y: Math.sin(pitch) * MUZZLE_VELOCITY, z: vz * MUZZLE_VELOCITY },
    age: 0, alive: true, trail: [{ ...origin }],
  };
}

/** Advances a bullet one step, testing the swept segment against the world and every sentry. */
export function stepBullet(bullet: Bullet, dt: number, world: CollisionWorld, sentries: readonly SentryState[]): BulletImpact | null {
  if (!bullet.alive) return null;
  bullet.age += dt;
  const start = { ...bullet.position };
  bullet.velocity.y -= GRAVITY * dt;
  const segment = { x: bullet.velocity.x * dt, y: bullet.velocity.y * dt, z: bullet.velocity.z * dt };
  const length = Math.hypot(segment.x, segment.y, segment.z);
  const direction = { x: segment.x / length, y: segment.y / length, z: segment.z / length };
  let best: BulletImpact | null = null;
  let bestDistance = length;
  for (const sentry of sentries) {
    const hit = raySentry(start, direction, sentry);
    if (hit !== null && hit.distance <= bestDistance) {
      bestDistance = hit.distance;
      best = {
        kind: 'sentry', sentry, headshot: hit.headshot, distance: hit.distance,
        point: { x: start.x + direction.x * hit.distance, y: start.y + direction.y * hit.distance, z: start.z + direction.z * hit.distance },
      };
    }
  }
  // Bullets pass straight through window glass.
  const worldHit = world.raycast(start, direction, bestDistance, (volume) => volume.tag === 'glass');
  if (worldHit !== null && worldHit.distance < bestDistance) {
    best = {
      kind: 'world', point: worldHit.point,
      surface: worldHit.volume === null ? 'terrain' : worldHit.volume.tag === 'tree' ? 'tree' : 'solid',
    };
  }
  bullet.position.x = start.x + segment.x;
  bullet.position.y = start.y + segment.y;
  bullet.position.z = start.z + segment.z;
  bullet.trail.push({ ...bullet.position });
  if (bullet.trail.length > 4) bullet.trail.shift();
  if (best !== null || bullet.age > MAX_FLIGHT_SECONDS) bullet.alive = false;
  return best;
}
