import { CHAPTER_01_LEVELS, type Chapter01LevelId } from '../content/levels/chapter-01';
import { createLevelRuntime } from '../sim/interactions';
import { campaignRobotWaves, ROBOT_DEFINITIONS } from '../sim/robots';
import { MAX_WEAPON_UPGRADE_LEVEL, type WeaponUpgradeId } from '../sim/weapons';
import { MAX_PLAYER_UPGRADE_LEVEL, type PlayerUpgradeId } from '../sim/player-upgrades';
import {
  PLAYER_UPGRADE_CATALOG, WEAPON_UPGRADE_CATALOG, playerUpgradeCost, weaponUpgradeCost,
} from '../storage/economy';

export interface WaveBalanceReport {
  readonly waveIndex: number;
  readonly robotIds: readonly number[];
  readonly robotCount: number;
  readonly totalHealth: number;
  readonly guaranteedCoins: number;
  readonly rangedRobots: number;
  readonly eliteRobots: number;
  readonly bossRobots: number;
  readonly pressureScore: number;
}

export interface LevelBalanceReport {
  readonly levelId: Chapter01LevelId;
  readonly levelNumber: number;
  readonly objectiveTargetCount: number;
  readonly declaredPeakRobots: number;
  readonly actualPeakRobots: number;
  readonly guaranteedCoins: number;
  readonly optionalCacheCoins: number;
  readonly cumulativeGuaranteedCoins: number;
  readonly cumulativeMaximumCoins: number;
  readonly totalRobotHealth: number;
  readonly coinsPerHundredHealth: number;
  readonly waves: readonly WaveBalanceReport[];
}

export interface UpgradeCostReport {
  readonly id: WeaponUpgradeId | PlayerUpgradeId;
  readonly fullCost: number;
  readonly firstGuaranteedAffordableLevel: number | null;
}

export interface Chapter01BalanceReport {
  readonly schemaVersion: 1;
  readonly levels: readonly LevelBalanceReport[];
  readonly guaranteedChapterCoins: number;
  readonly optionalCacheCoins: number;
  readonly maximumChapterCoins: number;
  readonly fullUpgradeCatalogCost: number;
  readonly fullCatalogGuaranteedAffordableLevel: number | null;
  readonly upgradeCosts: readonly UpgradeCostReport[];
}

function round(value: number): number { return Math.round(value * 100) / 100; }

function waveReport(robotIds: readonly number[], waveIndex: number, hazardCount: number): WaveBalanceReport {
  const robots = robotIds.map((id) => ROBOT_DEFINITIONS[id]!);
  const totalHealth = robots.reduce((sum, robot) => sum + robot.maxHealth, 0);
  const rangedRobots = robots.filter((robot) => robot.archetype !== 'wobble-scout').length;
  const eliteRobots = robots.filter((robot) => robot.rank === 'elite').length;
  const bossRobots = robots.filter((robot) => robot.rank === 'boss').length;
  return {
    waveIndex, robotIds: [...robotIds], robotCount: robots.length, totalHealth,
    guaranteedCoins: robots.reduce((sum, robot) => sum + robot.coinReward, 0),
    rangedRobots, eliteRobots, bossRobots,
    pressureScore: round(totalHealth / 100 + rangedRobots * 0.5 + eliteRobots * 1.25 + bossRobots * 4 + hazardCount * 0.5),
  };
}

function fullUpgradeCost(id: WeaponUpgradeId): number {
  let total = 0;
  for (let level = 0; level < MAX_WEAPON_UPGRADE_LEVEL; level += 1) total += weaponUpgradeCost(id, level);
  return total;
}

function fullPlayerUpgradeCost(id: PlayerUpgradeId): number {
  let total = 0;
  for (let level = 0; level < MAX_PLAYER_UPGRADE_LEVEL; level += 1) total += playerUpgradeCost(id, level);
  return total;
}

function rosterSignature(entries: readonly { readonly archetype: string; readonly rank: string }[]): string {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const rank = entry.rank === 'ordinary' ? 'normal' : entry.rank;
    const key = `${entry.archetype}:${rank}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([first], [second]) => first.localeCompare(second)).map(([key, count]) => `${key}=${count}`).join('|');
}

export function createChapter01BalanceReport(): Chapter01BalanceReport {
  let cumulativeGuaranteedCoins = 0;
  let cumulativeMaximumCoins = 0;
  const levels = CHAPTER_01_LEVELS.map((level): LevelBalanceReport => {
    const levelId = level.id as Chapter01LevelId;
    const runtimeWaves = campaignRobotWaves(levelId);
    const waveReports = runtimeWaves.map((ids, index) => waveReport(ids, index, level.maze.hazards.length));
    const authoredWaves = level.encounters.flatMap((encounter) => encounter.waves);
    if (authoredWaves.length !== runtimeWaves.length) throw new Error(`${levelId} authored wave count differs from runtime`);
    for (const [index, runtimeIds] of runtimeWaves.entries()) {
      const runtimeSignature = rosterSignature(runtimeIds.map((id) => ROBOT_DEFINITIONS[id]!));
      const authoredSignature = rosterSignature(authoredWaves[index]!.spawnGroups.flatMap(
        (group) => Array.from({ length: group.count }, () => ({ archetype: group.archetypeId, rank: group.rank })),
      ));
      if (runtimeSignature !== authoredSignature) {
        throw new Error(`${levelId} wave ${index + 1} authored roster ${authoredSignature} differs from runtime ${runtimeSignature}`);
      }
    }
    const runtimeRobotCount = waveReports.reduce((sum, wave) => sum + wave.robotCount, 0);
    const objectiveTargetCount = level.objectives.find((objective) => objective.required)!.targetCount;
    if (objectiveTargetCount !== runtimeRobotCount) throw new Error(`${levelId} objective target count differs from its runtime roster`);
    const actualPeakRobots = Math.max(...waveReports.map((wave) => wave.robotCount));
    if (level.performance.maxActiveRobots !== actualPeakRobots) throw new Error(`${levelId} robot budget differs from its runtime peak`);
    const guaranteedCoins = waveReports.reduce((sum, wave) => sum + wave.guaranteedCoins, 0);
    const runtime = createLevelRuntime(levelId);
    const optionalCacheCoins = runtime.pickups.filter((pickup) => pickup.kind === 'coin').reduce((sum, pickup) => sum + pickup.amount, 0);
    const totalRobotHealth = waveReports.reduce((sum, wave) => sum + wave.totalHealth, 0);
    cumulativeGuaranteedCoins += guaranteedCoins;
    cumulativeMaximumCoins += guaranteedCoins + optionalCacheCoins;
    return {
      levelId, levelNumber: level.number, objectiveTargetCount,
      declaredPeakRobots: level.performance.maxActiveRobots, actualPeakRobots,
      guaranteedCoins, optionalCacheCoins, cumulativeGuaranteedCoins, cumulativeMaximumCoins,
      totalRobotHealth, coinsPerHundredHealth: round(guaranteedCoins / totalRobotHealth * 100),
      waves: waveReports,
    };
  });
  const upgradeCosts = [...WEAPON_UPGRADE_CATALOG, ...PLAYER_UPGRADE_CATALOG].map((upgrade): UpgradeCostReport => {
    const fullCost = 'maxHealth' === upgrade.id || 'maxEnergy' === upgrade.id
      ? fullPlayerUpgradeCost(upgrade.id)
      : fullUpgradeCost(upgrade.id);
    return {
      id: upgrade.id, fullCost,
      firstGuaranteedAffordableLevel: levels.find((level) => level.cumulativeGuaranteedCoins >= fullCost)?.levelNumber ?? null,
    };
  });
  const fullUpgradeCatalogCost = upgradeCosts.reduce((sum, upgrade) => sum + upgrade.fullCost, 0);
  return {
    schemaVersion: 1, levels,
    guaranteedChapterCoins: cumulativeGuaranteedCoins,
    optionalCacheCoins: levels.reduce((sum, level) => sum + level.optionalCacheCoins, 0),
    maximumChapterCoins: cumulativeMaximumCoins,
    fullUpgradeCatalogCost,
    fullCatalogGuaranteedAffordableLevel: levels.find(
      (level) => level.cumulativeGuaranteedCoins >= fullUpgradeCatalogCost,
    )?.levelNumber ?? null,
    upgradeCosts,
  };
}
