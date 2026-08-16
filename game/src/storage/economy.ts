import {
  MAX_WEAPON_UPGRADE_LEVEL, normalizeWeaponUpgradeLevels, type WeaponUpgradeId,
} from '../sim/weapons';
import { updateProfile, type ProfileV4 } from './profile';

export interface WeaponUpgradeDefinition {
  readonly id: WeaponUpgradeId;
  readonly name: string;
  readonly description: string;
  readonly baseCost: number;
}

export const WEAPON_UPGRADE_CATALOG: readonly WeaponUpgradeDefinition[] = Object.freeze([
  { id: 'pulseDamage', name: 'Pulse Overcharge', description: '+6 pulse damage per level', baseCost: 5 },
  { id: 'pulseEfficiency', name: 'Quantum Capacitor', description: '-0.5 pulse energy cost per level', baseCost: 4 },
  { id: 'swordCooling', name: 'Cryo Hilt', description: '-12% sword heat per level', baseCost: 5 },
  { id: 'bombCapacity', name: 'Bomb Pockets', description: '+1 starting bomb per level', baseCost: 6 },
  { id: 'laserCooling', name: 'Prism Cooling', description: '-12% laser heat per level', baseCost: 6 },
]);

export function weaponUpgradeCost(id: WeaponUpgradeId, currentLevel: number): number {
  const definition = WEAPON_UPGRADE_CATALOG.find((entry) => entry.id === id);
  if (definition === undefined) throw new Error(`Unknown weapon upgrade ${id}`);
  if (!Number.isSafeInteger(currentLevel) || currentLevel < 0 || currentLevel >= MAX_WEAPON_UPGRADE_LEVEL) {
    throw new Error(`${id} cannot be upgraded from level ${currentLevel}`);
  }
  return definition.baseCost * (currentLevel + 1);
}

export function purchaseWeaponUpgrade(profile: ProfileV4, id: WeaponUpgradeId): ProfileV4 {
  const levels = normalizeWeaponUpgradeLevels(profile.weaponUpgrades);
  const currentLevel = levels[id];
  const cost = weaponUpgradeCost(id, currentLevel);
  if (profile.spendableCoins < cost) throw new Error(`Need ${cost} coins for ${id}`);
  return updateProfile(profile, {
    spendableCoins: profile.spendableCoins - cost,
    weaponUpgrades: { ...profile.weaponUpgrades, [id]: currentLevel + 1 },
    campaignCheckpoint: null,
  });
}
