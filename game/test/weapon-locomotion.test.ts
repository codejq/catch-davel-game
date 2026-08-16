import { describe, expect, it } from 'vitest';
import {
  WEAPON_LOCOMOTION_MAX_ROLL_DEGREES, WEAPON_LOCOMOTION_MAX_X_PX, WEAPON_LOCOMOTION_MAX_Y_PX,
  WeaponLocomotionTracker, type WeaponLocomotionFrame,
} from '../src/runtime/weapon-locomotion';

function frame(
  tick: number, x: number, bobPhase: number,
  overrides: Partial<WeaponLocomotionFrame> = {},
): WeaponLocomotionFrame {
  return {
    levelId: 'level-001', tick, victory: false, defeat: false,
    player: { x, z: 0, bobPhase }, ...overrides,
  };
}

describe('snapshot-derived first-person weapon locomotion', () => {
  it('primes at rest and gives sprinting stronger bounded motion than walking', () => {
    const walking = new WeaponLocomotionTracker();
    const sprinting = new WeaponLocomotionTracker();
    expect(walking.sample(frame(0, 0, 0), 1).intensity).toBe(0);
    sprinting.sample(frame(0, 0, 0), 1);
    const walkPose = walking.sample(frame(10, 0.8, 2.24), 1);
    const sprintPose = sprinting.sample(frame(10, 1.24, 3.472), 1);
    expect(sprintPose.intensity).toBeGreaterThan(walkPose.intensity);
    for (const pose of [walkPose, sprintPose]) {
      expect(Math.abs(pose.xPixels)).toBeLessThanOrEqual(WEAPON_LOCOMOTION_MAX_X_PX);
      expect(pose.yPixels).toBeLessThanOrEqual(WEAPON_LOCOMOTION_MAX_Y_PX);
      expect(Math.abs(pose.rollDegrees)).toBeLessThanOrEqual(WEAPON_LOCOMOTION_MAX_ROLL_DEGREES);
    }
  });

  it('matches sequential and coalesced delivery at constant sprint speed', () => {
    const sequential = new WeaponLocomotionTracker();
    const coalesced = new WeaponLocomotionTracker();
    sequential.sample(frame(0, 0, 0), 1);
    coalesced.sample(frame(0, 0, 0), 1);
    let sequentialPose = sequential.sample(frame(0, 0, 0), 1);
    for (let tick = 1; tick <= 10; tick += 1) sequentialPose = sequential.sample(frame(tick, tick * 0.124, tick * 0.3472), 1);
    const coalescedPose = coalesced.sample(frame(10, 1.24, 3.472), 1);
    expect(coalescedPose.intensity).toBeCloseTo(sequentialPose.intensity, 12);
    expect(coalescedPose.xPixels).toBeCloseTo(sequentialPose.xPixels, 12);
    expect(coalescedPose.yPixels).toBeCloseTo(sequentialPose.yPixels, 12);
    expect(coalescedPose.rollDegrees).toBeCloseTo(sequentialPose.rollDegrees, 12);
  });

  it('releases toward rest and cannot animate at zero motion or after a rewind', () => {
    const tracker = new WeaponLocomotionTracker();
    tracker.sample(frame(0, 0, 0), 1);
    const moving = tracker.sample(frame(10, 1.24, 3.472), 1);
    expect(moving.intensity).toBe(1);
    expect(tracker.sample(frame(11, 1.24, 3.472), 1).intensity).toBeLessThan(1);
    expect(tracker.sample(frame(12, 1.36, 3.8), 0)).toEqual({ xPixels: 0, yPixels: 0, rollDegrees: 0, intensity: 0 });
    expect(tracker.sample(frame(2, 0.2, 0.4), 1).intensity).toBe(0);
  });

  it('releases on terminal snapshots without changing the authoritative frame', () => {
    const tracker = new WeaponLocomotionTracker();
    const initial = frame(0, 0, 0);
    const terminal = frame(10, 1.24, 3.472, { victory: true });
    tracker.sample(initial, 1);
    expect(tracker.sample(terminal, 1).intensity).toBe(0);
    expect(terminal).toEqual(frame(10, 1.24, 3.472, { victory: true }));
  });
});
