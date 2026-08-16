import { chapter01Level } from '../content/levels/chapter-01';
import { CHAPTER_01_LEVEL_IDS, type Chapter01LevelId } from '../content/level-ids';
import type { ProfileV4 } from '../storage/profile';

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
}

export function standardParTicks(levelId: Chapter01LevelId): number {
  const run = chapter01Level(levelId).agentValidation.runs.find((candidate) => candidate.difficulty === 'Standard');
  if (run === undefined) throw new Error(`${levelId} has no Standard par time`);
  return run.parTicks;
}

export function campaignResultSummary(
  profile: ProfileV4,
  levelId: Chapter01LevelId,
  completionTicks: number,
  coinsEarned: number,
): CampaignResultSummary {
  if (!Number.isSafeInteger(completionTicks) || completionTicks < 1) throw new Error('Completion ticks must be positive');
  if (!Number.isSafeInteger(coinsEarned) || coinsEarned < 0) throw new Error('Earned coins must be non-negative');
  const previousBestTicks = profile.levelProgress.find((entry) => entry.levelId === levelId)?.bestTicks ?? null;
  const parTicks = standardParTicks(levelId);
  const index = CHAPTER_01_LEVEL_IDS.indexOf(levelId);
  return {
    levelId,
    completionTicks,
    previousBestTicks,
    bestTicks: previousBestTicks === null ? completionTicks : Math.min(previousBestTicks, completionTicks),
    newBest: previousBestTicks === null || completionTicks < previousBestTicks,
    parTicks,
    parMedal: completionTicks <= parTicks,
    coinsEarned,
    nextLevelId: CHAPTER_01_LEVEL_IDS[index + 1] ?? null,
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
