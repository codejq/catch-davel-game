/** The robots' automatic carbine, taken from a destroyed robot: fast-firing, short-ranged, no scope. */
export const CARBINE = {
  magazine: 24,
  /** Seconds between rounds while the trigger is held. */
  fireInterval: 0.11,
  reloadSeconds: 2.1,
  damage: 34,
  headDamage: 100,
  /** Muzzle velocity, m/s. */
  speed: 700,
  /** Base cone of fire in radians, widened by sustained fire and by firing from the hip. */
  spread: 0.004,
  hipSpread: 0.02,
  /** Aim-down-sights magnification. */
  zoom: 1.6,
  /** Rounds that come with each carbine taken from a robot. */
  roundsPerPickup: 48,
  /** Armor plates salvaged from the robot along with its carbine. */
  armorPerPickup: 25,
} as const;

export class CarbineState {
  owned = false;
  magazine = 0;
  reserve = 0;
  cooldown = 0;
  reloadTime = 0;
  aim = 0;
  recoil = 0;
  /** Builds up while firing and widens the cone; cools off quickly. */
  heat = 0;
  sinceShot = 99;

  get reloading(): boolean { return this.reloadTime > 0; }

  canFire(): boolean { return this.owned && this.magazine > 0 && this.cooldown <= 0 && !this.reloading; }

  /** Current cone of fire in radians. */
  spread(): number { return CARBINE.spread + (1 - this.aim) * CARBINE.hipSpread + this.heat * 0.018; }

  fire(): boolean {
    if (!this.canFire()) return false;
    this.magazine -= 1;
    this.cooldown = CARBINE.fireInterval;
    this.recoil = Math.min(1, this.recoil + 0.35);
    this.heat = Math.min(1, this.heat + 0.12);
    this.sinceShot = 0;
    return true;
  }

  startReload(): boolean {
    if (!this.owned || this.reloading || this.magazine >= CARBINE.magazine || this.reserve <= 0) return false;
    this.reloadTime = CARBINE.reloadSeconds;
    return true;
  }

  update(dt: number, aiming: boolean): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.sinceShot += dt;
    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.heat = Math.max(0, this.heat - dt * (this.sinceShot > 0.25 ? 2.5 : 0.4));
    if (this.reloadTime > 0) {
      this.reloadTime -= dt;
      if (this.reloadTime <= 0) {
        const loaded = Math.min(CARBINE.magazine - this.magazine, this.reserve);
        this.magazine += loaded;
        this.reserve -= loaded;
        this.reloadTime = 0;
      }
    }
    this.aim += ((aiming && !this.reloading ? 1 : 0) - this.aim) * Math.min(1, dt * 10);
  }

  /** Takes a carbine off a destroyed robot: the first unlocks the weapon, later ones are stripped for rounds. */
  take(): { unlocked: boolean; rounds: number } {
    if (!this.owned) {
      this.owned = true;
      this.magazine = CARBINE.magazine;
      this.reserve += CARBINE.roundsPerPickup - CARBINE.magazine;
      return { unlocked: true, rounds: CARBINE.roundsPerPickup };
    }
    this.reserve += CARBINE.roundsPerPickup;
    return { unlocked: false, rounds: CARBINE.roundsPerPickup };
  }
}

export type WeaponName = 'rifle' | 'carbine';
