import { chapter01Level, type Chapter01LevelId } from '../content/levels/chapter-01';
import { freezeDanceWindow } from './level-mechanics';

export type AuthoritativeDancePhase = 'neutral' | 'attack' | 'vulnerable' | 'frozen';
export const DANCE_ATTACK_SCHEDULE_VERSION = 1;

export interface AuthoritativeDanceTiming {
  readonly absoluteStep: number;
  readonly barStep: number;
  readonly phase: AuthoritativeDancePhase;
}

export function danceAbsoluteStepAtTick(tick: number, bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) throw new Error('Dance BPM must be positive and finite');
  return Math.floor(Math.max(0, tick) / (900 / bpm));
}

export function authoritativeDanceTiming(
  levelId: Chapter01LevelId,
  tick: number,
): AuthoritativeDanceTiming {
  const dance = chapter01Level(levelId).dance;
  const absoluteStep = danceAbsoluteStepAtTick(tick, dance.bpm);
  const barStep = absoluteStep % 16;
  const phase: AuthoritativeDancePhase = freezeDanceWindow(levelId, tick).frozen ? 'frozen'
    : dance.attackBeats.includes(barStep) ? 'attack'
      : dance.vulnerableBeats.includes(barStep) ? 'vulnerable' : 'neutral';
  return { absoluteStep, barStep, phase };
}

export function isDanceWeakPointActive(levelId: Chapter01LevelId, tick: number): boolean {
  return authoritativeDanceTiming(levelId, tick).phase === 'vulnerable';
}

export function isDanceAttackOnset(levelId: Chapter01LevelId, tick: number): boolean {
  const current = authoritativeDanceTiming(levelId, tick);
  if (current.phase !== 'attack') return false;
  if (tick <= 0) return true;
  return authoritativeDanceTiming(levelId, tick - 1).absoluteStep !== current.absoluteStep;
}
