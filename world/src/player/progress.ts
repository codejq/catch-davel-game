import type { CarbineState, WeaponName } from '../weapons/carbine-state';
import type { Loadout } from './loot';
import type { RifleState } from './rifle-state';

/**
 * What the sniper takes from one world to the next, and keeps if the page is closed and reopened: the world reached
 * and the arsenal (rifle upgrades and rounds, the robot carbine, armor, cash, spare lives).
 */
export interface Progress {
  readonly version: 1;
  readonly world: number;
  readonly weapon: WeaponName;
  readonly rifle: { readonly capacity: number; readonly zoomLevels: number; readonly reserve: number; readonly suppressor: boolean };
  readonly carbine: { readonly owned: boolean; readonly magazine: number; readonly reserve: number };
  readonly armor: number;
  readonly money: number;
  readonly lives: number;
}

const KEY = 'zama-sniper-progress';

export function captureProgress(world: number, weapon: WeaponName, rifle: RifleState, carbine: CarbineState, loadout: Loadout): Progress {
  return {
    version: 1, world, weapon,
    rifle: { capacity: rifle.capacity, zoomLevels: rifle.zoomLevels, reserve: rifle.reserve + rifle.magazine, suppressor: loadout.suppressor },
    carbine: { owned: carbine.owned, magazine: carbine.magazine, reserve: carbine.reserve },
    armor: loadout.armor, money: loadout.money, lives: loadout.lives,
  };
}

/** Restores a saved arsenal. The rifle arrives with a full magazine; health is always full in a new world. */
export function applyProgress(progress: Progress, rifle: RifleState, carbine: CarbineState, loadout: Loadout): WeaponName {
  rifle.capacity = progress.rifle.capacity;
  rifle.zoomLevels = progress.rifle.zoomLevels;
  rifle.magazine = Math.min(rifle.capacity, progress.rifle.reserve);
  rifle.reserve = Math.max(0, progress.rifle.reserve - rifle.magazine);
  loadout.suppressor = progress.rifle.suppressor;
  carbine.owned = progress.carbine.owned;
  carbine.magazine = progress.carbine.magazine;
  carbine.reserve = progress.carbine.reserve;
  loadout.armor = progress.armor;
  loadout.money = progress.money;
  loadout.lives = progress.lives;
  return progress.carbine.owned ? progress.weapon : 'rifle';
}

/** Short description of what came along, for the arrival card and the menu: "rifle (suppressor) + robot carbine (48 rounds)". */
export function describeArsenal(progress: Progress): string {
  const upgrades = [progress.rifle.suppressor ? 'suppressor' : null, progress.rifle.zoomLevels > 2 ? '12x scope' : null, progress.rifle.capacity > 5 ? `${progress.rifle.capacity}-round magazine` : null]
    .filter(Boolean).join(', ');
  const rifle = `sniper rifle${upgrades ? ` (${upgrades})` : ''}`;
  const carbine = progress.carbine.owned ? ` + robot carbine (${progress.carbine.magazine + progress.carbine.reserve} rounds)` : '';
  const armor = progress.armor > 0 ? ` + ${Math.round(progress.armor)} armor` : '';
  return `${rifle}${carbine}${armor}`;
}

function valid(value: unknown): value is Progress {
  const p = value as Progress | null;
  const finite = (n: unknown): boolean => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  return p !== null && typeof p === 'object' && p.version === 1 && Number.isInteger(p.world) && p.world >= 0
    && (p.weapon === 'rifle' || p.weapon === 'carbine') && typeof p.rifle === 'object' && typeof p.carbine === 'object'
    && finite(p.rifle.capacity) && finite(p.rifle.zoomLevels) && finite(p.rifle.reserve) && typeof p.rifle.suppressor === 'boolean'
    && typeof p.carbine.owned === 'boolean' && finite(p.carbine.magazine) && finite(p.carbine.reserve)
    && finite(p.armor) && finite(p.money) && finite(p.lives);
}

/** Browser storage can be missing or blocked (private windows, previews): every access is guarded. */
export function loadProgress(worlds: number): Progress | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return valid(parsed) && parsed.world < worlds ? parsed : null;
  } catch {
    return null;
  }
}

export function saveProgress(progress: Progress): void {
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* storage unavailable: progress lasts this session only */ }
}

export function clearProgress(): void {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}
