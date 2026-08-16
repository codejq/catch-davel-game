import { describe, expect, it } from 'vitest';
import {
  AUDIO_CUE_BUS, AUDIO_CUE_DEFINITIONS, DEFAULT_AUDIO_MIX, DYNAMIC_RANGE_PRESETS,
  AMBIENCE_SOURCE_CAP, TOTAL_AUDIO_SOURCE_CAP, TRANSIENT_AUDIO_SOURCE_CAP,
  proceduralAmbienceProfile, validateAudioMixSettings, validateProceduralAudioDefinitions,
} from '../src/audio/procedural-audio';
import { AUDIO_RUNTIME_PROFILES } from '../src/content/runtime-manifests';

describe('project-original procedural audio contracts', () => {
  it('keeps every gameplay cue layered and bounded', () => {
    expect(() => validateProceduralAudioDefinitions()).not.toThrow();
    expect(Object.keys(AUDIO_CUE_DEFINITIONS)).toHaveLength(33);
    for (const layers of Object.values(AUDIO_CUE_DEFINITIONS)) {
      expect(layers.length).toBeGreaterThanOrEqual(2);
      expect(Math.max(...layers.map((layer) => layer.duration + (layer.delay ?? 0)))).toBeLessThan(0.8);
    }
  });

  it('routes every cue into one bounded mix bus and defines safe dynamic-range presets', () => {
    expect(Object.keys(AUDIO_CUE_BUS).sort()).toEqual(Object.keys(AUDIO_CUE_DEFINITIONS).sort());
    expect(new Set(Object.values(AUDIO_CUE_BUS))).toEqual(new Set(['combat', 'world', 'interface']));
    expect(AUDIO_CUE_BUS.pulse).toBe('combat');
    expect(AUDIO_CUE_BUS.coin).toBe('world');
    expect(AUDIO_CUE_BUS.objective).toBe('interface');
    expect(AUDIO_CUE_BUS['robot-taunt']).toBe('world');
    expect(AUDIO_CUE_BUS['wave-warning']).toBe('interface');
    expect(AUDIO_CUE_BUS['wobble-step']).toBe('world');
    for (const preset of Object.values(DYNAMIC_RANGE_PRESETS)) {
      expect(preset.threshold).toBeLessThan(0);
      expect(preset.knee).toBeGreaterThanOrEqual(0);
      expect(preset.ratio).toBeGreaterThanOrEqual(1);
      expect(preset.attack).toBeGreaterThan(0);
      expect(preset.release).toBeGreaterThan(0);
      expect(preset.outputScale).toBeGreaterThan(0);
      expect(preset.outputScale).toBeLessThanOrEqual(1);
    }
    expect(DYNAMIC_RANGE_PRESETS.night.ratio).toBeGreaterThan(DYNAMIC_RANGE_PRESETS.wide.ratio);
    expect(() => validateAudioMixSettings(DEFAULT_AUDIO_MIX)).not.toThrow();
    expect(() => validateAudioMixSettings({ ...DEFAULT_AUDIO_MIX, combat: Number.NaN })).toThrow(/outside bounds/);
    expect(() => validateAudioMixSettings({
      ...DEFAULT_AUDIO_MIX, dynamicRange: 'cinema' as 'wide',
    })).toThrow(/preset/);
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

  it('gives every room a distinct bounded two-source workshop ambience', () => {
    const ambience = Object.entries(AUDIO_RUNTIME_PROFILES)
      .map(([id, profile]) => proceduralAmbienceProfile(id, profile));
    expect(AMBIENCE_SOURCE_CAP).toBe(2);
    expect(TRANSIENT_AUDIO_SOURCE_CAP).toBe(48);
    expect(TOTAL_AUDIO_SOURCE_CAP).toBe(50);
    expect(new Set(ambience.map((profile) => JSON.stringify(profile))).size).toBe(10);
    for (const profile of ambience) {
      expect(profile.primaryFrequency).toBeGreaterThanOrEqual(35);
      expect(profile.secondaryFrequency).toBeLessThan(100);
      expect(profile.filterFrequency).toBeGreaterThanOrEqual(400);
      expect(profile.filterFrequency).toBeLessThanOrEqual(1000);
    }
  });
});
