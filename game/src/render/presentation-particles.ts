import type { RenderPlayerState, RenderProjectileState } from './render-model';
import type { CoinBurstEffect } from './coin-burst';
import { PLAYER_EYE_HEIGHT } from '../sim/constants';

export const MECHANICAL_FRAGMENT_DURATION_TICKS = 36;
export const PULSE_ENERGY_CELL_DURATION_TICKS = 26;
export const PULSE_ENERGY_CELL_CAPACITY = 4;

interface Point { readonly x: number; readonly y: number; readonly z: number }

export interface PulseEnergyCellEffect {
  readonly startTick: number;
  readonly origin: Point;
  readonly forwardX: number;
  readonly forwardZ: number;
  readonly rightX: number;
  readonly rightZ: number;
}

export interface PulseEnergyCellSegment {
  readonly start: Point;
  readonly end: Point;
  readonly center: Point;
  readonly radius: number;
  readonly glowRadius: number;
}

export function createPulseEnergyCellEffect(
  startTick: number,
  player: Pick<RenderPlayerState, 'x' | 'z' | 'yaw' | 'pitch'>,
): PulseEnergyCellEffect {
  const cosPitch = Math.cos(player.pitch);
  const forwardX = Math.sin(player.yaw) * cosPitch;
  const forwardZ = -Math.cos(player.yaw) * cosPitch;
  const rightX = Math.cos(player.yaw);
  const rightZ = Math.sin(player.yaw);
  return {
    startTick,
    origin: {
      x: player.x + forwardX * 0.42 + rightX * 0.19,
      y: PLAYER_EYE_HEIGHT - 0.31 + Math.sin(player.pitch) * 0.12,
      z: player.z + forwardZ * 0.42 + rightZ * 0.19,
    },
    forwardX,
    forwardZ,
    rightX,
    rightZ,
  };
}

export function pulseEnergyCellSegment(
  effect: PulseEnergyCellEffect,
  tick: number,
  motionScale: number,
): PulseEnergyCellSegment | null {
  const age = tick - effect.startTick;
  if (age < 0 || age >= PULSE_ENERGY_CELL_DURATION_TICKS) return null;
  const progress = age / PULSE_ENERGY_CELL_DURATION_TICKS;
  const motion = Math.max(0, Math.min(1, motionScale));
  const lateral = 0.04 + progress * (0.28 + 0.52 * motion);
  const rearward = progress * 0.24 * motion;
  const height = progress * 0.06
    + Math.sin(progress * Math.PI) * 0.48 * motion
    - progress * progress * (0.2 + 0.42 * motion);
  const center = {
    x: effect.origin.x + effect.rightX * lateral - effect.forwardX * rearward,
    y: effect.origin.y + height,
    z: effect.origin.z + effect.rightZ * lateral - effect.forwardZ * rearward,
  };
  const spin = effect.startTick * 0.41 + progress * Math.PI * (1.2 + 4.8 * motion);
  const horizontalX = effect.rightX * Math.cos(spin) + effect.forwardX * Math.sin(spin);
  const horizontalZ = effect.rightZ * Math.cos(spin) + effect.forwardZ * Math.sin(spin);
  const axisY = Math.sin(spin * 0.73) * (0.25 + 0.55 * motion);
  const axisLength = Math.max(0.001, Math.hypot(horizontalX, axisY, horizontalZ));
  const halfLength = 0.095;
  const axisX = horizontalX / axisLength * halfLength;
  const axisZ = horizontalZ / axisLength * halfLength;
  const vertical = axisY / axisLength * halfLength;
  return {
    start: { x: center.x - axisX, y: center.y - vertical, z: center.z - axisZ },
    end: { x: center.x + axisX, y: center.y + vertical, z: center.z + axisZ },
    center,
    radius: 0.034,
    glowRadius: 0.045 * (1 - progress * 0.45),
  };
}

export class PulseEnergyCellTracker {
  private effects: PulseEnergyCellEffect[] = [];
  private lastTick: number | null = null;

  emit(effect: PulseEnergyCellEffect): void {
    if (this.effects.some((candidate) => candidate.startTick === effect.startTick)) return;
    this.effects.push(effect);
    if (this.effects.length > PULSE_ENERGY_CELL_CAPACITY) this.effects.shift();
  }

  update(tick: number): readonly PulseEnergyCellEffect[] {
    if (this.lastTick !== null && tick < this.lastTick) this.effects = [];
    this.lastTick = tick;
    this.effects = this.effects.filter((effect) => (
      tick >= effect.startTick && tick - effect.startTick < PULSE_ENERGY_CELL_DURATION_TICKS
    ));
    return this.effects;
  }

  clear(): void {
    this.effects = [];
    this.lastTick = null;
  }
}

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
