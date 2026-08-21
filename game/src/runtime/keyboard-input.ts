import type { InputAction, InputBindings } from '../storage/input-bindings';
import type { WeaponId } from '../sim/weapons';

export const SECONDARY_KEYBOARD_CODES = Object.freeze({
  forward: ['PageUp'],
  back: ['PageDown'],
  left: ['Home'],
  right: ['End'],
  sprint: ['Insert'],
  dash: ['Delete'],
  fire: ['ControlLeft', 'ControlRight'],
} as const satisfies Readonly<Partial<Record<InputAction, readonly string[]>>>);

const FIXED_WEAPON_CODES: Readonly<Record<string, WeaponId>> = Object.freeze({
  Digit1: 'pulse', Digit2: 'sword', Digit3: 'bomb', Digit4: 'laser',
  Numpad1: 'pulse', Numpad2: 'sword', Numpad3: 'bomb', Numpad4: 'laser',
});

export function keyboardActionPressed(
  pressed: ReadonlySet<string>,
  action: keyof typeof SECONDARY_KEYBOARD_CODES,
  bindings: InputBindings,
): boolean {
  return pressed.has(bindings[action]) || SECONDARY_KEYBOARD_CODES[action].some((code) => pressed.has(code));
}

export function isSecondaryKeyboardCode(code: string): boolean {
  return Object.values(SECONDARY_KEYBOARD_CODES).some((codes) => (codes as readonly string[]).includes(code));
}

export function weaponForKeyboardCode(code: string, bindings: InputBindings): WeaponId | null {
  const configured: Partial<Record<string, WeaponId>> = {
    [bindings.weaponPulse]: 'pulse', [bindings.weaponSword]: 'sword',
    [bindings.weaponBomb]: 'bomb', [bindings.weaponLaser]: 'laser',
  };
  return configured[code] ?? FIXED_WEAPON_CODES[code] ?? null;
}
