export const DIFFICULTY_IDS = ['story', 'standard', 'hard'] as const;
export type DifficultyId = (typeof DIFFICULTY_IDS)[number];

export interface DifficultyProfile {
  readonly id: DifficultyId;
  readonly incomingDamageMultiplier: number;
  readonly robotHealthMultiplier: number;
  readonly robotMovementSpeedMultiplier: number;
  readonly projectileSpeedMultiplier: number;
  readonly telegraphTicksMultiplier: number;
  readonly interWaveDelayTicks: number;
  readonly resourceMultiplier: number;
  readonly aimAssistRadians: number;
  readonly bossPhaseTwoHealthRatio: number;
  readonly bossPhaseThreeHealthRatio: number;
  readonly maximumAttackTokens: number;
  readonly aiProfileId: 'forgiving' | 'standard' | 'relentless';
}

export const DIFFICULTY_PROFILES: Readonly<Record<DifficultyId, DifficultyProfile>> = Object.freeze({
  story: Object.freeze({
    id: 'story', incomingDamageMultiplier: 0.6, robotHealthMultiplier: 0.8,
    robotMovementSpeedMultiplier: 0.9, projectileSpeedMultiplier: 0.82, telegraphTicksMultiplier: 1.25,
    interWaveDelayTicks: 60, resourceMultiplier: 1.25, aimAssistRadians: 0.075,
    bossPhaseTwoHealthRatio: 0.7, bossPhaseThreeHealthRatio: 0.36,
    maximumAttackTokens: 2, aiProfileId: 'forgiving',
  }),
  standard: Object.freeze({
    id: 'standard', incomingDamageMultiplier: 1, robotHealthMultiplier: 1,
    robotMovementSpeedMultiplier: 1, projectileSpeedMultiplier: 1, telegraphTicksMultiplier: 1,
    interWaveDelayTicks: 45, resourceMultiplier: 1, aimAssistRadians: 0.025,
    bossPhaseTwoHealthRatio: 2 / 3, bossPhaseThreeHealthRatio: 1 / 3,
    maximumAttackTokens: 24, aiProfileId: 'standard',
  }),
  hard: Object.freeze({
    id: 'hard', incomingDamageMultiplier: 1.3, robotHealthMultiplier: 1.18,
    robotMovementSpeedMultiplier: 1.1, projectileSpeedMultiplier: 1.16, telegraphTicksMultiplier: 0.82,
    interWaveDelayTicks: 30, resourceMultiplier: 0.8, aimAssistRadians: 0,
    bossPhaseTwoHealthRatio: 0.62, bossPhaseThreeHealthRatio: 0.28,
    maximumAttackTokens: 24, aiProfileId: 'relentless',
  }),
});

export function isDifficultyId(value: unknown): value is DifficultyId {
  return typeof value === 'string' && (DIFFICULTY_IDS as readonly string[]).includes(value);
}

export function difficultyProfile(difficulty: DifficultyId): DifficultyProfile {
  return DIFFICULTY_PROFILES[difficulty];
}

export function difficultyRobotHealth(maxHealth: number, difficulty: DifficultyId): number {
  return Math.max(1, Math.round(maxHealth * difficultyProfile(difficulty).robotHealthMultiplier));
}
