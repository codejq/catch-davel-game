import { chapter01Level } from '../content/levels/chapter-01';
import { CHAPTER_01_LEVEL_IDS, type Chapter01LevelId } from '../content/level-ids';
import type { ProfileV7 } from '../storage/profile';
import type { RunMetrics } from '../sim/run-metrics';
import { ROBOT_DEFINITIONS, type RobotArchetype } from '../sim/robots';

export type MedalTier = 'bronze' | 'silver' | 'gold' | 'quantum';

export interface ResultObjective {
  readonly id: string;
  readonly achieved: boolean;
}

export interface CampaignResultSummary {
  readonly levelId: Chapter01LevelId;
  readonly completionTicks: number;
  readonly previousBestTicks: number | null;
  readonly bestTicks: number;
  readonly newBest: boolean;
  readonly parTicks: number;
  readonly parMedal: boolean;
  readonly coinsEarned: number;
  readonly nextLevelId: Chapter01LevelId | null;
  readonly score: number;
  readonly accuracyPermille: number | null;
  readonly damageTaken: number;
  readonly robotsByArchetype: Readonly<Record<RobotArchetype, number>>;
  readonly secretsFound: number;
  readonly totalSecrets: number;
  readonly highestCombo: number;
  readonly optionalObjectives: readonly ResultObjective[];
  readonly medalTier: MedalTier;
  readonly seed: string;
  readonly replayChecksum: string;
  readonly replayId: string;
}

export function standardParTicks(levelId: Chapter01LevelId): number {
  const run = chapter01Level(levelId).agentValidation.runs.find((candidate) => candidate.difficulty === 'Standard');
  if (run === undefined) throw new Error(`${levelId} has no Standard par time`);
  return run.parTicks;
}

export function campaignResultSummary(
  profile: ProfileV7,
  levelId: Chapter01LevelId,
  completionTicks: number,
  finalCoins: number,
  metrics: RunMetrics,
  replayChecksum: string,
): CampaignResultSummary {
  if (!Number.isSafeInteger(completionTicks) || completionTicks < 1) throw new Error('Completion ticks must be positive');
  const coinsEarned = finalCoins - metrics.startingCoins;
  if (!Number.isSafeInteger(coinsEarned) || coinsEarned < 0) throw new Error('Earned coins must be non-negative');
  if (!/^[0-9a-f]{16}$/.test(replayChecksum)) throw new Error('Replay checksum must be a 16-digit lowercase hash');
  const previousBestTicks = profile.levelProgress.find((entry) => entry.levelId === levelId)?.bestTicks ?? null;
  const parTicks = standardParTicks(levelId);
  const index = CHAPTER_01_LEVEL_IDS.indexOf(levelId);
  const accuracyPermille = metrics.rangedAttacksFired === 0 ? null
    : Math.round(metrics.rangedAttacksHit * 1_000 / metrics.rangedAttacksFired);
  const robotsByArchetype: Record<RobotArchetype, number> = {
    'wobble-scout': 0, 'blue-slider': 0, 'yellow-spinner': 0,
    'red-firemouth': 0, 'cyan-dj': 0, 'invoice-overlord': 0,
  };
  let robotScore = 0;
  for (const robotId of metrics.defeatedRobotIds) {
    const definition = ROBOT_DEFINITIONS[robotId];
    if (definition === undefined) throw new Error(`Run metrics reference unknown Davel ${robotId}`);
    robotsByArchetype[definition.archetype] += 1;
    robotScore += definition.rank === 'boss' ? 1_000 : definition.rank === 'elite' ? 250 : 100;
  }
  const level = chapter01Level(levelId);
  const totalSecrets = level.maze.secretCount;
  const parMedal = completionTicks <= parTicks;
  const accuracyObjective = accuracyPermille !== null && accuracyPermille >= 600;
  const optionalObjectives = level.mastery.map((mastery): ResultObjective => ({
    id: mastery.presetId,
    achieved: mastery.presetId.includes('par-time') ? parMedal
      : mastery.presetId.includes('accuracy') ? accuracyObjective : false,
  }));
  const flawless = metrics.damageTaken === 0;
  const allSecrets = metrics.secretsFound === totalSecrets;
  const score = robotScore + coinsEarned * 10 + (accuracyPermille ?? 0)
    + metrics.highestCombo * 75 + metrics.secretsFound * 500
    + (parMedal ? 1_000 : 0) + (flawless ? 500 : 0);
  if (!Number.isSafeInteger(score)) throw new Error('Result score exceeds the safe-integer range');
  const medalTier: MedalTier = parMedal && (accuracyPermille === null || accuracyPermille >= 750)
    && flawless && allSecrets ? 'quantum'
    : parMedal && accuracyObjective ? 'gold'
      : parMedal || (accuracyPermille !== null && accuracyPermille >= 500) ? 'silver' : 'bronze';
  const replayId = `${levelId}:${level.seed}:${replayChecksum}`;
  return {
    levelId,
    completionTicks,
    previousBestTicks,
    bestTicks: previousBestTicks === null ? completionTicks : Math.min(previousBestTicks, completionTicks),
    newBest: previousBestTicks === null || completionTicks < previousBestTicks,
    parTicks,
    parMedal,
    coinsEarned,
    nextLevelId: CHAPTER_01_LEVEL_IDS[index + 1] ?? null,
    score,
    accuracyPermille,
    damageTaken: metrics.damageTaken,
    robotsByArchetype,
    secretsFound: metrics.secretsFound,
    totalSecrets,
    highestCombo: metrics.highestCombo,
    optionalObjectives,
    medalTier,
    seed: level.seed,
    replayChecksum,
    replayId,
  };
}

export function formatCampaignTicks(ticks: number): string {
  if (!Number.isSafeInteger(ticks) || ticks < 0) throw new Error('Formatted ticks must be non-negative');
  const totalMilliseconds = Math.round(ticks * 1000 / 60);
  const minutes = Math.floor(totalMilliseconds / 60_000);
  const seconds = Math.floor(totalMilliseconds % 60_000 / 1000);
  const milliseconds = totalMilliseconds % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}
