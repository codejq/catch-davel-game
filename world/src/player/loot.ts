import type { Random } from '../core/random';
import type { RifleState } from './rifle-state';
import { CARBINE, type CarbineState } from '../weapons/carbine-state';

export type LootKind = 'money' | 'ammo' | 'armor' | 'medkit' | 'life' | 'magazine' | 'suppressor' | 'scope' | 'carbine';

/** What the sniper carries besides the rifle: body armor, spare lives, cash, and a suppressor. */
export interface Loadout {
  health: number;
  armor: number;
  lives: number;
  money: number;
  suppressor: boolean;
}

export const MAX_ARMOR = 100;
export const MAX_CAPACITY = 10;
/** Share of each hit that armor soaks up while it lasts. */
export const ARMOR_ABSORB = 0.6;
/** Chance that a door hides something the first time it is opened. Searched containers always hold something. */
export const DOOR_LOOT_CHANCE = 0.6;
/** A suppressed shot is heard at this fraction of the normal range. */
export const SUPPRESSED_HEARING = 0.35;

export const LOOT_NAMES: Record<LootKind, string> = {
  money: 'cash', ammo: 'ammo box', armor: 'body armor', medkit: 'medkit', life: 'extra life',
  magazine: 'extended magazine', suppressor: 'suppressor', scope: '12× scope', carbine: 'robot carbine',
};

const TABLE: readonly (readonly [LootKind, number])[] = [
  ['money', 22], ['ammo', 20], ['armor', 18], ['medkit', 14], ['magazine', 9], ['suppressor', 6], ['scope', 6], ['life', 5],
];

export interface LootDrop { readonly kind: LootKind; readonly amount: number }

/** Leaves out finds that would be useless right now: a medkit at full health, or an upgrade already fitted. */
export function usefulKinds(loadout: Loadout, rifle: RifleState): Set<LootKind> {
  const kinds = new Set<LootKind>(TABLE.map(([kind]) => kind));
  if (loadout.health >= 100) kinds.delete('medkit');
  if (loadout.armor >= MAX_ARMOR) kinds.delete('armor');
  if (loadout.suppressor) kinds.delete('suppressor');
  if (rifle.zoomLevels >= 3) kinds.delete('scope');
  if (rifle.capacity >= MAX_CAPACITY) kinds.delete('magazine');
  return kinds;
}

/** Picks one useful find, weighted so cash and ammo are common and weapon upgrades and lives are rare. */
export function rollLoot(random: Random, useful: ReadonlySet<LootKind>): LootDrop {
  const table = TABLE.filter(([kind]) => useful.has(kind));
  const total = table.reduce((sum, [, weight]) => sum + weight, 0);
  let pick = random.next() * total;
  let kind: LootKind = table[0]?.[0] ?? 'money';
  for (const [candidate, weight] of table) {
    pick -= weight;
    if (pick <= 0) { kind = candidate; break; }
  }
  const amount = kind === 'money' ? random.int(2, 12) * 25
    : kind === 'ammo' ? random.int(5, 10)
      : kind === 'armor' ? random.int(4, 7) * 10
        : kind === 'medkit' ? 50
          : kind === 'magazine' ? 2 : 1;
  return { kind, amount };
}

/** What is behind a door the first time it is opened: usually something, sometimes nothing. */
export function rollDoorLoot(random: Random, useful: ReadonlySet<LootKind>): LootDrop | null {
  return random.chance(DOOR_LOOT_CHANCE) ? rollLoot(random, useful) : null;
}

/** Applies a pickup. Returns the line to show the player. */
export function applyLoot(drop: LootDrop, loadout: Loadout, rifle: RifleState, carbine?: CarbineState): string {
  switch (drop.kind) {
    case 'carbine': {
      // Stripped from a destroyed robot: the gun (or its rounds) plus its armor plates.
      const before = loadout.armor;
      loadout.armor = Math.min(MAX_ARMOR, loadout.armor + CARBINE.armorPerPickup);
      const armor = Math.round(loadout.armor - before);
      if (carbine === undefined) return `ROBOT ARMOR · +${armor} ARMOR`;
      const taken = carbine.take();
      return `${taken.unlocked ? 'ROBOT CARBINE · PRESS 2 OR Q TO SWITCH' : `CARBINE ROUNDS · +${taken.rounds}`}${armor > 0 ? ` · +${armor} ARMOR` : ''}`;
    }
    case 'money':
      loadout.money += drop.amount;
      return `CASH · +$${drop.amount}`;
    case 'ammo':
      rifle.reserve += drop.amount;
      return `AMMO BOX · +${drop.amount} ROUNDS`;
    case 'armor': {
      const before = loadout.armor;
      loadout.armor = Math.min(MAX_ARMOR, loadout.armor + drop.amount);
      return `BODY ARMOR · +${Math.round(loadout.armor - before)} ARMOR`;
    }
    case 'medkit': {
      const before = loadout.health;
      loadout.health = Math.min(100, loadout.health + drop.amount);
      return `MEDKIT · +${Math.round(loadout.health - before)} HEALTH`;
    }
    case 'magazine':
      if (rifle.capacity >= MAX_CAPACITY) { rifle.reserve += 10; return 'SPARE ROUNDS · +10 ROUNDS'; }
      rifle.capacity = Math.min(MAX_CAPACITY, rifle.capacity + drop.amount);
      return `EXTENDED MAGAZINE · ${rifle.capacity} ROUNDS PER MAG`;
    case 'suppressor':
      if (loadout.suppressor) { rifle.reserve += 10; return 'SPARE ROUNDS · +10 ROUNDS'; }
      loadout.suppressor = true;
      return 'SUPPRESSOR · ROBOTS HEAR YOUR SHOTS FROM MUCH CLOSER';
    case 'scope':
      if (rifle.zoomLevels >= 3) { rifle.reserve += 10; return 'SPARE ROUNDS · +10 ROUNDS'; }
      rifle.zoomLevels = 3;
      return '12× SCOPE · PRESS + OR - TO CYCLE ZOOM';
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
