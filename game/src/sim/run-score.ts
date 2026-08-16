import { chapter01Level, type Chapter01LevelId } from '../content/levels/chapter-01';
import { ROBOT_DEFINITIONS } from './robots';
import type { RunMetrics } from './run-metrics';

export function runAccuracyPermille(metrics: RunMetrics): number | null {
  return metrics.rangedAttacksFired === 0 ? null
    : Math.round(metrics.rangedAttacksHit * 1_000 / metrics.rangedAttacksFired);
}

export function standardCampaignParTicks(levelId: Chapter01LevelId): number {
  const run = chapter01Level(levelId).agentValidation.runs.find((candidate) => candidate.difficulty === 'Standard');
  if (run === undefined) throw new Error(`${levelId} has no Standard par time`);
  return run.parTicks;
}

export function campaignRunScore(
  levelId: Chapter01LevelId,
  tick: number,
  completed: boolean,
  currentCoins: number,
  metrics: RunMetrics,
): number {
  const coinsEarned = currentCoins - metrics.startingCoins;
  if (!Number.isSafeInteger(coinsEarned) || coinsEarned < 0) throw new Error('Run coins must be a non-negative safe integer');
  let robotScore = 0;
  for (const robotId of metrics.defeatedRobotIds) {
    const definition = ROBOT_DEFINITIONS[robotId];
    if (definition === undefined) throw new Error(`Run metrics reference unknown Davel ${robotId}`);
    robotScore += definition.rank === 'boss' ? 1_000 : definition.rank === 'elite' ? 250 : 100;
  }
  const score = robotScore + coinsEarned * 10 + (runAccuracyPermille(metrics) ?? 0)
    + metrics.highestCombo * 75 + metrics.secretsFound * 500
    + (completed && tick <= standardCampaignParTicks(levelId) ? 1_000 : 0)
    + (completed && metrics.damageTaken === 0 ? 500 : 0);
  if (!Number.isSafeInteger(score)) throw new Error('Run score exceeds the safe-integer range');
  return score;
}
