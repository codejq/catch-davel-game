export type DanceBeatPhase = 'neutral' | 'attack' | 'vulnerable' | 'frozen';

export interface DanceBeatPresentation {
  readonly absoluteStep: number;
  readonly barStep: number;
  readonly quarterBeat: number;
  readonly phase: DanceBeatPhase;
}

export function danceAbsoluteStepAtTick(tick: number, bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) throw new Error('Dance BPM must be positive and finite');
  return Math.floor(Math.max(0, tick) / (900 / bpm));
}

export function danceBeatPresentation(
  tick: number,
  bpm: number,
  attackBeats: readonly number[],
  vulnerableBeats: readonly number[],
  frozen: boolean,
): DanceBeatPresentation {
  const absoluteStep = danceAbsoluteStepAtTick(tick, bpm);
  const barStep = absoluteStep % 16;
  const phase: DanceBeatPhase = frozen ? 'frozen'
    : attackBeats.includes(barStep) ? 'attack'
      : vulnerableBeats.includes(barStep) ? 'vulnerable' : 'neutral';
  return { absoluteStep, barStep, quarterBeat: Math.floor(barStep / 4) + 1, phase };
}
