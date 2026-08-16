import { describe, expect, it } from 'vitest';
import { musicStepAtTick } from '../src/audio/music-sequencer';
import { musicRuntimeProfile } from '../src/content/runtime-manifests';
import { danceAbsoluteStepAtTick, danceBeatPresentation } from '../src/runtime/dance-beat-presentation';
import { authoritativeDanceTiming, isDanceAttackOnset, isDanceWeakPointActive } from '../src/sim/dance-timing';

describe('accessible dance-beat presentation', () => {
  it('shares the exact tick/BPM clock used by procedural music', () => {
    const profile = musicRuntimeProfile('wobble-march');
    for (const tick of [0, 9, 10, 37, 38, 149, 150, 1_000]) {
      expect(danceAbsoluteStepAtTick(tick, 96)).toBe(musicStepAtTick(tick, 96, profile, 0.5, false).absoluteStep);
    }
  });

  it('labels authored attack and vulnerability steps over a repeating bar', () => {
    const attackBeats = [4, 12];
    const vulnerableBeats = [2, 6, 10, 14];
    expect(danceBeatPresentation(0, 96, attackBeats, vulnerableBeats, false)).toEqual({
      absoluteStep: 0, barStep: 0, quarterBeat: 1, phase: 'neutral',
    });
    expect(danceBeatPresentation(19, 96, attackBeats, vulnerableBeats, false)).toMatchObject({
      barStep: 2, quarterBeat: 1, phase: 'vulnerable',
    });
    expect(danceBeatPresentation(38, 96, attackBeats, vulnerableBeats, false)).toMatchObject({
      barStep: 4, quarterBeat: 2, phase: 'attack',
    });
    expect(danceBeatPresentation(150, 96, attackBeats, vulnerableBeats, false)).toMatchObject({
      absoluteStep: 16, barStep: 0, quarterBeat: 1, phase: 'neutral',
    });
  });

  it('shows freeze state without changing the correlated step and rejects invalid BPM', () => {
    const active = danceBeatPresentation(38, 96, [4], [], false);
    const frozen = danceBeatPresentation(38, 96, [4], [], true);
    expect(frozen).toEqual({ ...active, phase: 'frozen' });
    expect(() => danceAbsoluteStepAtTick(0, 0)).toThrow(/BPM/);
    expect(() => danceAbsoluteStepAtTick(0, Number.NaN)).toThrow(/BPM/);
  });

  it('maps authored vulnerability beats to simulation ticks and suppresses them during freeze', () => {
    expect(authoritativeDanceTiming('level-001', 19)).toEqual({
      absoluteStep: 2, barStep: 2, phase: 'vulnerable',
    });
    expect(isDanceWeakPointActive('level-001', 19)).toBe(true);
    expect(authoritativeDanceTiming('level-007', 17)).toMatchObject({ barStep: 2, phase: 'frozen' });
    expect(isDanceWeakPointActive('level-007', 17)).toBe(false);
  });

  it('identifies only the exact authored attack-step onset and respects freeze windows', () => {
    expect(isDanceAttackOnset('level-001', 37)).toBe(false);
    expect(isDanceAttackOnset('level-001', 38)).toBe(true);
    expect(isDanceAttackOnset('level-001', 39)).toBe(false);
    expect(isDanceAttackOnset('level-001', 113)).toBe(true);
    expect(isDanceAttackOnset('level-007', 34)).toBe(false);
    expect(isDanceAttackOnset('level-007', 100)).toBe(true);
  });
});
