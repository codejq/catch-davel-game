import type { InputAction, InputBindings } from '../storage/input-bindings';
import type { WeaponId } from '../sim/weapons';

export const SECONDARY_KEYBOARD_CODES = Object.freeze({
  sprint: ['Insert'],
  dash: ['Delete'],
  fire: ['ControlLeft', 'ControlRight'],
} as const satisfies Readonly<Partial<Record<InputAction, readonly string[]>>>);

export const KEYBOARD_ROTATION_RADIANS = 0.035;

export function keyboardRotationDelta(pressed: ReadonlySet<string>): number {
  return (Number(pressed.has('End')) - Number(pressed.has('Home'))) * KEYBOARD_ROTATION_RADIANS;
}

export const FIELD_OF_VIEW_SCALE_MIN = 0.65;
export const FIELD_OF_VIEW_SCALE_MAX = 1.25;
export const FIELD_OF_VIEW_SCALE_STEP = 0.08;

export function nextFieldOfViewScale(current: number, direction: 'in' | 'out'): number {
  const finite = Number.isFinite(current) ? current : 1;
  const next = finite + (direction === 'in' ? -FIELD_OF_VIEW_SCALE_STEP : FIELD_OF_VIEW_SCALE_STEP);
  return Math.max(FIELD_OF_VIEW_SCALE_MIN, Math.min(FIELD_OF_VIEW_SCALE_MAX, Number(next.toFixed(2))));
}

const FIXED_WEAPON_CODES: Readonly<Record<string, WeaponId>> = Object.freeze({
  Digit1: 'pulse', Digit2: 'sword', Digit3: 'bomb', Digit4: 'laser',
  Numpad1: 'pulse', Numpad2: 'sword', Numpad3: 'bomb', Numpad4: 'laser',
});

export function keyboardActionPressed(
  pressed: ReadonlySet<string>,
  action: 'forward' | 'back' | 'left' | 'right' | 'sprint' | 'dash' | 'fire',
  bindings: InputBindings,
): boolean {
  const secondary = (SECONDARY_KEYBOARD_CODES as Readonly<Partial<Record<InputAction, readonly string[]>>>)[action] ?? [];
  return pressed.has(bindings[action]) || secondary.some((code) => pressed.has(code));
}

export function isSecondaryKeyboardCode(code: string): boolean {
  return code === 'Home' || code === 'End'
    || Object.values(SECONDARY_KEYBOARD_CODES).some((codes) => (codes as readonly string[]).includes(code));
}

export function weaponForKeyboardCode(code: string, bindings: InputBindings): WeaponId | null {
  const configured: Partial<Record<string, WeaponId>> = {
    [bindings.weaponPulse]: 'pulse', [bindings.weaponSword]: 'sword',
    [bindings.weaponBomb]: 'bomb', [bindings.weaponLaser]: 'laser',
  };
  return configured[code] ?? FIXED_WEAPON_CODES[code] ?? null;
}
