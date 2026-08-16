import type { RenderProjectileState } from './render-model';

export interface ProjectileWakeSegment {
  readonly start: { readonly x: number; readonly y: number; readonly z: number };
  readonly end: { readonly x: number; readonly y: number; readonly z: number };
  readonly radius: number;
  readonly color: readonly [number, number, number];
  readonly emission: number;
}

const WAKE_STYLE: Readonly<Record<RenderProjectileState['kind'], {
  readonly length: number;
  readonly radius: number;
  readonly color: readonly [number, number, number];
}>> = {
  fireball: { length: 0.82, radius: 0.15, color: [1, 0.08, 0.02] },
  'slider-bolt': { length: 0.64, radius: 0.08, color: [0.12, 0.72, 1] },
  'beat-bolt': { length: 0.68, radius: 0.075, color: [1, 0.18, 0.72] },
};

/** Two tapered, world-space segments make travel direction readable without a screen overlay. */
export function projectileWakeSegments(projectile: RenderProjectileState): readonly ProjectileWakeSegment[] {
  const speed = Math.hypot(projectile.velocityX, projectile.velocityY, projectile.velocityZ);
  if (!Number.isFinite(speed) || speed <= 0.0001) return [];
  const style = WAKE_STYLE[projectile.kind];
  const directionX = projectile.velocityX / speed;
  const directionY = projectile.velocityY / speed;
  const directionZ = projectile.velocityZ / speed;
  const point = (distance: number) => ({
    x: projectile.x - directionX * distance,
    y: projectile.y - directionY * distance,
    z: projectile.z - directionZ * distance,
  });
  const middle = point(style.length * 0.58);
  return [
    {
      start: middle,
      end: point(0),
      radius: style.radius,
      color: style.color,
      emission: 1.25,
    },
    {
      start: point(style.length),
      end: middle,
      radius: style.radius * 0.58,
      color: style.color,
      emission: 0.72,
    },
  ];
}
