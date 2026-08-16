import { WEAPON_IDS, weaponUnlocked, type WeaponId } from '../sim/weapons';

export interface VirtualStickVector {
  readonly strafe: number;
  readonly forward: number;
  readonly visualX: number;
  readonly visualY: number;
}

export function virtualStickVector(deltaX: number, deltaY: number, radius: number, deadZone = 0.12): VirtualStickVector {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY) || !Number.isFinite(radius) || radius <= 0) {
    throw new Error('Virtual stick input must be finite with a positive radius');
  }
  const length = Math.hypot(deltaX, deltaY);
  const scale = length > radius ? radius / length : 1;
  const visualX = deltaX * scale;
  const visualY = deltaY * scale;
  const normalizedX = visualX / radius;
  const normalizedY = visualY / radius;
  const magnitude = Math.hypot(normalizedX, normalizedY);
  if (magnitude <= deadZone) return { strafe: 0, forward: 0, visualX, visualY };
  const remappedMagnitude = Math.min(1, (magnitude - deadZone) / (1 - deadZone));
  return {
    strafe: (normalizedX / magnitude) * remappedMagnitude,
    forward: (-normalizedY / magnitude) * remappedMagnitude,
    visualX,
    visualY,
  };
}

export function nextUnlockedWeapon(selected: WeaponId, unlockedMask: number): WeaponId {
  const start = WEAPON_IDS.indexOf(selected);
  for (let offset = 1; offset <= WEAPON_IDS.length; offset += 1) {
    const candidate = WEAPON_IDS[(start + offset) % WEAPON_IDS.length]!;
    if (weaponUnlocked(unlockedMask, candidate)) return candidate;
  }
  return selected;
}
