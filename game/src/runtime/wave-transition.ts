export const INTER_WAVE_PRESENTATION_TICKS = 45;

export interface WaveTransitionInput {
  readonly waveIndex: number;
  readonly waveCount: number;
  readonly pendingTicks: number;
}

export interface WaveTransitionPresentation {
  readonly nextWave: number;
  readonly waveCount: number;
  readonly secondsRemaining: string;
  readonly remainingRatio: number;
  readonly transitionKey: string;
}

export function waveTransitionPresentation(
  encounter: WaveTransitionInput,
): WaveTransitionPresentation | null {
  if (encounter.waveCount <= 1 || encounter.pendingTicks <= 0
    || encounter.waveIndex + 1 >= encounter.waveCount) return null;
  const boundedTicks = Math.min(INTER_WAVE_PRESENTATION_TICKS, encounter.pendingTicks);
  const nextWave = encounter.waveIndex + 2;
  return {
    nextWave,
    waveCount: encounter.waveCount,
    secondsRemaining: Math.max(0.1, boundedTicks / 60).toFixed(1),
    remainingRatio: boundedTicks / INTER_WAVE_PRESENTATION_TICKS,
    transitionKey: `${encounter.waveIndex}:${nextWave}`,
  };
}
