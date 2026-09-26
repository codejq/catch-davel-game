import { describe, expect, it } from 'vitest';
import { CAPTURED_KEYS, CONTROLS } from '../src/core/controls';

describe('keyboard controls', () => {
  it('drives the game from the arrow keys and fires with Ctrl', () => {
    expect(CONTROLS.forward).toContain('ArrowUp');
    expect(CONTROLS.back).toContain('ArrowDown');
    expect(CONTROLS.turnLeft).toContain('ArrowLeft');
    expect(CONTROLS.turnRight).toContain('ArrowRight');
    expect(CONTROLS.fire).toEqual(expect.arrayContaining(['ControlLeft', 'ControlRight']));
    expect(CAPTURED_KEYS.has('ArrowUp')).toBe(true);
  });

  it('never binds one key to two actions', () => {
    const seen = new Map<string, string>();
    for (const [action, codes] of Object.entries(CONTROLS)) {
      for (const code of codes) {
        expect(seen.get(code), `${code} is bound to ${seen.get(code)} and ${action}`).toBeUndefined();
        seen.set(code, action);
      }
    }
  });
});
