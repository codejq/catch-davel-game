import { describe, expect, it } from 'vitest';
import { INTER_WAVE_PRESENTATION_TICKS, waveTransitionPresentation } from '../src/runtime/wave-transition';

describe('presentation-only staged-wave pacing', () => {
  it('projects the authoritative 45-tick pause into a bounded human countdown', () => {
    expect(INTER_WAVE_PRESENTATION_TICKS).toBe(45);
    expect(waveTransitionPresentation({ waveIndex: 0, waveCount: 2, pendingTicks: 45 })).toEqual({
      nextWave: 2,
      waveCount: 2,
      secondsRemaining: '0.8',
      remainingRatio: 1,
      transitionKey: '0:2',
    });
    expect(waveTransitionPresentation({ waveIndex: 0, waveCount: 2, pendingTicks: 1 })).toMatchObject({
      secondsRemaining: '0.1', remainingRatio: 1 / 45,
    });
  });

  it('stays hidden for single-wave, active-wave, and completed-wave states', () => {
    expect(waveTransitionPresentation({ waveIndex: 0, waveCount: 1, pendingTicks: 0 })).toBeNull();
    expect(waveTransitionPresentation({ waveIndex: 0, waveCount: 2, pendingTicks: 0 })).toBeNull();
    expect(waveTransitionPresentation({ waveIndex: 1, waveCount: 2, pendingTicks: 45 })).toBeNull();
  });
});
