import { CHAPTER_01_LEVEL_IDS, type Chapter01LevelId } from '../content/level-ids';
import { updateProfile, type LevelProgressV1, type ProfileV5 } from '../storage/profile';
import { standardParTicks } from './results';

function emptyProgress(levelId: Chapter01LevelId): LevelProgressV1 {
  return {
    levelId, completed: false, medals: [], bestTicks: null, bestReplayId: null,
    attempts: 0, defeats: 0, robotsDefeated: 0,
  };
}

export function updateLevelProgress(
  profile: ProfileV5,
  levelId: Chapter01LevelId,
  update: (progress: LevelProgressV1) => LevelProgressV1,
): readonly LevelProgressV1[] {
  return profile.levelProgress.some((progress) => progress.levelId === levelId)
    ? profile.levelProgress.map((progress) => progress.levelId === levelId ? update(progress) : progress)
    : [...profile.levelProgress, update(emptyProgress(levelId))];
}

export function recordCampaignAttempt(profile: ProfileV5, levelId: Chapter01LevelId): ProfileV5 {
  return updateProfile(profile, {
    lastCleanShutdown: false,
    levelProgress: updateLevelProgress(profile, levelId, (progress) => ({ ...progress, attempts: progress.attempts + 1 })),
  });
}

export function recordCampaignRobotDefeat(profile: ProfileV5, levelId: Chapter01LevelId): ProfileV5 {
  return updateProfile(profile, {
    levelProgress: updateLevelProgress(profile, levelId, (progress) => ({
      ...progress, robotsDefeated: progress.robotsDefeated + 1,
    })),
  });
}

export function recordCampaignDefeat(profile: ProfileV5, levelId: Chapter01LevelId): ProfileV5 {
  return updateProfile(profile, {
    levelProgress: updateLevelProgress(profile, levelId, (progress) => ({ ...progress, defeats: progress.defeats + 1 })),
  });
}

export function bankCampaignCoins(profile: ProfileV5, authoritativeCoins: number): ProfileV5 {
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
  profile: ProfileV5, levelId: Chapter01LevelId, completionTicks: number,
): ProfileV5 {
  if (!Number.isSafeInteger(completionTicks) || completionTicks < 1) throw new Error('Completion ticks must be a positive safe integer');
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
      medals: completionTicks <= standardParTicks(levelId) && !progress.medals.includes('par-time')
        ? [...progress.medals, 'par-time'] : progress.medals,
      bestTicks: progress.bestTicks === null ? completionTicks : Math.min(progress.bestTicks, completionTicks),
    })),
  });
}
