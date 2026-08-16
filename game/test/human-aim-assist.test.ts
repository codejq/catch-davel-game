import { describe, expect, it } from 'vitest';
import { applyHumanAimAssist } from '../src/runtime/human-aim-assist';
import { DIFFICULTY_PROFILES } from '../src/sim/difficulty';
import { GameSimulation } from '../src/sim/game';
import { decodeRenderSnapshot, RENDER_SNAPSHOT_BYTES, writeRenderSnapshot } from '../src/transport/render-snapshot';

function targetState() {
  const simulation = new GameSimulation('human-assist-proof');
  const robot = simulation.state.robots[0]!;
  for (const candidate of simulation.state.robots) candidate.active = candidate === robot;
  robot.x = simulation.state.player.x;
  robot.z = simulation.state.player.z + 1;
  for (let offset = 0; offset < robot.body.positions.length; offset += 3) {
    robot.body.positions[offset] = robot.x;
    robot.body.positions[offset + 2] = robot.z;
  }
  robot.body.positions[7] = 1.62;
  simulation.state.player.yaw = Math.PI - 0.05;
  const state = decodeRenderSnapshot(writeRenderSnapshot(new ArrayBuffer(RENDER_SNAPSHOT_BYTES), simulation.state)).state;
  return state;
}

describe('human angular aim assistance', () => {
  it('adds bounded target friction on Story without snapping a stationary reticle', () => {
    const state = targetState();
    const moving = { forward: 0, strafe: 0, yawDelta: 0.02, pitchDelta: 0, fire: true } as const;
    const assisted = applyHumanAimAssist(moving, state, DIFFICULTY_PROFILES.story.aimAssistRadians);
    expect(assisted.yawDelta).toBeGreaterThan(moving.yawDelta);
    expect(assisted.yawDelta).toBeLessThanOrEqual(moving.yawDelta * 1.35);
    const stationary = { ...moving, yawDelta: 0, fire: false };
    expect(applyHumanAimAssist(stationary, state, DIFFICULTY_PROFILES.story.aimAssistRadians)).toBe(stationary);
  });

  it('leaves human input unchanged when Hard disables its default assist', () => {
    const command = { forward: 0, strafe: 0, yawDelta: 0.02, pitchDelta: 0.01, fire: true } as const;
    expect(applyHumanAimAssist(command, targetState(), DIFFICULTY_PROFILES.hard.aimAssistRadians)).toBe(command);
  });
});
