// Presentation-only excitement layer. It watches authoritative events and snapshots and turns streaks,
// comebacks, and combo milestones into announcer callouts. It never feeds back into the simulation.

export const MULTI_CATCH_WINDOW_TICKS = 240;
export const CLUTCH_HEALTH_RATIO = 0.25;
export const COMBO_MILESTONES = [5, 10, 20] as const;

export type HypeCalloutKey =
  | 'hypeFirstCatch' | 'hypeDoubleCatch' | 'hypeTripleCatch' | 'hypeQuadCatch' | 'hypeFrenzy'
  | 'hypeClutch' | 'hypeLastDavel' | 'hypeComboFire' | 'hypeComboBlaze' | 'hypeComboLegend';

export interface HypeCallout {
  readonly key: HypeCalloutKey;
  /** 1 = warm-up, 2 = big moment, 3 = legendary. Drives size, colour, and cue pitch. */
  readonly tier: 1 | 2 | 3;
  readonly streak: number;
  readonly combo: number;
}

const MULTI_CATCH_KEYS: readonly HypeCalloutKey[] = ['hypeDoubleCatch', 'hypeTripleCatch', 'hypeQuadCatch'];
const COMBO_KEYS: Readonly<Record<typeof COMBO_MILESTONES[number], HypeCalloutKey>> = {
  5: 'hypeComboFire', 10: 'hypeComboBlaze', 20: 'hypeComboLegend',
};

export class HypeAnnouncer {
  private streak = 0;
  private lastDefeatTick = Number.NEGATIVE_INFINITY;
  private catches = 0;
  private lastRemaining: number | null = null;
  private highestComboMilestone = 0;

  reset(): void {
    this.streak = 0;
    this.lastDefeatTick = Number.NEGATIVE_INFINITY;
    this.catches = 0;
    this.lastRemaining = null;
    this.highestComboMilestone = 0;
  }

  /** Current multi-catch streak, useful for HUD styling. */
  get currentStreak(): number { return this.streak; }

  robotDefeated(tick: number, playerHealthRatio: number, combo = 0): HypeCallout | null {
    this.streak = tick - this.lastDefeatTick <= MULTI_CATCH_WINDOW_TICKS ? this.streak + 1 : 1;
    this.lastDefeatTick = tick;
    this.catches += 1;
    if (this.streak >= 2) {
      const index = Math.min(this.streak - 2, MULTI_CATCH_KEYS.length);
      const key = index < MULTI_CATCH_KEYS.length ? MULTI_CATCH_KEYS[index]! : 'hypeFrenzy';
      return { key, tier: this.streak >= 4 ? 3 : 2, streak: this.streak, combo };
    }
    if (Number.isFinite(playerHealthRatio) && playerHealthRatio > 0 && playerHealthRatio <= CLUTCH_HEALTH_RATIO) {
      return { key: 'hypeClutch', tier: 2, streak: this.streak, combo };
    }
    if (this.catches === 1) return { key: 'hypeFirstCatch', tier: 1, streak: 1, combo };
    return null;
  }

  remainingChanged(remaining: number, total: number): HypeCallout | null {
    const previous = this.lastRemaining;
    this.lastRemaining = remaining;
    if (previous === null || total < 3) return null;
    if (previous > 1 && remaining === 1) return { key: 'hypeLastDavel', tier: 2, streak: this.streak, combo: 0 };
    return null;
  }

  comboChanged(combo: number): HypeCallout | null {
    if (combo < 2) {
      this.highestComboMilestone = 0;
      return null;
    }
    let reached = 0;
    for (const milestone of COMBO_MILESTONES) if (combo >= milestone) reached = milestone;
    if (reached === 0 || reached <= this.highestComboMilestone) return null;
    this.highestComboMilestone = reached;
    const tier = reached >= 20 ? 3 : reached >= 10 ? 2 : 1;
    return { key: COMBO_KEYS[reached as typeof COMBO_MILESTONES[number]], tier, streak: this.streak, combo };
  }
}

/** Combo heat tier for HUD styling: 0 idle, 1 warm (×3+), 2 hot (×5+), 3 blazing (×10+). */
export function comboHeatTier(combo: number): 0 | 1 | 2 | 3 {
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  if (combo >= 3) return 1;
  return 0;
}

/** Heartbeat intensity from 0 (healthy) to 1 (critical) once health drops below 35%. */
export function lowHealthIntensity(health: number, maxHealth: number): number {
  if (!(maxHealth > 0) || !Number.isFinite(health) || health <= 0) return 0;
  const ratio = health / maxHealth;
  if (ratio >= 0.35) return 0;
  return Math.round(Math.min(1, (0.35 - ratio) / 0.25) * 100) / 100;
}
