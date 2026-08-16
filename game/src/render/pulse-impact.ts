import { PULSE_IMPACT_KIND, type PulseImpactKind } from '../sim/combat';

export const PULSE_IMPACT_DURATION_TICKS = 12;
export const PULSE_IMPACT_CAPACITY = 4;

interface Point { readonly x: number; readonly y: number; readonly z: number }

export interface PulseImpactEffect extends Point {
  readonly startTick: number;
  readonly kind: PulseImpactKind;
}

export interface PulseImpactSparkSegment {
  readonly start: Point;
  readonly end: Point;
  readonly radius: number;
}

function boundedProgress(effect: PulseImpactEffect, tick: number): number | null {
  const age = tick - effect.startTick;
  if (age < 0 || age >= PULSE_IMPACT_DURATION_TICKS) return null;
  return age / PULSE_IMPACT_DURATION_TICKS;
}

function boundedUnit(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

export function normalizePulseImpactKind(value: number | undefined): PulseImpactKind {
  return value === PULSE_IMPACT_KIND.wall || value === PULSE_IMPACT_KIND.robot
    ? value : PULSE_IMPACT_KIND.range;
}

export function pulseImpactSparkSegment(
  effect: PulseImpactEffect,
  tick: number,
  sparkIndex: number,
  motionScale: number,
): PulseImpactSparkSegment | null {
  const progress = boundedProgress(effect, tick);
  if (progress === null || sparkIndex < 0) return null;
  const motion = boundedUnit(motionScale);
  const phase = effect.startTick * 0.618034 + sparkIndex * 2.399963;
  const elevation = 0.24 + (sparkIndex % 3) * 0.21;
  const direction = {
    x: Math.cos(phase) * Math.cos(elevation),
    y: Math.sin(elevation),
    z: Math.sin(phase) * Math.cos(elevation),
  };
  const travel = motion === 0 ? 0.16 : (1 - (1 - progress) * (1 - progress)) * (0.34 + sparkIndex % 3 * 0.07);
  const previousProgress = Math.max(0, progress - 1 / PULSE_IMPACT_DURATION_TICKS);
  const previousTravel = motion === 0 ? 0.08
    : (1 - (1 - previousProgress) * (1 - previousProgress)) * (0.34 + sparkIndex % 3 * 0.07);
  const point = (distance: number): Point => ({
    x: effect.x + direction.x * distance,
    y: Math.max(0.04, effect.y + direction.y * distance - progress * progress * 0.18 * motion),
    z: effect.z + direction.z * distance,
  });
  return {
    start: point(previousTravel),
    end: point(travel),
    radius: 0.024 * (1 - progress * 0.58),
  };
}

export function pulseImpactFlashRadius(
  effect: PulseImpactEffect,
  tick: number,
  flashScale: number,
): number | null {
  const progress = boundedProgress(effect, tick);
  const scale = boundedUnit(flashScale);
  if (progress === null || progress >= 0.5 || scale === 0) return null;
  const kindScale = effect.kind === PULSE_IMPACT_KIND.range ? 0.58 : effect.kind === PULSE_IMPACT_KIND.robot ? 1.15 : 1;
  return (0.12 + progress * 0.16) * (1 - progress * 1.5) * kindScale * scale;
}

export class PulseImpactTracker {
  private effects: PulseImpactEffect[] = [];
  private lastTick: number | null = null;

  emit(effect: PulseImpactEffect): void {
    if (this.effects.some((candidate) => candidate.startTick === effect.startTick)) return;
    this.effects.push(effect);
    if (this.effects.length > PULSE_IMPACT_CAPACITY) this.effects.shift();
  }

  update(tick: number): readonly PulseImpactEffect[] {
    if (this.lastTick !== null && tick < this.lastTick) this.effects = [];
    this.lastTick = tick;
    this.effects = this.effects.filter((effect) => tick - effect.startTick < PULSE_IMPACT_DURATION_TICKS);
    return this.effects.filter((effect) => tick >= effect.startTick);
  }

  clear(): void {
    this.effects = [];
    this.lastTick = null;
  }
}
