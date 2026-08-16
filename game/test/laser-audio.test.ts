import { describe, expect, it } from 'vitest';
import {
  LASER_AUDIO_MAX_PITCH_SCALE, LASER_AUDIO_MIN_PITCH_SCALE, LaserAudioSequencer, laserPitchScale,
} from '../src/runtime/laser-audio';

describe('laser overheat audio presentation', () => {
  it('raises pitch monotonically with bounded authoritative heat', () => {
    const cold = laserPitchScale(0, false);
    const warm = laserPitchScale(50, false);
    const hot = laserPitchScale(100, false);
    expect(cold).toBe(LASER_AUDIO_MIN_PITCH_SCALE);
    expect(warm).toBeGreaterThan(cold);
    expect(hot).toBeGreaterThan(warm);
    expect(hot).toBe(LASER_AUDIO_MAX_PITCH_SCALE);
    expect(laserPitchScale(-20, false)).toBe(cold);
    expect(laserPitchScale(140, false)).toBe(hot);
    expect(laserPitchScale(Number.NaN, false)).toBe(cold);
    expect(laserPitchScale(10, true)).toBe(hot);
  });

  it('correlates an event arriving before its snapshot', () => {
    const sequencer = new LaserAudioSequencer();
    expect(sequencer.queue(8, { tick: 7, heat: 5, overheated: false })).toBeNull();
    expect(sequencer.sample({ tick: 8, heat: 32, overheated: false })).toEqual({
      tick: 8, pitchScale: laserPitchScale(32, false),
    });
  });

  it('coalesces queued ticks and does not replay a delayed burst', () => {
    const sequencer = new LaserAudioSequencer();
    expect(sequencer.queue(4, null)).toBeNull();
    expect(sequencer.queue(8, null)).toBeNull();
    expect(sequencer.queue(12, null)).toBeNull();
    expect(sequencer.sample({ tick: 12, heat: 48, overheated: false })?.tick).toBe(12);
    expect(sequencer.sample({ tick: 12, heat: 48, overheated: false })).toBeNull();
  });

  it('drops stale or duplicate cues and resets across timelines', () => {
    const sequencer = new LaserAudioSequencer();
    expect(sequencer.queue(4, null)).toBeNull();
    expect(sequencer.sample({ tick: 12, heat: 70, overheated: false })).toBeNull();
    expect(sequencer.queue(4, { tick: 12, heat: 70, overheated: false })).toBeNull();
    expect(sequencer.queue(5, { tick: 5, heat: 20, overheated: false })).toBeNull();
    sequencer.reset();
    expect(sequencer.queue(4, { tick: 4, heat: 20, overheated: false })).toEqual({
      tick: 4, pitchScale: laserPitchScale(20, false),
    });
  });
});
