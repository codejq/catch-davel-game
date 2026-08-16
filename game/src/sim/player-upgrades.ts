export const PLAYER_UPGRADE_IDS = ['maxHealth', 'maxEnergy'] as const;

export type PlayerUpgradeId = (typeof PLAYER_UPGRADE_IDS)[number];

export interface PlayerUpgradeLevels {
  readonly maxHealth: number;
  readonly maxEnergy: number;
}

export const MAX_PLAYER_UPGRADE_LEVEL = 3;
export const BASE_PLAYER_MAX_HEALTH = 100;
export const BASE_PLAYER_MAX_ENERGY = 100;
export const MAX_HEALTH_PER_UPGRADE = 15;
export const MAX_ENERGY_PER_UPGRADE = 12;

export const DEFAULT_PLAYER_UPGRADES: PlayerUpgradeLevels = Object.freeze({ maxHealth: 0, maxEnergy: 0 });

export function normalizePlayerUpgradeLevels(
  value: Readonly<Record<string, number>> | PlayerUpgradeLevels,
): PlayerUpgradeLevels {
  const keys = Object.keys(value).sort();
  const expectedKeys = [...PLAYER_UPGRADE_IDS].sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error('Player upgrades have unknown or missing fields');
  }
  const result = { maxHealth: value.maxHealth, maxEnergy: value.maxEnergy };
  for (const id of PLAYER_UPGRADE_IDS) {
    const level = result[id];
    if (!Number.isInteger(level) || level < 0 || level > MAX_PLAYER_UPGRADE_LEVEL) {
      throw new Error(`Player upgrade ${id} must be an integer from 0 to ${MAX_PLAYER_UPGRADE_LEVEL}`);
    }
  }
  return result;
}

export function playerMaxHealth(upgrades: PlayerUpgradeLevels): number {
  return BASE_PLAYER_MAX_HEALTH + upgrades.maxHealth * MAX_HEALTH_PER_UPGRADE;
}

export function playerMaxEnergy(upgrades: PlayerUpgradeLevels): number {
  return BASE_PLAYER_MAX_ENERGY + upgrades.maxEnergy * MAX_ENERGY_PER_UPGRADE;
}
