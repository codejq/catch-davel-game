import type { Random } from '../core/random';
import type { RifleState } from './rifle-state';

export type LootKind = 'money' | 'ammo' | 'armor' | 'medkit' | 'life' | 'magazine';

/** What the sniper carries besides the rifle: body armor, spare lives, and cash. */
export interface Loadout {
  health: number;
  armor: number;
  lives: number;
  money: number;
}

export const MAX_ARMOR = 100;
export const MAX_CAPACITY = 10;
/** Share of each hit that armor soaks up while it lasts. */
export const ARMOR_ABSORB = 0.6;
/** Chance that a door hides something the first time it is opened. */
export const DOOR_LOOT_CHANCE = 0.6;

const TABLE: readonly (readonly [LootKind, number])[] = [
  ['money', 30], ['ammo', 24], ['armor', 18], ['medkit', 15], ['magazine', 7], ['life', 6],
];

export interface LootDrop { readonly kind: LootKind; readonly amount: number }

/** Rolls what is behind a door: usually something, sometimes nothing. */
export function rollDoorLoot(random: Random): LootDrop | null {
  if (!random.chance(DOOR_LOOT_CHANCE)) return null;
  const total = TABLE.reduce((sum, [, weight]) => sum + weight, 0);
  let pick = random.next() * total;
  let kind: LootKind = 'money';
  for (const [candidate, weight] of TABLE) {
    pick -= weight;
    if (pick <= 0) { kind = candidate; break; }
  }
  const amount = kind === 'money' ? random.int(2, 12) * 25
    : kind === 'ammo' ? random.int(4, 10)
      : kind === 'armor' ? random.int(3, 6) * 10
        : kind === 'medkit' ? 40
          : kind === 'magazine' ? 2 : 1;
  return { kind, amount };
}

/** Applies a pickup. Returns the line to show the player. */
export function applyLoot(drop: LootDrop, loadout: Loadout, rifle: RifleState): string {
  switch (drop.kind) {
    case 'money':
      loadout.money += drop.amount;
      return `CASH · +$${drop.amount}`;
    case 'ammo':
      rifle.reserve += drop.amount;
      return `AMMO BOX · +${drop.amount} ROUNDS`;
    case 'armor':
      loadout.armor = Math.min(MAX_ARMOR, loadout.armor + drop.amount);
      return `BODY ARMOR · +${drop.amount} ARMOR`;
    case 'medkit':
      loadout.health = Math.min(100, loadout.health + drop.amount);
      return `MEDKIT · +${drop.amount} HEALTH`;
    case 'magazine':
      if (rifle.capacity >= MAX_CAPACITY) { rifle.reserve += 10; return 'SPARE ROUNDS · +10 ROUNDS'; }
      rifle.capacity = Math.min(MAX_CAPACITY, rifle.capacity + drop.amount);
      return `EXTENDED MAGAZINE · ${rifle.capacity} ROUNDS PER MAG`;
    case 'life':
      loadout.lives += 1;
      return 'EXTRA LIFE · +1 LIFE';
  }
}

/** Takes a hit, letting armor soak up part of it. Returns the health damage actually taken. */
export function takeDamage(loadout: Loadout, damage: number): number {
  const absorbed = Math.min(loadout.armor, damage * ARMOR_ABSORB);
  loadout.armor -= absorbed;
  const taken = damage - absorbed;
  loadout.health -= taken;
  return taken;
}
