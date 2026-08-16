import { describe, expect, it } from 'vitest';
import { BombFuseAudioSequencer } from '../src/audio/bomb-fuse-sequencer';

describe('snapshot-derived bomb fuse audio', () => {
  const bomb = { id: 2, x: 3, z: -4, fuseTicks: 89 };

  it('emits accelerating milestones with rising bounded pitch', () => {
    const sequencer = new BombFuseAudioSequencer();
    expect(sequencer.sample(1, [bomb], true)).toEqual([]);
    const early = sequencer.sample(15, [{ ...bomb, fuseTicks: 75 }], true)[0]!;
    const late = sequencer.sample(83, [{ ...bomb, fuseTicks: 6 }], true)[0]!;
    expect(early.milestone).toBe(75);
    expect(late.milestone).toBe(6);
    expect(late.pitchScale).toBeGreaterThan(early.pitchScale);
    expect(late.pitchScale).toBeLessThan(1.5);
    expect(late.gainScale).toBeLessThanOrEqual(0.68);
  });

  it('coalesces skipped milestones into one current cue instead of replaying a burst', () => {
    const sequencer = new BombFuseAudioSequencer();
    sequencer.sample(1, [bomb], true);
    const requests = sequencer.sample(60, [{ ...bomb, fuseTicks: 20 }], true);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.milestone).toBe(24);
    expect(sequencer.sample(60, [{ ...bomb, fuseTicks: 20 }], true)).toEqual([]);
  });

  it('stays silent while disabled and reseeds cleanly after rewind or reset', () => {
    const sequencer = new BombFuseAudioSequencer();
    sequencer.sample(1, [bomb], false);
    expect(sequencer.sample(15, [{ ...bomb, fuseTicks: 75 }], false)).toEqual([]);
    expect(sequencer.sample(0, [bomb], true)).toEqual([]);
    sequencer.reset();
    expect(sequencer.sample(1, [bomb], true)).toEqual([]);
  });
});
