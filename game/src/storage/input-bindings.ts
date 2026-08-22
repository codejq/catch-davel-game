export const INPUT_ACTIONS = [
  'forward', 'back', 'left', 'right', 'sprint', 'dash', 'fire', 'altFire',
  'campaign', 'shop', 'weaponPulse', 'weaponSword', 'weaponBomb', 'weaponLaser',
] as const;

export type InputAction = typeof INPUT_ACTIONS[number];
export type InputBindings = Readonly<Record<InputAction, string>>;

export const DEFAULT_INPUT_BINDINGS: InputBindings = Object.freeze({
  forward: 'ArrowUp', back: 'ArrowDown', left: 'Home', right: 'End',
  sprint: 'ShiftLeft',
  dash: 'Space',
  fire: 'Mouse0', altFire: 'Mouse2', campaign: 'KeyM', shop: 'KeyU',
  weaponPulse: 'Digit1', weaponSword: 'Digit2', weaponBomb: 'Digit3', weaponLaser: 'Digit4',
});

export function normalizeInputBindings(bindings: Readonly<Record<string, string>>): InputBindings {
  return Object.fromEntries(INPUT_ACTIONS.map((action) => {
    const value = bindings[action];
    return [action, typeof value === 'string' && value.length > 0 ? value : DEFAULT_INPUT_BINDINGS[action]];
  })) as unknown as InputBindings;
}

export function rebindInput(
  bindings: Readonly<Record<string, string>>,
  action: InputAction,
  code: string,
): InputBindings {
  if (code.length === 0 || code.length > 32) throw new Error('Input binding code is invalid');
  const normalized = normalizeInputBindings(bindings);
  const conflict = INPUT_ACTIONS.find((candidate) => candidate !== action && normalized[candidate] === code);
  if (conflict === undefined) return { ...normalized, [action]: code };
  return { ...normalized, [action]: code, [conflict]: normalized[action] };
}

export function inputCodeLabel(code: string): string {
  if (code === 'Mouse0') return 'MOUSE 1';
  if (code === 'Mouse1') return 'MOUSE 3';
  if (code === 'Mouse2') return 'MOUSE 2';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
  return code.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
}
