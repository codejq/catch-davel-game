import { describe, expect, it } from 'vitest';
import { Random } from '../src/core/random';
import {
  applyLoot, DOOR_LOOT_CHANCE, MAX_CAPACITY, rollDoorLoot, rollLoot, takeDamage, usefulKinds, type Loadout, type LootKind,
} from '../src/player/loot';
import { MAGAZINE_SIZE, RifleState } from '../src/player/rifle-state';

const fresh = (): Loadout => ({ health: 100, armor: 0, lives: 0, money: 0, suppressor: false });

describe('loot', () => {
  it('turns up every kind of find: cash, ammo, armor, medkits, lives, and weapon upgrades', () => {
    const random = new Random('boxes');
    const loadout = fresh();
    loadout.health = 50;
    const useful = usefulKinds(loadout, new RifleState());
    const kinds = new Set<LootKind>();
    for (let box = 0; box < 2000; box += 1) {
      const drop = rollLoot(random, useful);
      kinds.add(drop.kind);
      expect(drop.amount).toBeGreaterThan(0);
    }
    expect([...kinds].sort()).toEqual(['ammo', 'armor', 'life', 'magazine', 'medkit', 'money', 'scope', 'suppressor']);
  });

  it('never hands out a medkit at full health or an upgrade you already have', () => {
    const loadout = fresh();
    loadout.suppressor = true;
    const rifle = new RifleState();
    rifle.zoomLevels = 3;
    const random = new Random('full');
    for (let box = 0; box < 500; box += 1) {
      const drop = rollLoot(random, usefulKinds(loadout, rifle));
      expect(['medkit', 'suppressor', 'scope']).not.toContain(drop.kind);
    }
  });

  it('usually finds something behind a door', () => {
    const random = new Random('doors');
    const useful = usefulKinds(fresh(), new RifleState());
    let found = 0;
    for (let door = 0; door < 2000; door += 1) if (rollDoorLoot(random, useful) !== null) found += 1;
    expect(found / 2000).toBeGreaterThan(DOOR_LOOT_CHANCE - 0.05);
    expect(found / 2000).toBeLessThan(DOOR_LOOT_CHANCE + 0.05);
  });

  it('pickups add cash, ammo, armor, health, lives, and weapon upgrades', () => {
    const loadout = fresh();
    loadout.health = 30;
    const rifle = new RifleState();
    applyLoot({ kind: 'money', amount: 150 }, loadout, rifle);
    applyLoot({ kind: 'ammo', amount: 6 }, loadout, rifle);
    applyLoot({ kind: 'armor', amount: 40 }, loadout, rifle);
    applyLoot({ kind: 'medkit', amount: 50 }, loadout, rifle);
    applyLoot({ kind: 'life', amount: 1 }, loadout, rifle);
    applyLoot({ kind: 'magazine', amount: 2 }, loadout, rifle);
    applyLoot({ kind: 'suppressor', amount: 1 }, loadout, rifle);
    applyLoot({ kind: 'scope', amount: 1 }, loadout, rifle);
    expect(loadout).toEqual({ health: 80, armor: 40, lives: 1, money: 150, suppressor: true });
    expect(rifle.reserve).toBe(26);
    expect(rifle.capacity).toBe(MAGAZINE_SIZE + 2);
    expect(rifle.zoomLevels).toBe(3);
    for (let extra = 0; extra < 5; extra += 1) applyLoot({ kind: 'magazine', amount: 2 }, loadout, rifle);
    expect(rifle.capacity).toBe(MAX_CAPACITY);
  });

  it('the 12x scope adds a third zoom step', () => {
    const rifle = new RifleState();
    rifle.stepZoom(0); rifle.stepZoom(0);
    expect(rifle.zoom).toBe(4);
    rifle.zoomLevels = 3;
    rifle.stepZoom(1); rifle.stepZoom(1); rifle.stepZoom(1);
    expect(rifle.zoom).toBe(12);
    rifle.stepZoom(0);
    expect(rifle.zoom).toBe(4);
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
