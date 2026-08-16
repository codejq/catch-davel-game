import { chapter01Level, type Chapter01LevelId } from '../content/levels/chapter-01';
import { danceGameplayRuntimeProfile } from '../content/runtime-manifests';
import type { RobotState } from './robots';

export type LevelMechanicKind = 'standard' | 'branch-route' | 'key-ambush' | 'freeze-dance';

export interface FreezeDanceWindow {
  readonly frozen: boolean;
  readonly ticksUntilToggle: number;
}

export function levelMechanicKind(levelId: Chapter01LevelId): LevelMechanicKind {
  const level = chapter01Level(levelId);
  if (level.tags.includes('ambush')) return 'key-ambush';
  if (danceGameplayRuntimeProfile(level.dance.presetId).kind === 'freeze-window') return 'freeze-dance';
  if (level.tags.includes('branching')) return 'branch-route';
  return 'standard';
}

export function isKeyAmbushLevel(levelId: Chapter01LevelId): boolean {
  return levelMechanicKind(levelId) === 'key-ambush';
}

export function activateKeyAmbush(
  robots: RobotState[], levelId: Chapter01LevelId, keyCollected: boolean,
): boolean {
  if (!keyCollected || !isKeyAmbushLevel(levelId) || robots.some((robot) => robot.spawned)) return false;
  for (const robot of robots) {
    robot.spawned = true;
    robot.active = true;
  }
  return true;
}

export function freezeDanceWindow(levelId: Chapter01LevelId, tick: number): FreezeDanceWindow {
  const profile = danceGameplayRuntimeProfile(chapter01Level(levelId).dance.presetId);
  if (profile.kind !== 'freeze-window') return { frozen: false, ticksUntilToggle: 0 };
  const phase = (tick + profile.phaseOffsetTicks) % profile.periodTicks;
  return phase < profile.freezeTicks
    ? { frozen: true, ticksUntilToggle: profile.freezeTicks - phase }
    : { frozen: false, ticksUntilToggle: profile.periodTicks - phase };
}

export function levelMechanicDependency(levelId: Chapter01LevelId): Readonly<Record<string, unknown>> | null {
  const kind = levelMechanicKind(levelId);
  if (kind === 'standard' || kind === 'branch-route') return null;
  if (kind === 'key-ambush') return { kind, trigger: 'key-collected', activation: 'first-wave' };
  return { kind, profile: danceGameplayRuntimeProfile(chapter01Level(levelId).dance.presetId) };
}
