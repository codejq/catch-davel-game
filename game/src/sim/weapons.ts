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
