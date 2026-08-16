import { describe, expect, it } from 'vitest';
import { PLAYABLE_LEVELS, type PlayableLevelId } from '../src/content/levels/catalog';
import {
  AUDIO_RUNTIME_PROFILES, DANCE_GAMEPLAY_RUNTIME_PROFILES, DANCE_RUNTIME_MOTIFS, MAZE_RUNTIME_PROFILES,
  MUSIC_RUNTIME_PROFILES, PALETTE_RUNTIME_PROFILES, audioRuntimeProfile, danceGameplayRuntimeProfile,
  danceRuntimeMotif, mazeRuntimeProfile, musicRuntimeProfile, paletteRuntimeProfile,
} from '../src/content/runtime-manifests';
import { LEVEL_INTERACTION_DEFINITIONS } from '../src/sim/interactions';
import { levelDancePerformance } from '../src/sim/dance-performance';
import { levelRows } from '../src/sim/level';

describe('materialized playable campaign runtime manifests', () => {
  it('resolves every reviewed maze, palette, and dance binding without a parallel level table', () => {
    expect(Object.keys(MAZE_RUNTIME_PROFILES)).toHaveLength(18);
    expect(Object.keys(PALETTE_RUNTIME_PROFILES)).toHaveLength(18);
    expect(Object.keys(DANCE_RUNTIME_MOTIFS)).toHaveLength(18);
    expect(Object.keys(DANCE_GAMEPLAY_RUNTIME_PROFILES)).toHaveLength(18);
    expect(Object.keys(AUDIO_RUNTIME_PROFILES)).toHaveLength(18);
    expect(Object.keys(MUSIC_RUNTIME_PROFILES)).toHaveLength(18);
    for (const level of PLAYABLE_LEVELS) {
      const levelId = level.id as PlayableLevelId;
      const maze = mazeRuntimeProfile(level.maze.templateSetId);
      const palette = paletteRuntimeProfile(level.palette.presetId);
      const dance = levelDancePerformance(levelId);
      expect(LEVEL_INTERACTION_DEFINITIONS[levelId]).toBe(maze.interactions);
      expect(levelRows(levelId)).toHaveLength(15);
      expect(palette.walls).toHaveLength(4);
      expect(dance).toMatchObject({
        presetId: level.dance.presetId,
        bpm: level.dance.bpm,
        visualIntensity: level.dance.visualIntensity,
        motif: danceRuntimeMotif(level.dance.presetId),
      });
      expect(danceGameplayRuntimeProfile(level.dance.presetId)).toBeDefined();
      expect(audioRuntimeProfile(level.audio.presetId)).toMatchObject({
        roomSize: expect.any(Number), decaySeconds: expect.any(Number), dampingHz: expect.any(Number),
        wetMix: expect.any(Number), pitchScale: expect.any(Number),
      });
      expect(musicRuntimeProfile(level.dance.presetId)).toMatchObject({
        rootMidi: expect.any(Number), scale: expect.any(Array), leadPattern: expect.any(Array),
        bassPattern: expect.any(Array), swing: expect.any(Number),
      });
    }
  });

  it('keeps every bright palette identity visually distinct', () => {
    const signatures = PLAYABLE_LEVELS.map((level) => JSON.stringify(paletteRuntimeProfile(level.palette.presetId)));
    expect(new Set(signatures).size).toBe(18);
    for (const level of PLAYABLE_LEVELS) {
      const palette = paletteRuntimeProfile(level.palette.presetId);
      expect(Math.max(...palette.sky)).toBeGreaterThanOrEqual(0.72);
      expect(Math.max(...palette.floor)).toBeGreaterThanOrEqual(0.84);
    }
  });

  it('fails closed when authored content references an unknown runtime preset', () => {
    expect(() => mazeRuntimeProfile('missing-maze')).toThrow(/Unknown maze/);
    expect(() => paletteRuntimeProfile('missing-palette')).toThrow(/Unknown palette/);
    expect(() => danceRuntimeMotif('missing-dance')).toThrow(/Unknown dance/);
    expect(() => danceGameplayRuntimeProfile('missing-dance-gameplay')).toThrow(/Unknown dance gameplay/);
    expect(() => audioRuntimeProfile('missing-audio')).toThrow(/Unknown audio/);
    expect(() => musicRuntimeProfile('missing-music')).toThrow(/Unknown music/);
  });
});
