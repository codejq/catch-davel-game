import { CHAPTER_01_LEVEL_IDS, type Chapter01LevelId } from '../content/level-ids';
import { updateProfile, type LevelProgressV1, type ProfileV7 } from '../storage/profile';
import { standardParTicks, type CampaignResultSummary } from './results';

function emptyProgress(levelId: Chapter01LevelId): LevelProgressV1 {
  return {
    levelId, completed: false, medals: [], bestTicks: null, bestReplayId: null,
    attempts: 0, defeats: 0, robotsDefeated: 0,
    bestScore: null, bestAccuracyPermille: null, leastDamageTaken: null,
    mostSecretsFound: 0, highestCombo: 0, lastResult: null,
  };
}

export function updateLevelProgress(
  profile: ProfileV7,
  levelId: Chapter01LevelId,
  update: (progress: LevelProgressV1) => LevelProgressV1,
): readonly LevelProgressV1[] {
  return profile.levelProgress.some((progress) => progress.levelId === levelId)
    ? profile.levelProgress.map((progress) => progress.levelId === levelId ? update(progress) : progress)
    : [...profile.levelProgress, update(emptyProgress(levelId))];
}

export function recordCampaignAttempt(profile: ProfileV7, levelId: Chapter01LevelId): ProfileV7 {
  return updateProfile(profile, {
    lastCleanShutdown: false,
    levelProgress: updateLevelProgress(profile, levelId, (progress) => ({ ...progress, attempts: progress.attempts + 1 })),
  });
}

export function recordCampaignRobotDefeat(profile: ProfileV7, levelId: Chapter01LevelId): ProfileV7 {
  return updateProfile(profile, {
    levelProgress: updateLevelProgress(profile, levelId, (progress) => ({
      ...progress, robotsDefeated: progress.robotsDefeated + 1,
    })),
  });
}

export function recordCampaignDefeat(profile: ProfileV7, levelId: Chapter01LevelId): ProfileV7 {
  return updateProfile(profile, {
    levelProgress: updateLevelProgress(profile, levelId, (progress) => ({ ...progress, defeats: progress.defeats + 1 })),
  });
}

export function bankCampaignCoins(profile: ProfileV7, authoritativeCoins: number): ProfileV7 {
  if (!Number.isSafeInteger(authoritativeCoins) || authoritativeCoins < profile.spendableCoins) {
    throw new Error('Banked campaign coins cannot move backward or leave the safe-integer range');
  }
  const newlyBanked = authoritativeCoins - profile.spendableCoins;
  if (newlyBanked === 0) return profile;
  return updateProfile(profile, {
    totalCoins: profile.totalCoins + newlyBanked,
    spendableCoins: authoritativeCoins,
  });
}

export function completeCampaignLevel(
  profile: ProfileV7, levelId: Chapter01LevelId, completionTicks: number,
  result?: CampaignResultSummary,
): ProfileV7 {
  if (!Number.isSafeInteger(completionTicks) || completionTicks < 1) throw new Error('Completion ticks must be a positive safe integer');
  if (result !== undefined && (result.levelId !== levelId || result.completionTicks !== completionTicks)) {
    throw new Error('Campaign result does not match the completed level and tick');
  }
  const currentIndex = CHAPTER_01_LEVEL_IDS.indexOf(levelId);
  const nextLevelId = CHAPTER_01_LEVEL_IDS[currentIndex + 1];
  const unlockedLevelIds = nextLevelId === undefined || profile.unlockedLevelIds.includes(nextLevelId)
    ? profile.unlockedLevelIds : [...profile.unlockedLevelIds, nextLevelId];
  return updateProfile(profile, {
    unlockedLevelIds,
    campaignCheckpoint: null,
    levelProgress: updateLevelProgress(profile, levelId, (progress) => ({
      ...progress,
      completed: true,
      medals: [...new Set([
        ...progress.medals,
        ...(completionTicks <= standardParTicks(levelId) ? ['par-time'] : []),
        ...(result?.optionalObjectives.filter((objective) => objective.achieved).map((objective) => objective.id) ?? []),
        ...(result === undefined ? [] : [`tier:${result.medalTier}`]),
      ])],
      bestTicks: progress.bestTicks === null ? completionTicks : Math.min(progress.bestTicks, completionTicks),
      robotsDefeated: progress.robotsDefeated + (result === undefined ? 0
        : Object.values(result.robotsByArchetype).reduce((total, count) => total + count, 0)),
      bestReplayId: result !== undefined && (progress.bestScore === null || result.score >= progress.bestScore)
        ? result.replayId : progress.bestReplayId,
      bestScore: result === undefined ? progress.bestScore
        : progress.bestScore === null ? result.score : Math.max(progress.bestScore, result.score),
      bestAccuracyPermille: result?.accuracyPermille === null || result?.accuracyPermille === undefined
        ? progress.bestAccuracyPermille
        : progress.bestAccuracyPermille === null ? result.accuracyPermille
          : Math.max(progress.bestAccuracyPermille, result.accuracyPermille),
      leastDamageTaken: result === undefined ? progress.leastDamageTaken
        : progress.leastDamageTaken === null ? result.damageTaken : Math.min(progress.leastDamageTaken, result.damageTaken),
      mostSecretsFound: result === undefined ? progress.mostSecretsFound
        : Math.max(progress.mostSecretsFound, result.secretsFound),
      highestCombo: result === undefined ? progress.highestCombo : Math.max(progress.highestCombo, result.highestCombo),
      lastResult: result === undefined ? progress.lastResult : {
        completionTicks: result.completionTicks,
        score: result.score,
        accuracyPermille: result.accuracyPermille,
        damageTaken: result.damageTaken,
        robotsByArchetype: result.robotsByArchetype,
        coinsCollected: result.coinsEarned,
        secretsFound: result.secretsFound,
        totalSecrets: result.totalSecrets,
        highestCombo: result.highestCombo,
        optionalObjectives: result.optionalObjectives,
        medalTier: result.medalTier,
        seed: result.seed,
        replayChecksum: result.replayChecksum,
        replayId: result.replayId,
      },
    })),
  });
}
