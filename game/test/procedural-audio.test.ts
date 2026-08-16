import { describe, expect, it } from 'vitest';
import { AUDIO_CUE_DEFINITIONS, validateProceduralAudioDefinitions } from '../src/audio/procedural-audio';
import { AUDIO_RUNTIME_PROFILES } from '../src/content/runtime-manifests';

describe('project-original procedural audio contracts', () => {
  it('keeps every gameplay cue layered and bounded', () => {
    expect(() => validateProceduralAudioDefinitions()).not.toThrow();
    expect(Object.keys(AUDIO_CUE_DEFINITIONS)).toHaveLength(25);
    for (const layers of Object.values(AUDIO_CUE_DEFINITIONS)) {
      expect(layers.length).toBeGreaterThanOrEqual(2);
      expect(Math.max(...layers.map((layer) => layer.duration + (layer.delay ?? 0)))).toBeLessThan(0.8);
    }
  });

  it('gives all ten authored rooms a distinct safe response profile', () => {
    const profiles = Object.values(AUDIO_RUNTIME_PROFILES);
    expect(profiles).toHaveLength(10);
    expect(new Set(profiles.map((profile) => JSON.stringify(profile))).size).toBe(10);
    for (const profile of profiles) {
      expect(profile.decaySeconds).toBeGreaterThan(0);
      expect(profile.decaySeconds).toBeLessThanOrEqual(1);
      expect(profile.wetMix).toBeGreaterThan(0);
      expect(profile.wetMix).toBeLessThanOrEqual(0.5);
    }
  });
});
