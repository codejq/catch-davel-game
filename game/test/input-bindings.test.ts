import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INPUT_BINDINGS, inputCodeLabel, normalizeInputBindings, rebindInput,
} from '../src/storage/input-bindings';

describe('profile input bindings', () => {
  it('fills legacy profiles, swaps conflicts, and labels physical controls', () => {
    const legacy = normalizeInputBindings({ forward: 'ArrowUp', fire: 'Mouse0' });
    expect(legacy.forward).toBe('ArrowUp');
    expect(legacy.back).toBe(DEFAULT_INPUT_BINDINGS.back);
    expect(legacy.sprint).toBe('ShiftLeft');
    expect(legacy.dash).toBe('Space');
    const rebound = rebindInput(legacy, 'back', 'ArrowUp');
    expect(rebound.back).toBe('ArrowUp');
    expect(rebound.forward).toBe('KeyS');
    expect(inputCodeLabel('Mouse2')).toBe('MOUSE 2');
    expect(inputCodeLabel('Digit4')).toBe('4');
  });
});
