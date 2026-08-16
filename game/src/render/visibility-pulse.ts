import type { PlayableLevelId } from '../content/level-ids';

export interface VisibilityPulseFog {
  readonly near: number;
  readonly far: number;
  readonly greenMix: number;
}

export const GREEN_STEAM_VISIBILITY_PERIOD_TICKS = 180;

export function visibilityPulseFog(
  levelId: PlayableLevelId, tick: number, flashScale = 1,
): VisibilityPulseFog {
  if (levelId !== 'level-022') return { near: 25, far: 48, greenMix: 0 };
  const boundedFlash = Math.max(0, Math.min(1, flashScale));
  const phase = ((tick % GREEN_STEAM_VISIBILITY_PERIOD_TICKS) + GREEN_STEAM_VISIBILITY_PERIOD_TICKS)
    % GREEN_STEAM_VISIBILITY_PERIOD_TICKS / GREEN_STEAM_VISIBILITY_PERIOD_TICKS;
  const wave = (1 - Math.cos(phase * Math.PI * 2)) * 0.5;
  const density = 0.12 + wave * 0.35 * boundedFlash;
  return {
    near: 25 - density * 7,
    far: 48 - density * 14,
    greenMix: density * 0.42,
  };
}
