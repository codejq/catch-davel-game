import { describe, expect, it } from 'vitest';
import { createPlayer, stepPlayer } from '../src/sim/player';
import { isPlayerPositionValid } from '../src/sim/level';

describe('fixed-step player movement', () => {
  it('moves deterministically and never enters maze walls', () => {
    const first = createPlayer();
    const second = createPlayer();
    for (let tick = 0; tick < 600; tick += 1) {
      const command = { forward: 1, strafe: tick % 120 < 60 ? 0.35 : -0.35, yawDelta: 0.002, pitchDelta: 0, fire: false };
      stepPlayer(first, command);
      stepPlayer(second, command);
      expect(isPlayerPositionValid(first.x, first.z)).toBe(true);
    }
    expect(first).toEqual(second);
  });
});
