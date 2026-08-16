import { describe, expect, it } from 'vitest';
import {
  AUDIO_CUE_BUS, AUDIO_CUE_DEFINITIONS, DEFAULT_AUDIO_MIX, DYNAMIC_RANGE_PRESETS,
  validateAudioMixSettings, validateProceduralAudioDefinitions,
} from '../src/audio/procedural-audio';
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

  it('routes every cue into one bounded mix bus and defines safe dynamic-range presets', () => {
    expect(Object.keys(AUDIO_CUE_BUS).sort()).toEqual(Object.keys(AUDIO_CUE_DEFINITIONS).sort());
    expect(new Set(Object.values(AUDIO_CUE_BUS))).toEqual(new Set(['combat', 'world', 'interface']));
    expect(AUDIO_CUE_BUS.pulse).toBe('combat');
    expect(AUDIO_CUE_BUS.coin).toBe('world');
    expect(AUDIO_CUE_BUS.objective).toBe('interface');
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
});
