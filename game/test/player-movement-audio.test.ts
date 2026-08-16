import { describe, expect, it } from 'vitest';
import {
  PLAYER_STEP_PHASE_INTERVAL, PlayerMovementAudioSequencer, type PlayerMovementAudioSnapshot,
} from '../src/runtime/player-movement-audio';

function snapshot(
  tick: number, bobPhase: number, x: number,
  overrides: Partial<PlayerMovementAudioSnapshot> = {},
): PlayerMovementAudioSnapshot {
  return {
    levelId: 'level-001', tick, player: { x, z: 0, bobPhase }, victory: false, defeat: false,
    ...overrides,
  };
}

describe('snapshot-derived player movement audio', () => {
  it('primes silently and emits alternating walking steps at phase boundaries', () => {
    const sequencer = new PlayerMovementAudioSequencer();
    expect(sequencer.sample(snapshot(0, 0, 0))).toBeNull();
    const first = sequencer.sample(snapshot(15, PLAYER_STEP_PHASE_INTERVAL + 0.1, 1.12));
    const second = sequencer.sample(snapshot(30, PLAYER_STEP_PHASE_INTERVAL * 2 + 0.1, 2.24));
    expect(first).toMatchObject({ cue: 'player-step', gainScale: 0.4, sprinting: false });
    expect(second).toMatchObject({ cue: 'player-step', gainScale: 0.4, sprinting: false });
    expect(first?.pitchScale).not.toBe(second?.pitchScale);
  });

  it('recognizes sprint cadence from phase per authoritative tick', () => {
    const sequencer = new PlayerMovementAudioSequencer();
    sequencer.sample(snapshot(0, 0, 0));
    expect(sequencer.sample(snapshot(10, PLAYER_STEP_PHASE_INTERVAL + 0.2, 1.24))).toMatchObject({
      cue: 'player-step', gainScale: 0.5, sprinting: true,
    });
  });

  it('coalesces skipped boundaries into one cue and never catches up after disabled output', () => {
    const sequencer = new PlayerMovementAudioSequencer();
    sequencer.sample(snapshot(0, 0, 0));
    expect(sequencer.sample(snapshot(60, PLAYER_STEP_PHASE_INTERVAL * 4.2, 4.8))).not.toBeNull();
    expect(sequencer.sample(snapshot(120, PLAYER_STEP_PHASE_INTERVAL * 8.2, 9.6), false)).toBeNull();
    expect(sequencer.sample(snapshot(121, PLAYER_STEP_PHASE_INTERVAL * 8.2, 9.6))).toBeNull();
  });

  it('does not emit while stationary or terminal and silently reprimes after rewind/reset', () => {
    const sequencer = new PlayerMovementAudioSequencer();
    sequencer.sample(snapshot(10, 0, 0));
    expect(sequencer.sample(snapshot(20, PLAYER_STEP_PHASE_INTERVAL + 0.1, 0))).toBeNull();
    expect(sequencer.sample(snapshot(30, PLAYER_STEP_PHASE_INTERVAL * 2 + 0.1, 1, { victory: true }))).toBeNull();
    expect(sequencer.sample(snapshot(5, 0.2, 0.1))).toBeNull();
    sequencer.reset();
    expect(sequencer.sample(snapshot(6, PLAYER_STEP_PHASE_INTERVAL + 0.2, 1.1))).toBeNull();
  });
});
