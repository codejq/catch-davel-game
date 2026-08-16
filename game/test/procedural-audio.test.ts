import { describe, expect, it } from 'vitest';
import {
  AUDIO_BUSES, AUDIO_CUE_BUS, AUDIO_CUE_DEFINITIONS, AUDIO_DISTANT_REPORT_CUES,
  DEFAULT_AUDIO_MIX, DYNAMIC_RANGE_PRESETS,
  AMBIENCE_SOURCE_CAP, TOTAL_AUDIO_SOURCE_CAP, TRANSIENT_AUDIO_SOURCE_CAP,
  boundedAudioPitchScale, proceduralAmbienceProfile, proceduralCueVariation,
  validateAudioMixSettings, validateProceduralAudioDefinitions,
} from '../src/audio/procedural-audio';
import { AUDIO_RUNTIME_PROFILES } from '../src/content/runtime-manifests';

describe('project-original procedural audio contracts', () => {
  it('keeps every gameplay cue layered and bounded', () => {
    expect(() => validateProceduralAudioDefinitions()).not.toThrow();
    expect(Object.keys(AUDIO_CUE_DEFINITIONS)).toHaveLength(36);
    for (const layers of Object.values(AUDIO_CUE_DEFINITIONS)) {
      expect(layers.length).toBeGreaterThanOrEqual(2);
      expect(Math.max(...layers.map((layer) => layer.duration + (layer.delay ?? 0)))).toBeLessThan(0.8);
    }
  });

  it('routes every cue into one bounded mix bus and defines safe dynamic-range presets', () => {
    expect(Object.keys(AUDIO_CUE_BUS).sort()).toEqual(Object.keys(AUDIO_CUE_DEFINITIONS).sort());
    expect(new Set(Object.values(AUDIO_CUE_BUS))).toEqual(new Set(AUDIO_BUSES));
    expect(AUDIO_CUE_BUS.pulse).toBe('weapons');
    expect(AUDIO_CUE_BUS.coin).toBe('environment');
    expect(AUDIO_CUE_BUS.objective).toBe('interface');
    expect(AUDIO_CUE_BUS['robot-taunt']).toBe('voice');
    expect(AUDIO_CUE_BUS['wave-warning']).toBe('interface');
    expect(AUDIO_CUE_BUS['player-step']).toBe('environment');
    expect(AUDIO_CUE_BUS['wobble-step']).toBe('robots');
    expect(AUDIO_DISTANT_REPORT_CUES).toContain('bomb-detonate');
    expect(AUDIO_DISTANT_REPORT_CUES).toContain('robot-shot');
    expect(new Set(AUDIO_DISTANT_REPORT_CUES).size).toBe(AUDIO_DISTANT_REPORT_CUES.length);
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
    expect(() => validateAudioMixSettings({ ...DEFAULT_AUDIO_MIX, robots: Number.NaN })).toThrow(/outside bounds/);
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

  it('bounds per-cue pitch modulation without allocating another source', () => {
    expect(boundedAudioPitchScale(0.2)).toBe(0.5);
    expect(boundedAudioPitchScale(1.37)).toBe(1.37);
    expect(boundedAudioPitchScale(5)).toBe(2);
    expect(boundedAudioPitchScale(Number.NaN)).toBe(1);
    expect(TOTAL_AUDIO_SOURCE_CAP).toBe(TRANSIENT_AUDIO_SOURCE_CAP + AMBIENCE_SOURCE_CAP);
  });

  it('derives subtle repeatable event variation while keeping interface cues stable', () => {
    const first = proceduralCueVariation('pulse', 42);
    expect(proceduralCueVariation('pulse', 42)).toEqual(first);
    expect(proceduralCueVariation('pulse', 43)).not.toEqual(first);
    expect(first.gainScale).toBeGreaterThanOrEqual(0.94);
    expect(first.gainScale).toBeLessThanOrEqual(1);
    expect(first.pitchScale).toBeGreaterThanOrEqual(0.975);
    expect(first.pitchScale).toBeLessThanOrEqual(1.025);
    expect(proceduralCueVariation('objective', 42)).toEqual({ gainScale: 1, pitchScale: 1 });
    expect(() => proceduralCueVariation('pulse', -1)).toThrow(/identity/);
  });
});
