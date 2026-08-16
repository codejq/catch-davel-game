import { describe, expect, it } from 'vitest';
import { campaignResultSummary, formatCampaignTicks } from '../src/campaign/results';
import { completeCampaignLevel } from '../src/campaign/progression';
import { createDefaultProfile } from '../src/storage/profile';

describe('campaign result summary', () => {
  it('awards and preserves the authored Standard par medal and next mission', () => {
    const profile = createDefaultProfile('result-proof');
    const summary = campaignResultSummary(profile, 'level-001', 4_800, 17);
    expect(summary).toMatchObject({
      previousBestTicks: null, bestTicks: 4_800, newBest: true, parTicks: 5_000,
      parMedal: true, coinsEarned: 17, nextLevelId: 'level-002',
    });
    const completed = completeCampaignLevel(profile, 'level-001', 4_800);
    expect(completed.levelProgress[0]?.medals).toContain('par-time');
    const slower = completeCampaignLevel(completed, 'level-001', 5_500);
    expect(slower.levelProgress[0]).toMatchObject({ bestTicks: 4_800, medals: ['par-time'] });
    expect(formatCampaignTicks(4_800)).toBe('01:20.000');
  });
});
