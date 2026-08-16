import { BOMB_BLAST_RADIUS } from '../sim/combat';

export const BOMB_DETONATION_DURATION_TICKS = 30;
export const BOMB_DETONATION_FLASH_TICKS = 7;
export const BOMB_DETONATION_CAPACITY = 4;

interface Point { readonly x: number; readonly y: number; readonly z: number }

export interface BombDetonationEffect {
  readonly bombId: number;
  readonly startTick: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface BombPressureSegment {
  readonly start: Point;
  readonly end: Point;
  readonly radius: number;
}

export interface BombSparkSegment {
  readonly start: Point;
  readonly end: Point;
  readonly radius: number;
}

function boundedProgress(effect: BombDetonationEffect, tick: number): number | null {
  const age = tick - effect.startTick;
  if (age < 0 || age >= BOMB_DETONATION_DURATION_TICKS) return null;
  return age / BOMB_DETONATION_DURATION_TICKS;
}

function easeOut(value: number): number { return 1 - (1 - value) * (1 - value); }

export function bombPressureRingSegment(
  effect: BombDetonationEffect,
  tick: number,
  segmentIndex: number,
  segmentCount: number,
  motionScale: number,
): BombPressureSegment | null {
  const progress = boundedProgress(effect, tick);
  if (progress === null || segmentCount < 3) return null;
  const motion = Math.max(0, Math.min(1, motionScale));
  const expansion = motion === 0 ? 1 : 0.12 + easeOut(progress) * 0.88;
  const ringRadius = BOMB_BLAST_RADIUS * expansion;
  const centerAngle = effect.bombId * 0.37 + segmentIndex / segmentCount * Math.PI * 2;
  const halfArc = Math.PI / segmentCount * 0.72;
  const y = 0.11 + Math.sin(progress * Math.PI) * 0.13 * motion;
  return {
    start: {
      x: effect.x + Math.cos(centerAngle - halfArc) * ringRadius,
      y,
      z: effect.z + Math.sin(centerAngle - halfArc) * ringRadius,
    },
    end: {
      x: effect.x + Math.cos(centerAngle + halfArc) * ringRadius,
      y,
      z: effect.z + Math.sin(centerAngle + halfArc) * ringRadius,
    },
    radius: 0.075 * (1 - progress * 0.62),
  };
}

function bombSparkPoint(
  effect: BombDetonationEffect,
  tick: number,
  sparkIndex: number,
  motionScale: number,
): Point | null {
  const progress = boundedProgress(effect, tick);
  if (progress === null) return null;
  const motion = Math.max(0, Math.min(1, motionScale));
  const travel = motion === 0 ? 0.62 : easeOut(progress);
  const angle = effect.bombId * 1.618034 + sparkIndex * 2.399963;
  const distance = BOMB_BLAST_RADIUS * (0.42 + sparkIndex % 3 * 0.09) * travel;
  return {
    x: effect.x + Math.cos(angle) * distance,
    y: Math.max(0.16, effect.y) + Math.sin(progress * Math.PI) * (0.72 + sparkIndex % 4 * 0.17) * motion,
    z: effect.z + Math.sin(angle) * distance,
  };
}

export function bombRadialSparkSegment(
  effect: BombDetonationEffect,
  tick: number,
  sparkIndex: number,
  motionScale: number,
): BombSparkSegment | null {
  const end = bombSparkPoint(effect, tick, sparkIndex, motionScale);
  if (end === null) return null;
  const start = bombSparkPoint(effect, Math.max(effect.startTick, tick - 1), sparkIndex, motionScale) ?? end;
  const progress = (tick - effect.startTick) / BOMB_DETONATION_DURATION_TICKS;
  return { start, end, radius: 0.045 * (1 - progress * 0.55) };
}

export function bombFlashRadius(
  effect: BombDetonationEffect,
  tick: number,
  flashScale: number,
): number | null {
  const age = tick - effect.startTick;
  const scale = Math.max(0, Math.min(1, flashScale));
  if (age < 0 || age >= BOMB_DETONATION_FLASH_TICKS || scale === 0) return null;
  const progress = age / BOMB_DETONATION_FLASH_TICKS;
  return (0.28 + progress * 0.72) * (1 - progress * 0.35) * scale;
}

export class BombDetonationTracker {
  private effects: BombDetonationEffect[] = [];
  private lastTick: number | null = null;

  emit(effect: BombDetonationEffect): void {
    if (this.effects.some((candidate) => (
      candidate.bombId === effect.bombId && candidate.startTick === effect.startTick
    ))) return;
    this.effects.push(effect);
    if (this.effects.length > BOMB_DETONATION_CAPACITY) this.effects.shift();
  }

  update(tick: number): readonly BombDetonationEffect[] {
    if (this.lastTick !== null && tick < this.lastTick) this.effects = [];
    this.lastTick = tick;
    this.effects = this.effects.filter((effect) => tick - effect.startTick < BOMB_DETONATION_DURATION_TICKS);
    return this.effects.filter((effect) => tick >= effect.startTick);
  }

  clear(): void {
    this.effects = [];
    this.lastTick = null;
  }
}
