import { validateLevelDefinition } from '../content/validate-level';
import { CHAPTER_01_LEVELS, type Chapter01LevelId } from '../content/levels/chapter-01';
import {
  DIFFICULTY_IDS, difficultyProfile, difficultyRobotHealth, type DifficultyId,
} from '../sim/difficulty';
import { createLevelRuntime } from '../sim/interactions';
import { campaignRobotIds, ROBOT_DEFINITIONS } from '../sim/robots';

export interface DifficultyStaticResult {
  readonly levelId: Chapter01LevelId;
  readonly difficulty: DifficultyId;
  readonly graphAndObjectiveReachable: true;
  readonly totalRobotHealth: number;
  readonly totalDavelCoins: number;
  readonly healthPickupBudget: number;
  readonly energyPickupBudget: number;
  readonly optionalCoinBudget: number;
  readonly interWaveDelayTicks: number;
  readonly conservativeMinimumTelegraphTicks: number;
  readonly maximumAttackTokens: number;
  readonly aimAssistRadians: number;
}

function scaledResource(amount: number, multiplier: number): number {
  return Math.max(1, Math.round(amount * multiplier));
}

/** Static difficulty analysis for every released level and supported default assist profile. */
export function createChapter01DifficultyStaticReport(): readonly DifficultyStaticResult[] {
  return CHAPTER_01_LEVELS.flatMap((level) => DIFFICULTY_IDS.map((difficulty): DifficultyStaticResult => {
    validateLevelDefinition(level);
    const levelId = level.id as Chapter01LevelId;
    const robotIds = campaignRobotIds(levelId);
    const objectiveTarget = level.objectives.find((objective) => objective.required)?.targetCount;
    if (objectiveTarget !== robotIds.length) throw new Error(`${levelId} objective cannot be satisfied by its runtime roster`);
    const runtime = createLevelRuntime(levelId);
    const profile = difficultyProfile(difficulty);
    const totalRobotHealth = robotIds.reduce(
      (sum, id) => sum + difficultyRobotHealth(ROBOT_DEFINITIONS[id]!.maxHealth, difficulty), 0,
    );
    const totalDavelCoins = robotIds.reduce(
      (sum, id) => sum + scaledResource(ROBOT_DEFINITIONS[id]!.coinReward, profile.resourceMultiplier), 0,
    );
    const pickupBudget = (kind: 'health' | 'energy' | 'coin'): number => runtime.pickups
      .filter((pickup) => pickup.kind === kind)
      .reduce((sum, pickup) => sum + scaledResource(pickup.amount, profile.resourceMultiplier), 0);
    const conservativeMinimumTelegraphTicks = Math.max(10, Math.round(18 * profile.telegraphTicksMultiplier));
    if (totalRobotHealth <= 0 || totalDavelCoins <= 0 || conservativeMinimumTelegraphTicks < 10
      || profile.maximumAttackTokens < 1 || profile.maximumAttackTokens > 24) {
      throw new Error(`${levelId} ${difficulty} has an invalid bounded difficulty budget`);
    }
    return {
      levelId,
      difficulty,
      graphAndObjectiveReachable: true,
      totalRobotHealth,
      totalDavelCoins,
      healthPickupBudget: pickupBudget('health'),
      energyPickupBudget: pickupBudget('energy'),
      optionalCoinBudget: pickupBudget('coin'),
      interWaveDelayTicks: profile.interWaveDelayTicks,
      conservativeMinimumTelegraphTicks,
      maximumAttackTokens: profile.maximumAttackTokens,
      aimAssistRadians: profile.aimAssistRadians,
    };
  }));
}
