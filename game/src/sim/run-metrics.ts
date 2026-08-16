export const COMBO_WINDOW_TICKS = 180;

export interface RunMetrics {
  startingCoins: number;
  rangedAttacksFired: number;
  rangedAttacksHit: number;
  damageTaken: number;
  readonly defeatedRobotIds: number[];
  secretsFound: number;
  currentCombo: number;
  highestCombo: number;
  comboExpiresTick: number;
}

export function createRunMetrics(startingCoins = 0): RunMetrics {
  return {
    startingCoins,
    rangedAttacksFired: 0,
    rangedAttacksHit: 0,
    damageTaken: 0,
    defeatedRobotIds: [],
    secretsFound: 0,
    currentCombo: 0,
    highestCombo: 0,
    comboExpiresTick: 0,
  };
}

export function recordRangedAttack(metrics: RunMetrics, hit: boolean): void {
  metrics.rangedAttacksFired += 1;
  if (hit) metrics.rangedAttacksHit += 1;
}

export function recordDamageTaken(metrics: RunMetrics, damage: number): void {
  if (Number.isFinite(damage) && damage > 0) metrics.damageTaken += damage;
}

export function recordRobotDefeat(metrics: RunMetrics, robotId: number, tick: number): void {
  if (metrics.defeatedRobotIds.includes(robotId)) return;
  metrics.defeatedRobotIds.push(robotId);
  metrics.currentCombo = tick <= metrics.comboExpiresTick ? metrics.currentCombo + 1 : 1;
  metrics.highestCombo = Math.max(metrics.highestCombo, metrics.currentCombo);
  metrics.comboExpiresTick = tick + COMBO_WINDOW_TICKS;
}
