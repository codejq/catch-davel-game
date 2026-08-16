import type { RenderProjectileState } from './render-model';
import type { CoinBurstEffect } from './coin-burst';

export const MECHANICAL_FRAGMENT_DURATION_TICKS = 36;

interface Point { readonly x: number; readonly y: number; readonly z: number }

export interface MechanicalFragmentSegment {
  readonly start: Point;
  readonly end: Point;
  readonly radius: number;
}

export function mechanicalFragmentSegment(
  effect: CoinBurstEffect,
  tick: number,
  fragmentIndex: number,
  motionScale: number,
): MechanicalFragmentSegment | null {
  const age = tick - effect.startTick;
  if (age < 0 || age >= MECHANICAL_FRAGMENT_DURATION_TICKS) return null;
  const progress = age / MECHANICAL_FRAGMENT_DURATION_TICKS;
  const motion = Math.max(0, Math.min(1, motionScale));
  const launchAngle = effect.robotId * 1.618034 + fragmentIndex * 2.399963;
  const radial = progress * (0.72 + fragmentIndex * 0.16) * motion;
  const center = {
    x: effect.x + Math.cos(launchAngle) * radial,
    y: 0.86 + Math.sin(progress * Math.PI) * (0.62 + fragmentIndex * 0.08) * motion - progress * 0.48,
    z: effect.z + Math.sin(launchAngle) * radial,
  };
  const rotation = launchAngle + progress * (4.2 + fragmentIndex * 0.7) * motion;
  const halfLength = 0.12 * (1 - progress * 0.42);
  const vertical = Math.sin(rotation * 0.73) * halfLength;
  const horizontalX = Math.cos(rotation) * halfLength;
  const horizontalZ = Math.sin(rotation) * halfLength;
  return {
    start: { x: center.x - horizontalX, y: center.y - vertical, z: center.z - horizontalZ },
    end: { x: center.x + horizontalX, y: center.y + vertical, z: center.z + horizontalZ },
    radius: 0.038 * (1 - progress * 0.5),
  };
}

type Fireball = Pick<RenderProjectileState,
  'id' | 'x' | 'y' | 'z' | 'velocityX' | 'velocityY' | 'velocityZ' | 'lifeTicks'>;

export interface SmokePuff extends Point {
  readonly radius: number;
  readonly color: readonly [number, number, number];
}

export function fireballSmokePuff(
  projectile: Fireball,
  puffIndex: number,
  motionScale: number,
): SmokePuff {
  const speed = Math.max(0.001, Math.hypot(projectile.velocityX, projectile.velocityY, projectile.velocityZ));
  const directionX = projectile.velocityX / speed;
  const directionY = projectile.velocityY / speed;
  const directionZ = projectile.velocityZ / speed;
  const motion = Math.max(0, Math.min(1, motionScale));
  const distance = 0.2 + puffIndex * 0.18;
  const curl = Math.sin(projectile.id * 1.71 + projectile.lifeTicks * 0.19 + puffIndex * 2.07) * 0.055 * motion;
  const heat = 1 - puffIndex / 4;
  return {
    x: projectile.x - directionX * distance - directionZ * curl,
    y: projectile.y - directionY * distance + puffIndex * 0.045 * motion,
    z: projectile.z - directionZ * distance + directionX * curl,
    radius: 0.1 + puffIndex * 0.035,
    color: [0.2 + heat * 0.2, 0.16 + heat * 0.09, 0.18 + heat * 0.035],
  };
}
