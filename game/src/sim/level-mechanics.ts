import { campaignLevel, type PlayableLevelId } from '../content/levels/catalog';
import { danceGameplayRuntimeProfile } from '../content/runtime-manifests';
import type { RobotState } from './robots';

export type LevelMechanicKind = 'standard' | 'branch-route' | 'key-ambush' | 'freeze-dance';

export interface FreezeDanceWindow {
  readonly frozen: boolean;
  readonly ticksUntilToggle: number;
}

export const BOMB_SEAL_BREAK_RADIUS = 6.5;
export const MAGENTA_DRAIN_ACTIVATION_TICKS = [1500, 2700, 3900] as const;
export const MAGENTA_DRAIN_WARNING_TICKS = 90;

export function levelMechanicKind(levelId: PlayableLevelId): LevelMechanicKind {
  const level = campaignLevel(levelId);
  if (level.tags.includes('ambush')) return 'key-ambush';
  if (level.tags.includes('maze-reversal')) return 'branch-route';
  if (danceGameplayRuntimeProfile(level.dance.presetId).kind === 'freeze-window') return 'freeze-dance';
  if (level.tags.includes('branching')) return 'branch-route';
  return 'standard';
}

export function isMazeReversalLevel(levelId: PlayableLevelId): boolean {
  return campaignLevel(levelId).tags.includes('maze-reversal');
}

export function isKeyAmbushLevel(levelId: PlayableLevelId): boolean {
  return levelMechanicKind(levelId) === 'key-ambush';
}

export function isCrimsonPairLevel(levelId: PlayableLevelId): boolean {
  return campaignLevel(levelId).tags.includes('synchronized-elite-duo');
}

export function isMagentaDrainLevel(levelId: PlayableLevelId): boolean {
  return campaignLevel(levelId).tags.includes('rising-hazard-escape');
}

export function magentaDrainRiseProgress(levelId: PlayableLevelId, tick: number, stageIndex: number): number {
  if (!isMagentaDrainLevel(levelId)) return 0;
  const activationTick = MAGENTA_DRAIN_ACTIVATION_TICKS[stageIndex];
  if (activationTick === undefined) return 0;
  return Math.max(0, Math.min(1, (tick - (activationTick - MAGENTA_DRAIN_WARNING_TICKS)) / MAGENTA_DRAIN_WARNING_TICKS));
}

export function activateKeyAmbush(
  robots: RobotState[], levelId: PlayableLevelId, keyCollected: boolean,
): boolean {
  if (!keyCollected || !isKeyAmbushLevel(levelId) || robots.some((robot) => robot.spawned)) return false;
  for (const robot of robots) {
    robot.spawned = true;
    robot.active = true;
  }
  return true;
}

export function freezeDanceWindow(levelId: PlayableLevelId, tick: number): FreezeDanceWindow {
  const profile = danceGameplayRuntimeProfile(campaignLevel(levelId).dance.presetId);
  if (profile.kind !== 'freeze-window') return { frozen: false, ticksUntilToggle: 0 };
  const phase = (tick + profile.phaseOffsetTicks) % profile.periodTicks;
  return phase < profile.freezeTicks
    ? { frozen: true, ticksUntilToggle: profile.freezeTicks - phase }
    : { frozen: false, ticksUntilToggle: profile.periodTicks - phase };
}

export function levelMechanicDependency(levelId: PlayableLevelId): Readonly<Record<string, unknown>> | null {
  const primaryObjective = campaignLevel(levelId).objectives.find((objective) => objective.required)!;
  if (primaryObjective.completionMode === 'timer') return {
    kind: 'timed-objective', clock: 'level-tick', durationTicks: primaryObjective.durationTicks,
    completionRequires: 'all-encounter-robots-defeated',
  };
  if (isCrimsonPairLevel(levelId)) return {
    kind: 'synchronized-elite-duo', robotIds: [5, 7], telegraphTicks: 36,
    recoveryTicks: 32, repeatCooldownTicks: 96,
  };
  if (campaignLevel(levelId).tags.includes('destructible-route-choices')) return {
    kind: 'destructible-route-choices', trigger: 'bomb-detonated', breakRadius: BOMB_SEAL_BREAK_RADIUS,
    requiredSealIds: ['ballroom-bomb-seal-center'],
    optionalShortcutIds: ['ballroom-bomb-shortcut-left', 'ballroom-bomb-shortcut-right'],
  };
  if (isMagentaDrainLevel(levelId)) return {
    kind: 'rising-hazard-escape', clock: 'level-tick',
    activationTicks: MAGENTA_DRAIN_ACTIVATION_TICKS, warningTicks: MAGENTA_DRAIN_WARNING_TICKS,
    collision: 'permanent-stage-gates',
  };
  if (campaignLevel(levelId).tags.includes('bomb-seal')) return {
    kind: 'bomb-seal', trigger: 'bomb-detonated', activation: 'until-bomb',
    breakRadius: BOMB_SEAL_BREAK_RADIUS,
  };
  const kind = levelMechanicKind(levelId);
  if (kind === 'standard') return null;
  if (kind === 'branch-route') return isMazeReversalLevel(levelId) ? {
    kind: 'maze-reversal', trigger: 'key-collected', closes: 'after-key', opens: 'before-key',
    collision: 'timed-door',
  } : null;
  if (kind === 'key-ambush') return { kind, trigger: 'key-collected', activation: 'first-wave' };
  return { kind, profile: danceGameplayRuntimeProfile(campaignLevel(levelId).dance.presetId) };
}
