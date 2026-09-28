import { afterEach, describe, expect, it } from 'vitest';
import { applyProgress, captureProgress, clearProgress, describeArsenal, loadProgress, saveProgress } from '../src/player/progress';
import { RifleState } from '../src/player/rifle-state';
import { CarbineState } from '../src/weapons/carbine-state';
import type { Loadout } from '../src/player/loot';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; }, clear: () => data.clear(), key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, String(value)); }, removeItem: (key) => { data.delete(key); },
  };
}

afterEach(() => { delete (globalThis as { localStorage?: Storage }).localStorage; });

describe('carrying weapons between worlds', () => {
  it('saves the arsenal on reaching world 2 and restores it after the page is reopened', () => {
    (globalThis as { localStorage?: Storage }).localStorage = memoryStorage();
    const rifle = new RifleState();
    rifle.capacity = 10; rifle.zoomLevels = 3; rifle.magazine = 4; rifle.reserve = 11;
    const carbine = new CarbineState();
    carbine.take(); carbine.magazine = 9; carbine.reserve = 30;
    const loadout: Loadout = { health: 40, armor: 60, lives: 1, money: 250, suppressor: true };
    saveProgress(captureProgress(1, 'carbine', rifle, carbine, loadout));

    const saved = loadProgress(3)!;
    expect(saved.world).toBe(1);
    const freshRifle = new RifleState();
    const freshCarbine = new CarbineState();
    const freshLoadout: Loadout = { health: 100, armor: 0, lives: 0, money: 0, suppressor: false };
    expect(applyProgress(saved, freshRifle, freshCarbine, freshLoadout)).toBe('carbine');
    expect(freshRifle.capacity).toBe(10);
    expect(freshRifle.zoomLevels).toBe(3);
    expect(freshRifle.magazine + freshRifle.reserve).toBe(15);
    expect(freshCarbine.owned).toBe(true);
    expect(freshCarbine.magazine + freshCarbine.reserve).toBe(39);
    expect(freshLoadout).toMatchObject({ armor: 60, lives: 1, money: 250, suppressor: true, health: 100 });
    expect(describeArsenal(saved)).toBe('sniper rifle (suppressor, 12x scope, 10-round magazine) + robot carbine (39 rounds) + 60 armor');

    clearProgress();
    expect(loadProgress(3)).toBeNull();
  });

  it('ignores missing, broken, or out-of-range saves, and works without storage', () => {
    expect(loadProgress(3)).toBeNull();
    const storage = memoryStorage();
    (globalThis as { localStorage?: Storage }).localStorage = storage;
    storage.setItem('zama-sniper-progress', '{not json');
    expect(loadProgress(3)).toBeNull();
    storage.setItem('zama-sniper-progress', JSON.stringify({ version: 1, world: 7 }));
    expect(loadProgress(3)).toBeNull();
  });
});
