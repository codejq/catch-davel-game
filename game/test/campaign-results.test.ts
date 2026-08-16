import { describe, expect, it } from 'vitest';
import { campaignResultSummary, formatCampaignTicks } from '../src/campaign/results';
import { completeCampaignLevel } from '../src/campaign/progression';
import { createDefaultProfile } from '../src/storage/profile';
import { createRunMetrics } from '../src/sim/run-metrics';

describe('campaign result summary', () => {
  it('awards and preserves the authored Standard par medal and next mission', () => {
    const profile = createDefaultProfile('result-proof');
    const metrics = createRunMetrics();
    metrics.rangedAttacksFired = 10;
    metrics.rangedAttacksHit = 8;
    metrics.defeatedRobotIds.push(0, 1, 2, 3, 4, 5);
    metrics.highestCombo = 3;
    const summary = campaignResultSummary(profile, 'level-001', 4_800, 17, metrics, '0123456789abcdef');
    expect(summary).toMatchObject({
      previousBestTicks: null, bestTicks: 4_800, newBest: true, parTicks: 5_000,
      parMedal: true, coinsEarned: 17, availableCoins: 17, nextLevelId: 'level-002',
      score: 3_445, accuracyPermille: 800, damageTaken: 0, highestCombo: 3, medalTier: 'quantum',
      seed: 'campaign-level-001-v1', replayChecksum: '0123456789abcdef',
    });
    expect(summary.robotsByArchetype).toEqual({
      'wobble-scout': 2, 'blue-slider': 1, 'yellow-spinner': 1,
      'red-firemouth': 1, 'cyan-dj': 1, 'invoice-overlord': 0,
    });
    const completed = completeCampaignLevel(profile, 'level-001', 4_800, summary);
    expect(completed.levelProgress[0]?.medals).toContain('par-time');
    expect(completed.levelProgress[0]).toMatchObject({
      bestScore: summary.score, bestAccuracyPermille: 800, leastDamageTaken: 0,
      mostSecretsFound: 0, highestCombo: 3, bestReplayId: summary.replayId,
      lastResult: { medalTier: 'quantum', replayChecksum: '0123456789abcdef' },
    });
    const slower = completeCampaignLevel(completed, 'level-001', 5_500);
    expect(slower.levelProgress[0]?.bestTicks).toBe(4_800);
    expect(slower.levelProgress[0]?.medals).toContain('par-time');
    expect(formatCampaignTicks(4_800)).toBe('01:20.000');
  });
});
