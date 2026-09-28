import type { CollisionWorld, Vec3 } from '../core/collision';
import { raySentry, type SentryState } from '../enemies/sentry';

export const MUZZLE_VELOCITY = 820;
export const GRAVITY = 9.81;
export const ZERO_RANGE = 100;
export const MAX_FLIGHT_SECONDS = 2.2;

export interface Bullet {
  /** Which gun fired it: sets its damage. */
  readonly weapon: 'rifle' | 'carbine';
  position: Vec3;
  velocity: Vec3;
  age: number;
  alive: boolean;
  /** Previous positions for drawing a short tracer. */
  readonly trail: Vec3[];
}

/** Anything besides robots a bullet can hit: tanks, civilians, dogs. */
export interface HitTarget {
  readonly kind: 'tank' | 'civilian' | 'dog';
  readonly id: string;
  /** Distance along the (unit) direction to where the ray enters the target, or null for a miss. */
  hit(origin: Vec3, direction: Vec3): number | null;
}

export type BulletImpact =
  | { readonly kind: 'target'; readonly target: HitTarget; readonly point: Vec3; readonly distance: number }
  | { readonly kind: 'sentry'; readonly sentry: SentryState; readonly headshot: boolean; readonly point: Vec3; readonly distance: number }
  | { readonly kind: 'world'; readonly point: Vec3; readonly surface: 'terrain' | 'solid' | 'glass' | 'tree' };

/** Upward angle that makes the bullet cross the line of sight again at the zero range. */
export function zeroAngle(range = ZERO_RANGE): number {
  const time = range / MUZZLE_VELOCITY;
  return Math.atan2(0.5 * GRAVITY * time * time, range);
}

/** Fires a round. The rifle is zeroed at 100 m; the carbine is slower and zeroed where it points. */
export function fireBullet(origin: Vec3, direction: Vec3, weapon: 'rifle' | 'carbine' = 'rifle', speed = MUZZLE_VELOCITY): Bullet {
  const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
  const dx = direction.x / length; const dy = direction.y / length; const dz = direction.z / length;
  // Tilt the bore up by the zero angle in the vertical plane of the shot.
  const angle = weapon === 'rifle' ? zeroAngle() : 0;
  const horizontal = Math.hypot(dx, dz);
  const pitch = Math.atan2(dy, horizontal) + angle;
  const scale = horizontal > 1e-6 ? 1 / horizontal : 0;
  const vx = Math.cos(pitch) * dx * scale; const vz = Math.cos(pitch) * dz * scale;
  return {
    position: { ...origin },
    weapon,
    velocity: { x: vx * speed, y: Math.sin(pitch) * speed, z: vz * speed },
    age: 0, alive: true, trail: [{ ...origin }],
  };
}

/** Advances a bullet one step, testing the swept segment against the world and every sentry. */
export function stepBullet(bullet: Bullet, dt: number, world: CollisionWorld, sentries: readonly SentryState[], targets: readonly HitTarget[] = []): BulletImpact | null {
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
  for (const target of targets) {
    const distance = target.hit(start, direction);
    if (distance !== null && distance >= 0 && distance <= bestDistance) {
      bestDistance = distance;
      best = { kind: 'target', target, distance, point: { x: start.x + direction.x * distance, y: start.y + direction.y * distance, z: start.z + direction.z * distance } };
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
