import type { PlayableLevelId } from '../content/level-ids';

export interface VisibilityPulseFog {
  readonly near: number;
  readonly far: number;
  readonly greenMix: number;
}

export const GREEN_STEAM_VISIBILITY_PERIOD_TICKS = 180;
export const FEVER_TUNNELS_VISIBILITY_PERIOD_TICKS = 150;

export function visibilityPulseFog(
  levelId: PlayableLevelId, tick: number, flashScale = 1,
): VisibilityPulseFog {
  if (levelId !== 'level-022' && levelId !== 'level-029') return { near: 25, far: 48, greenMix: 0 };
  const boundedFlash = Math.max(0, Math.min(1, flashScale));
  const fever = levelId === 'level-029';
  const period = fever ? FEVER_TUNNELS_VISIBILITY_PERIOD_TICKS : GREEN_STEAM_VISIBILITY_PERIOD_TICKS;
  const offsetTick = tick + (fever ? 25 : 0);
  const phase = ((offsetTick % period) + period) % period / period;
  const wave = (1 - Math.cos(phase * Math.PI * 2)) * 0.5;
  const density = (fever ? 0.16 : 0.12) + wave * (fever ? 0.38 : 0.35) * boundedFlash;
  return {
    near: 25 - density * (fever ? 8 : 7),
    far: 48 - density * (fever ? 16 : 14),
    greenMix: density * (fever ? 0.48 : 0.42),
  };
}
