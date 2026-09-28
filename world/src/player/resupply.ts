import type { CarbineState } from '../weapons/carbine-state';
import type { RifleState } from './rifle-state';

/**
 * Nothing stays empty for ever: while a weapon is low it slowly gets rounds back (a round every few seconds, up to
 * a small floor, so found ammo still matters), and health creeps back up after a few seconds without being hurt.
 */
export const RESUPPLY = {
  /** Seconds per rifle round, while the rifle holds fewer than `rifleFloor` rounds in all. */
  rifleEvery: 4,
  rifleFloor: 10,
  carbineEvery: 0.8,
  carbineFloor: 24,
  /** Seconds without damage before health starts coming back, and how fast (points per second). */
  healthDelay: 5,
  healthRate: 4,
  maxHealth: 100,
} as const;

export class Resupply {
  private rifleTimer = 0;
  private carbineTimer = 0;

  /** True while the rifle is low enough to be resupplying. */
  rifleLow(rifle: RifleState): boolean { return rifle.magazine + rifle.reserve < RESUPPLY.rifleFloor; }

  carbineLow(carbine: CarbineState): boolean { return carbine.owned && carbine.magazine + carbine.reserve < RESUPPLY.carbineFloor; }

  /** Advances resupply and healing. Returns the rounds added and health restored this step. */
  step(dt: number, rifle: RifleState, carbine: CarbineState, loadout: { health: number }, sinceHurt: number): { rifle: number; carbine: number; healed: number } {
    let rifleRounds = 0;
    let carbineRounds = 0;
    if (this.rifleLow(rifle)) {
      this.rifleTimer += dt;
      while (this.rifleTimer >= RESUPPLY.rifleEvery && this.rifleLow(rifle)) { this.rifleTimer -= RESUPPLY.rifleEvery; rifle.reserve += 1; rifleRounds += 1; }
    } else {
      this.rifleTimer = 0;
    }
    if (this.carbineLow(carbine)) {
      this.carbineTimer += dt;
      while (this.carbineTimer >= RESUPPLY.carbineEvery && this.carbineLow(carbine)) { this.carbineTimer -= RESUPPLY.carbineEvery; carbine.reserve += 1; carbineRounds += 1; }
    } else {
      this.carbineTimer = 0;
    }
    // An empty magazine reloads itself as soon as there is something to load.
    if (rifle.magazine === 0 && rifle.reserve > 0 && rifle.cooldown <= 0) rifle.startReload();
    if (carbine.owned && carbine.magazine === 0 && carbine.reserve > 0) carbine.startReload();
    let healed = 0;
    if (sinceHurt > RESUPPLY.healthDelay && loadout.health > 0 && loadout.health < RESUPPLY.maxHealth) {
      healed = Math.min(RESUPPLY.maxHealth - loadout.health, RESUPPLY.healthRate * dt);
      loadout.health += healed;
    }
    return { rifle: rifleRounds, carbine: carbineRounds, healed };
  }
}
