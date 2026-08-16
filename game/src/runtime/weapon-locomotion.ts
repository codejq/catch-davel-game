import type { PlayableLevelId } from '../content/level-ids';

export const WEAPON_LOCOMOTION_MAX_X_PX = 7;
export const WEAPON_LOCOMOTION_MAX_Y_PX = 5;
export const WEAPON_LOCOMOTION_MAX_ROLL_DEGREES = 1.8;
const SPRINT_DISTANCE_PER_TICK = 0.124;
const ATTACK_PER_TICK = 0.18;
const RELEASE_PER_TICK = 0.12;

export interface WeaponLocomotionFrame {
  readonly levelId: PlayableLevelId;
  readonly tick: number;
  readonly victory: boolean;
  readonly defeat: boolean;
  readonly player: {
    readonly x: number;
    readonly z: number;
    readonly bobPhase: number;
  };
}

export interface WeaponLocomotionPose {
  readonly xPixels: number;
  readonly yPixels: number;
  readonly rollDegrees: number;
  readonly intensity: number;
}

const REST_POSE: WeaponLocomotionPose = Object.freeze({
  xPixels: 0, yPixels: 0, rollDegrees: 0, intensity: 0,
});

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function moveToward(current: number, target: number, maximumDelta: number): number {
  if (current < target) return Math.min(target, current + maximumDelta);
  return Math.max(target, current - maximumDelta);
}

/**
 * Projects authoritative travelled-distance phase into bounded view-model motion.
 * Tick-based attack/release makes coalesced presentation deterministic; resets and
 * terminal snapshots cannot carry motion from an earlier run or level.
 */
export class WeaponLocomotionTracker {
  private levelId: PlayableLevelId | null = null;
  private lastTick = -1;
  private lastX = 0;
  private lastZ = 0;
  private lastPhase = 0;
  private intensity = 0;
  private pose: WeaponLocomotionPose = REST_POSE;

  reset(): void {
    this.levelId = null;
    this.lastTick = -1;
    this.lastX = 0;
    this.lastZ = 0;
    this.lastPhase = 0;
    this.intensity = 0;
    this.pose = REST_POSE;
  }

  sample(state: WeaponLocomotionFrame, motionScale: number): WeaponLocomotionPose {
    if (this.levelId !== state.levelId || state.tick < this.lastTick || state.player.bobPhase < this.lastPhase) {
      this.reset();
    }
    if (state.tick === this.lastTick) return this.pose;

    const previousTick = this.lastTick;
    const previousX = this.lastX;
    const previousZ = this.lastZ;
    this.levelId = state.levelId;
    this.lastTick = state.tick;
    this.lastX = state.player.x;
    this.lastZ = state.player.z;
    this.lastPhase = state.player.bobPhase;

    const scale = clamp01(motionScale);
    if (previousTick < 0 || scale === 0) {
      this.intensity = 0;
      this.pose = REST_POSE;
      return this.pose;
    }

    const elapsedTicks = Math.max(1, state.tick - previousTick);
    const movedPerTick = Math.hypot(state.player.x - previousX, state.player.z - previousZ) / elapsedTicks;
    const target = state.victory || state.defeat || movedPerTick <= 0.0001
      ? 0 : clamp01(movedPerTick / SPRINT_DISTANCE_PER_TICK);
    const rate = target > this.intensity ? ATTACK_PER_TICK : RELEASE_PER_TICK;
    this.intensity = moveToward(this.intensity, target, rate * elapsedTicks);
    const applied = this.intensity * scale;
    const phase = state.player.bobPhase;
    this.pose = {
      xPixels: Math.sin(phase) * WEAPON_LOCOMOTION_MAX_X_PX * applied,
      yPixels: Math.abs(Math.sin(phase)) * WEAPON_LOCOMOTION_MAX_Y_PX * applied,
      rollDegrees: Math.sin(phase) * WEAPON_LOCOMOTION_MAX_ROLL_DEGREES * applied,
      intensity: applied,
    };
    return this.pose;
  }
}
