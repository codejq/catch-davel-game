import { describe, expect, it } from 'vitest';
import {
  COMBO_WINDOW_TICKS, createRunMetrics, recordDamageTaken, recordRangedAttack, recordRobotDefeat,
} from '../src/sim/run-metrics';

describe('authoritative run metrics', () => {
  it('tracks ranged accuracy and positive damage without accepting invalid samples', () => {
    const metrics = createRunMetrics(12);
    recordRangedAttack(metrics, true);
    recordRangedAttack(metrics, false);
    recordDamageTaken(metrics, 7.25);
    recordDamageTaken(metrics, -2);
    recordDamageTaken(metrics, Number.NaN);
    expect(metrics).toMatchObject({
      startingCoins: 12, rangedAttacksFired: 2, rangedAttacksHit: 1, damageTaken: 7.25,
    });
  });

  it('deduplicates Davels and opens a deterministic three-second combo window', () => {
    const metrics = createRunMetrics();
    recordRobotDefeat(metrics, 3, 40);
    recordRobotDefeat(metrics, 3, 41);
    recordRobotDefeat(metrics, 4, 40 + COMBO_WINDOW_TICKS);
    recordRobotDefeat(metrics, 5, 221 + COMBO_WINDOW_TICKS);
    expect(metrics.defeatedRobotIds).toEqual([3, 4, 5]);
    expect(metrics).toMatchObject({ currentCombo: 1, highestCombo: 2, comboExpiresTick: 581 });
  });
});
