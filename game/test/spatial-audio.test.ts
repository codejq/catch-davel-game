import { describe, expect, it } from 'vitest';
import {
  WORLD_AUDIO_MAX_DISTANCE, WORLD_AUDIO_MIN_GAIN, WORLD_AUDIO_OCCLUDED_GAIN_SCALE,
  WORLD_AUDIO_OCCLUDED_LOW_PASS_HZ, spatialAudioMix, spatialAudioObstruction,
} from '../src/audio/spatial-audio';

describe('listener-relative world audio projection', () => {
  it('pans from listener yaw rather than absolute world X', () => {
    const facingNorth = { x: 10, z: 20, yaw: 0 };
    expect(spatialAudioMix(facingNorth, { x: 15, z: 20 }).pan).toBe(1);
    expect(spatialAudioMix(facingNorth, { x: 5, z: 20 }).pan).toBe(-1);
    expect(spatialAudioMix(facingNorth, { x: 10, z: 15 }).pan).toBe(0);

    const facingEast = { ...facingNorth, yaw: Math.PI * 0.5 };
    expect(spatialAudioMix(facingEast, { x: 10, z: 25 }).pan).toBeCloseTo(1);
    expect(spatialAudioMix(facingEast, { x: 15, z: 20 }).pan).toBeCloseTo(0);
  });

  it('attenuates monotonically while retaining a bounded critical-cue tail', () => {
    const listener = { x: 0, z: 0, yaw: 0 };
    const near = spatialAudioMix(listener, { x: 1, z: 0 });
    const middle = spatialAudioMix(listener, { x: WORLD_AUDIO_MAX_DISTANCE * 0.5, z: 0 });
    const far = spatialAudioMix(listener, { x: WORLD_AUDIO_MAX_DISTANCE, z: 0 });
    const beyond = spatialAudioMix(listener, { x: WORLD_AUDIO_MAX_DISTANCE * 2, z: 0 });
    expect(near.gainScale).toBe(1);
    expect(middle.gainScale).toBeLessThan(near.gainScale);
    expect(far.gainScale).toBe(WORLD_AUDIO_MIN_GAIN);
    expect(beyond.gainScale).toBe(WORLD_AUDIO_MIN_GAIN);
  });

  it('centers coincident sources and rejects invalid transforms', () => {
    expect(spatialAudioMix({ x: 2, z: 3, yaw: 1 }, { x: 2, z: 3 }))
      .toEqual({ pan: 0, gainScale: 1, distance: 0 });
    expect(() => spatialAudioMix({ x: 0, z: 0, yaw: Number.NaN }, { x: 1, z: 0 })).toThrow(/finite/);
    expect(() => spatialAudioMix({ x: 0, z: 0, yaw: 0 }, { x: 1, z: 0 }, 1)).toThrow(/maximum/);
  });

  it('projects a bounded low-pass obstruction response without treating endpoints as walls', () => {
    const listener = { x: 0, z: 0 };
    const source = { x: 4, z: 0 };
    const clear = spatialAudioObstruction(listener, source, () => false);
    const blocked = spatialAudioObstruction(listener, source, (x) => x >= 1.9 && x <= 2.1);
    expect(clear).toEqual({ occluded: false, gainScale: 1, lowPassHz: null });
    expect(blocked).toEqual({
      occluded: true,
      gainScale: WORLD_AUDIO_OCCLUDED_GAIN_SCALE,
      lowPassHz: WORLD_AUDIO_OCCLUDED_LOW_PASS_HZ,
    });
    expect(spatialAudioObstruction(listener, source, (x) => x === 0 || x === 4).occluded).toBe(false);
    expect(() => spatialAudioObstruction(listener, source, () => false, 0)).toThrow(/positive/);
  });
});
