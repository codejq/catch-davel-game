import { PLAYER_EYE_HEIGHT } from '../sim/constants';

export const SWORD_ARC_DURATION_TICKS = 12;
export const CHARGED_SWORD_ARC_DURATION_TICKS = 18;
export const SWORD_ARC_CAPACITY = 4;

interface Point { readonly x: number; readonly y: number; readonly z: number }

export interface SwordArcEffect {
  readonly startTick: number;
  readonly charged: boolean;
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitch: number;
}

export interface SwordArcSegment {
  readonly start: Point;
  readonly end: Point;
  readonly radius: number;
}

type SwordArcPlayer = Pick<SwordArcEffect, 'x' | 'z' | 'yaw' | 'pitch'>;

export function createSwordArcEffect(
  startTick: number, charged: boolean, player: SwordArcPlayer,
): SwordArcEffect {
  return { startTick, charged, x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch };
}

function duration(effect: SwordArcEffect): number {
  return effect.charged ? CHARGED_SWORD_ARC_DURATION_TICKS : SWORD_ARC_DURATION_TICKS;
}

function easeInOut(value: number): number {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function arcPoint(effect: SwordArcEffect, angle: number): Point {
  const cosPitch = Math.cos(effect.pitch);
  const forward = {
    x: Math.sin(effect.yaw) * cosPitch,
    y: Math.sin(effect.pitch),
    z: -Math.cos(effect.yaw) * cosPitch,
  };
  const right = { x: Math.cos(effect.yaw), z: Math.sin(effect.yaw) };
  const reach = effect.charged ? 1.12 : 0.9;
  const radius = effect.charged ? 0.72 : 0.58;
  const rightOffset = Math.sin(angle) * radius;
  const verticalOffset = Math.cos(angle) * radius * 0.72;
  const depthOffset = Math.cos(angle) * 0.08;
  return {
    x: effect.x + forward.x * (reach + depthOffset) + right.x * rightOffset,
    y: PLAYER_EYE_HEIGHT - 0.42 + forward.y * reach + verticalOffset,
    z: effect.z + forward.z * (reach + depthOffset) + right.z * rightOffset,
  };
}

export function swordArcSegment(
  effect: SwordArcEffect,
  tick: number,
  segmentIndex: number,
  segmentCount: number,
  motionScale: number,
): SwordArcSegment | null {
  const age = tick - effect.startTick;
  const effectDuration = duration(effect);
  if (age < 0 || age >= effectDuration || segmentIndex < 0 || segmentIndex >= segmentCount || segmentCount < 2) return null;
  const progress = age / effectDuration;
  const motion = Number.isFinite(motionScale) ? Math.max(0, Math.min(1, motionScale)) : 0;
  const sweep = (-1.05 + easeInOut(progress) * 2.1) * motion;
  const span = effect.charged ? 1.18 : 0.88;
  const step = span / segmentCount;
  const overlap = step * 0.32;
  const startAngle = sweep - span * 0.5 + step * segmentIndex - overlap;
  const endAngle = sweep - span * 0.5 + step * (segmentIndex + 1) + overlap;
  const fade = 1 - progress * 0.58;
  return {
    start: arcPoint(effect, startAngle),
    end: arcPoint(effect, endAngle),
    radius: (effect.charged ? 0.04 : 0.028) * fade,
  };
}

export class SwordArcTracker {
  private effects: SwordArcEffect[] = [];
  private lastTick: number | null = null;

  emit(effect: SwordArcEffect): void {
    if (this.effects.some((candidate) => (
      candidate.startTick === effect.startTick && candidate.charged === effect.charged
    ))) return;
    this.effects.push(effect);
    if (this.effects.length > SWORD_ARC_CAPACITY) this.effects.shift();
  }

  update(tick: number): readonly SwordArcEffect[] {
    if (this.lastTick !== null && tick < this.lastTick) this.effects = [];
    this.lastTick = tick;
    this.effects = this.effects.filter((effect) => tick - effect.startTick < duration(effect));
    return this.effects.filter((effect) => tick >= effect.startTick);
  }

  clear(): void {
    this.effects = [];
    this.lastTick = null;
  }
}
