export const WEAPON_IDS = ['pulse', 'sword', 'bomb', 'laser'] as const;
export type WeaponId = typeof WEAPON_IDS[number];

export const WEAPON_MASK = {
  pulse: 1 << 0,
  sword: 1 << 1,
  bomb: 1 << 2,
  laser: 1 << 3,
} as const satisfies Record<WeaponId, number>;

export const CAMPAIGN_LEVEL_1_WEAPON_MASK = WEAPON_MASK.pulse;
export const TRAINING_WEAPON_MASK = WEAPON_MASK.pulse | WEAPON_MASK.sword | WEAPON_MASK.bomb | WEAPON_MASK.laser;

export function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === 'string' && (WEAPON_IDS as readonly string[]).includes(value);
}

export function weaponUnlocked(mask: number, weapon: WeaponId): boolean {
  return (mask & WEAPON_MASK[weapon]) !== 0;
}

export const WEAPON_UPGRADE_IDS = ['pulseDamage', 'pulseEfficiency', 'swordCooling', 'bombCapacity', 'laserCooling'] as const;
export type WeaponUpgradeId = typeof WEAPON_UPGRADE_IDS[number];
export const MAX_WEAPON_UPGRADE_LEVEL = 3;

export interface WeaponUpgradeLevels {
  readonly pulseDamage: number;
  readonly pulseEfficiency: number;
  readonly swordCooling: number;
  readonly bombCapacity: number;
  readonly laserCooling: number;
}

export const DEFAULT_WEAPON_UPGRADES: WeaponUpgradeLevels = Object.freeze({
  pulseDamage: 0, pulseEfficiency: 0, swordCooling: 0, bombCapacity: 0, laserCooling: 0,
});

export function normalizeWeaponUpgradeLevels(
  source: Readonly<Partial<Record<WeaponUpgradeId, number>>> = {},
): WeaponUpgradeLevels {
  const level = (id: WeaponUpgradeId): number => {
    const value = source[id] ?? 0;
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_WEAPON_UPGRADE_LEVEL) {
      throw new Error(`${id} upgrade must be an integer from 0 to ${MAX_WEAPON_UPGRADE_LEVEL}`);
    }
    return value;
  };
  return {
    pulseDamage: level('pulseDamage'), pulseEfficiency: level('pulseEfficiency'),
    swordCooling: level('swordCooling'), bombCapacity: level('bombCapacity'), laserCooling: level('laserCooling'),
  };
}

export interface PlayerBomb {
  readonly id: number;
  x: number;
  y: number;
  z: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  fuseTicks: number;
}
