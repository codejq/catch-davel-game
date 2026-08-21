import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUT_BINDINGS } from '../src/storage/input-bindings';
import {
  isSecondaryKeyboardCode, keyboardActionPressed, keyboardRotationDelta, nextFieldOfViewScale,
  weaponForKeyboardCode,
} from '../src/runtime/keyboard-input';

describe('secondary keyboard controls', () => {
  it('adds navigation-block movement and either Control key without replacing primary bindings', () => {
    expect(keyboardActionPressed(new Set(['Home']), 'left', DEFAULT_INPUT_BINDINGS)).toBe(false);
    expect(keyboardActionPressed(new Set(['End']), 'right', DEFAULT_INPUT_BINDINGS)).toBe(false);
    expect(keyboardActionPressed(new Set(['Insert']), 'sprint', DEFAULT_INPUT_BINDINGS)).toBe(true);
    expect(keyboardActionPressed(new Set(['Delete']), 'dash', DEFAULT_INPUT_BINDINGS)).toBe(true);
    expect(keyboardActionPressed(new Set(['ControlLeft']), 'fire', DEFAULT_INPUT_BINDINGS)).toBe(true);
    expect(keyboardActionPressed(new Set(['ControlRight']), 'fire', DEFAULT_INPUT_BINDINGS)).toBe(true);
    expect(keyboardActionPressed(new Set(['ArrowUp']), 'forward', DEFAULT_INPUT_BINDINGS)).toBe(true);
    expect(isSecondaryKeyboardCode('PageUp')).toBe(false);
    expect(isSecondaryKeyboardCode('Home')).toBe(true);
    expect(keyboardRotationDelta(new Set(['Home']))).toBeLessThan(0);
    expect(keyboardRotationDelta(new Set(['End']))).toBeGreaterThan(0);
    expect(keyboardRotationDelta(new Set(['Home', 'End']))).toBe(0);
    expect(nextFieldOfViewScale(1, 'in')).toBe(0.92);
    expect(nextFieldOfViewScale(1, 'out')).toBe(1.08);
    expect(nextFieldOfViewScale(0.65, 'in')).toBe(0.65);
    expect(nextFieldOfViewScale(1.25, 'out')).toBe(1.25);
  });

  it('selects every weapon from the top row, numpad, or a remapped binding', () => {
    expect(weaponForKeyboardCode('Digit1', DEFAULT_INPUT_BINDINGS)).toBe('pulse');
    expect(weaponForKeyboardCode('Digit2', DEFAULT_INPUT_BINDINGS)).toBe('sword');
    expect(weaponForKeyboardCode('Numpad3', DEFAULT_INPUT_BINDINGS)).toBe('bomb');
    expect(weaponForKeyboardCode('Numpad4', DEFAULT_INPUT_BINDINGS)).toBe('laser');
    expect(weaponForKeyboardCode('KeyP', { ...DEFAULT_INPUT_BINDINGS, weaponLaser: 'KeyP' })).toBe('laser');
  });
});
