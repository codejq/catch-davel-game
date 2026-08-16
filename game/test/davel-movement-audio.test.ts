import { describe, expect, it } from 'vitest';
import {
  DAVEL_MOVEMENT_AUDIO_CUES, DAVEL_MOVEMENT_AUDIO_MAX_REQUESTS, DAVEL_MOVEMENT_AUDIO_RANGE,
  DavelMovementAudioSequencer, type DavelMovementAudioSnapshot,
} from '../src/runtime/davel-movement-audio';

const robot = (id: number, x: number, danceTime: number, active = true) => ({
  id, x, z: 0, active, danceTime,
});

function snapshot(
  tick: number,
  robots: DavelMovementAudioSnapshot['robots'],
  overrides: Partial<DavelMovementAudioSnapshot> = {},
): DavelMovementAudioSnapshot {
  return {
    levelId: 'level-001', tick, player: { x: 0, z: 0 }, robots, victory: false, defeat: false,
    ...overrides,
  };
}

describe('snapshot-derived Davel movement audio', () => {
  it('assigns one distinct project-original cue to every archetype', () => {
    expect(Object.keys(DAVEL_MOVEMENT_AUDIO_CUES)).toHaveLength(6);
    expect(new Set(Object.values(DAVEL_MOVEMENT_AUDIO_CUES)).size).toBe(6);
  });

  it('primes silently then deterministically emits each archetype identity', () => {
    for (const [id, cue] of [
      [0, 'wobble-step'], [1, 'slider-step'], [4, 'spinner-step'],
      [3, 'firemouth-step'], [5, 'dj-step'], [6, 'overlord-step'],
    ] as const) {
      const left = new DavelMovementAudioSequencer();
      const right = new DavelMovementAudioSequencer();
      const first = snapshot(10, [robot(id, 1, 0)]);
      const second = snapshot(11, [robot(id, 1, 10)]);
      expect(left.sample(first)).toEqual([]);
      expect(right.sample(first)).toEqual([]);
      expect(left.sample(second)).toEqual(right.sample(second));
      expect(left.sample(snapshot(12, [robot(id, 1, 20)]))[0]?.cue).toBe(cue);
    }
  });

  it('caps a crowded beat and prioritizes the nearest stable robot IDs', () => {
    const sequencer = new DavelMovementAudioSequencer();
    const robots = [0, 1, 2, 3, 4, 5].map((id) => robot(id, 6 - id, 0));
    expect(sequencer.sample(snapshot(1, robots))).toEqual([]);
    const requests = sequencer.sample(snapshot(2, robots.map((entry) => ({ ...entry, danceTime: 10 }))));
    expect(requests).toHaveLength(DAVEL_MOVEMENT_AUDIO_MAX_REQUESTS);
    expect(requests.map((request) => request.robotId)).toEqual([5, 4, 3]);
    expect(requests.every((request) => request.gainScale > 0 && request.gainScale <= 0.58)).toBe(true);
  });

  it('consumes disabled and distant beats without catch-up bursts', () => {
    const sequencer = new DavelMovementAudioSequencer();
    expect(sequencer.sample(snapshot(1, [robot(0, 1, 0)]))).toEqual([]);
    expect(sequencer.sample(snapshot(2, [robot(0, 1, 10)]), false)).toEqual([]);
    expect(sequencer.sample(snapshot(3, [robot(0, 1, 10)]))).toEqual([]);
    expect(sequencer.sample(snapshot(4, [robot(0, DAVEL_MOVEMENT_AUDIO_RANGE, 20)]))).toEqual([]);
    expect(sequencer.sample(snapshot(5, [robot(0, 1, 20)]))).toEqual([]);
    expect(sequencer.sample(snapshot(6, [robot(0, 1, 30)]))).toHaveLength(1);
  });

  it('suppresses terminal state and silently reprimes after a rewind or resync reset', () => {
    const sequencer = new DavelMovementAudioSequencer();
    sequencer.sample(snapshot(10, [robot(0, 1, 0)]));
    expect(sequencer.sample(snapshot(11, [robot(0, 1, 10)], { victory: true }))).toEqual([]);
    expect(sequencer.sample(snapshot(5, [robot(0, 1, 20)]))).toEqual([]);
    expect(sequencer.sample(snapshot(6, [robot(0, 1, 30)])).length).toBe(1);
    sequencer.reset();
    expect(sequencer.sample(snapshot(7, [robot(0, 1, 40)]))).toEqual([]);
  });
});
