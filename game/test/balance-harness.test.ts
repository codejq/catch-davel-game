import { describe, expect, it } from 'vitest';
import { createCampaignBalanceReport } from '../src/qa/balance-harness';

const report = createCampaignBalanceReport();

describe('playable campaign robot-wave and coin-economy balance harness', () => {
  it('reconciles every runtime roster, objective target, and peak budget', () => {
    expect(report.levels).toHaveLength(14);
    for (const level of report.levels) {
      expect(level.objectiveTargetCount, level.levelId).toBe(level.waves.reduce((sum, wave) => sum + wave.robotCount, 0));
      expect(level.declaredPeakRobots, level.levelId).toBe(level.actualPeakRobots);
      expect(level.guaranteedCoins, level.levelId).toBeGreaterThan(0);
      expect(level.totalRobotHealth, level.levelId).toBeGreaterThan(0);
      expect(level.coinsPerHundredHealth, level.levelId).toBeGreaterThan(0);
    }
  });

  it('funds the complete current upgrade catalog from guaranteed first-clear combat income', () => {
    expect(report.guaranteedChapterCoins).toBeGreaterThanOrEqual(report.fullUpgradeCatalogCost);
    expect(report.fullUpgradeCatalogCost).toBe(222);
    expect(report.fullCatalogGuaranteedAffordableLevel).toBe(9);
    expect(report.maximumChapterCoins).toBe(report.guaranteedChapterCoins + report.optionalCacheCoins);
    expect(report.upgradeCosts).toHaveLength(7);
    expect(report.upgradeCosts.every((upgrade) => upgrade.firstGuaranteedAffordableLevel !== null)).toBe(true);
  });

  it('prints the canonical balance report for review tooling', () => {
    console.log(`CAMPAIGN_BALANCE_REPORT=${JSON.stringify(report)}`);
    expect(report.schemaVersion).toBe(1);
  });
});
