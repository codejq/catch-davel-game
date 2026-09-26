import { valueNoise } from '../core/noise';
import type { Stance } from './body';

export const MAGAZINE_SIZE = 5;
export const BOLT_SECONDS = 1.15;
export const RELOAD_SECONDS = 2.8;
export const SCOPE_ZOOMS = [4, 8] as const;

/** Bolt-action sniper rifle state: ammo, bolt cycling, reload, aim-down-sights blend, and scope sway. */
export class RifleState {
  magazine = MAGAZINE_SIZE;
  /** Rounds a full magazine holds; extended magazines found behind doors raise it. */
  capacity = MAGAZINE_SIZE;
  reserve = 20;
  cooldown = 0;
  reloadTime = 0;
  aim = 0;
  zoomIndex = 0;
  breath = 100;
  holdingBreath = false;
  recoil = 0;
  sinceShot = 99;

  get reloading(): boolean { return this.reloadTime > 0; }

  get zoom(): number { return SCOPE_ZOOMS[this.zoomIndex]!; }

  canFire(): boolean { return this.magazine > 0 && this.cooldown <= 0 && !this.reloading; }

  fire(): boolean {
    if (!this.canFire()) return false;
    this.magazine -= 1;
    this.cooldown = BOLT_SECONDS;
    this.recoil = 1;
    this.sinceShot = 0;
    return true;
  }

  startReload(): boolean {
    if (this.reloading || this.magazine >= this.capacity || this.reserve <= 0) return false;
    this.reloadTime = RELOAD_SECONDS;
    return true;
  }

  update(dt: number, aiming: boolean, wantsBreath: boolean): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.sinceShot += dt;
    this.recoil = Math.max(0, this.recoil - dt * 3.2);
    if (this.reloadTime > 0) {
      this.reloadTime -= dt;
      if (this.reloadTime <= 0) {
        const loaded = Math.min(this.capacity - this.magazine, this.reserve);
        this.magazine += loaded;
        this.reserve -= loaded;
        this.reloadTime = 0;
      }
    }
    const canAim = aiming && !this.reloading;
    this.aim += ((canAim ? 1 : 0) - this.aim) * Math.min(1, dt * 9);
    this.holdingBreath = wantsBreath && this.aim > 0.8 && this.breath > 0;
    this.breath = Math.max(0, Math.min(100, this.breath + (this.holdingBreath ? -22 : 14) * dt));
  }

  /** Scope sway in radians (yaw, pitch). Prone and held breath steady the reticle; moving and fatigue shake it. */
  sway(time: number, stance: Stance, moving: boolean, stamina: number): { yaw: number; pitch: number } {
    const base = stance === 'prone' ? 0.0012 : stance === 'crouch' ? 0.0028 : 0.0048;
    const movement = moving ? 3 : 1;
    const fatigue = 1 + (100 - stamina) / 60;
    const breath = this.holdingBreath ? 0.15 : 1;
    const amplitude = base * movement * fatigue * breath * this.aim;
    return {
      yaw: (valueNoise(time * 0.7, 3.1) - 0.5) * 2 * amplitude + Math.sin(time * 0.9) * amplitude * 0.5,
      pitch: (valueNoise(time * 0.6, 7.7) - 0.5) * 2 * amplitude + Math.sin(time * 1.6) * amplitude * 0.35,
    };
  }
}
