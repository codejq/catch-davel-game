import { describe, expect, it } from 'vitest';
import { musicStepAtTick } from '../src/audio/music-sequencer';
import { MUSIC_RUNTIME_PROFILES, musicRuntimeProfile } from '../src/content/runtime-manifests';

describe('tick-correlated procedural music', () => {
  it('derives repeatable sixteenth-note steps from the level clock', () => {
    const profile = musicRuntimeProfile('wobble-march');
    expect(musicStepAtTick(0, 96, profile, 0.5, false)).toMatchObject({
      absoluteStep: 0, barStep: 0, kick: true, snare: false, hat: true, bassMidi: 48, leadMidi: null,
    });
    expect(musicStepAtTick(10, 96, profile, 0.5, false).absoluteStep).toBe(1);
    expect(musicStepAtTick(38, 96, profile, 0.5, false)).toMatchObject({ barStep: 4, kick: true, snare: true });
    expect(musicStepAtTick(38, 96, profile, 0.5, false)).toEqual(musicStepAtTick(38, 96, profile, 0.5, false));
  });

  it('turns Level 7 freeze windows into sparse cue beats without changing ticks', () => {
    const profile = musicRuntimeProfile('flashlight-freeze-dance');
    expect(musicStepAtTick(0, 108, profile, 1, true)).toMatchObject({ kick: true, hat: true, bassMidi: null, leadMidi: null });
    expect(musicStepAtTick(9, 108, profile, 1, true)).toMatchObject({ kick: false, hat: false, bassMidi: null, leadMidi: null });
    expect(musicStepAtTick(9, 108, profile, 1, false).hat).toBe(true);
  });

  it('keeps ten distinct bounded authored musical identities', () => {
    const profiles = Object.values(MUSIC_RUNTIME_PROFILES);
    expect(profiles).toHaveLength(10);
    expect(new Set(profiles.map((profile) => JSON.stringify(profile))).size).toBe(10);
    for (const profile of profiles) {
      expect(profile.leadPattern.every((degree) => degree >= 0 && degree < profile.scale.length)).toBe(true);
      expect(profile.bassPattern.every((degree) => degree >= 0 && degree < profile.scale.length)).toBe(true);
    }
  });
});
