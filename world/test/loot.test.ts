import { describe, expect, it } from 'vitest';
import { Random } from '../src/core/random';
import { applyLoot, DOOR_LOOT_CHANCE, MAX_CAPACITY, rollDoorLoot, takeDamage, type Loadout, type LootKind } from '../src/player/loot';
import { MAGAZINE_SIZE, RifleState } from '../src/player/rifle-state';

const fresh = (): Loadout => ({ health: 100, armor: 0, lives: 0, money: 0 });

describe('door loot', () => {
  it('usually finds something, and every kind of find turns up', () => {
    const random = new Random('doors');
    const kinds = new Set<LootKind>();
    let found = 0;
    const doors = 2000;
    for (let door = 0; door < doors; door += 1) {
      const drop = rollDoorLoot(random);
      if (drop === null) continue;
      found += 1;
      kinds.add(drop.kind);
      expect(drop.amount).toBeGreaterThan(0);
    }
    expect(found / doors).toBeGreaterThan(DOOR_LOOT_CHANCE - 0.05);
    expect(found / doors).toBeLessThan(DOOR_LOOT_CHANCE + 0.05);
    expect([...kinds].sort()).toEqual(['ammo', 'armor', 'life', 'magazine', 'medkit', 'money']);
  });

  it('pickups add cash, ammo, armor, health, lives, and magazine capacity', () => {
    const loadout = fresh();
    loadout.health = 30;
    const rifle = new RifleState();
    applyLoot({ kind: 'money', amount: 150 }, loadout, rifle);
    applyLoot({ kind: 'ammo', amount: 6 }, loadout, rifle);
    applyLoot({ kind: 'armor', amount: 40 }, loadout, rifle);
    applyLoot({ kind: 'medkit', amount: 40 }, loadout, rifle);
    applyLoot({ kind: 'life', amount: 1 }, loadout, rifle);
    applyLoot({ kind: 'magazine', amount: 2 }, loadout, rifle);
    expect(loadout).toEqual({ health: 70, armor: 40, lives: 1, money: 150 });
    expect(rifle.reserve).toBe(26);
    expect(rifle.capacity).toBe(MAGAZINE_SIZE + 2);
    for (let extra = 0; extra < 5; extra += 1) applyLoot({ kind: 'magazine', amount: 2 }, loadout, rifle);
    expect(rifle.capacity).toBe(MAX_CAPACITY);
  });

  it('an extended magazine reloads to its larger size', () => {
    const rifle = new RifleState();
    rifle.capacity = 7;
    rifle.magazine = 0;
    rifle.startReload();
    rifle.update(5, false, false);
    expect(rifle.magazine).toBe(7);
  });

  it('armor soaks up part of each hit until it wears out', () => {
    const loadout = fresh();
    loadout.armor = 10;
    expect(takeDamage(loadout, 12)).toBeCloseTo(12 - 7.2);
    expect(loadout.armor).toBeCloseTo(2.8);
    takeDamage(loadout, 12);
    expect(loadout.armor).toBe(0);
    expect(takeDamage(loadout, 12)).toBe(12);
  });
});
