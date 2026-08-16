import { describe, expect, it } from 'vitest';
import { createPlayer, stepPlayer } from '../src/sim/player';
import { isPlayerPositionValid } from '../src/sim/level';
import { PLAYER_SPRINT_MULTIPLIER } from '../src/sim/constants';

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

  it('applies the deterministic sprint multiplier through the shared command', () => {
    const walking = createPlayer();
    const sprinting = createPlayer();
    const startX = walking.x;
    const startZ = walking.z;
    stepPlayer(walking, { forward: 1, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false, sprint: false });
    stepPlayer(sprinting, { forward: 1, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false, sprint: true });
    const walked = Math.hypot(walking.x - startX, walking.z - startZ);
    const sprinted = Math.hypot(sprinting.x - startX, sprinting.z - startZ);
    expect(sprinted / walked).toBeCloseTo(PLAYER_SPRINT_MULTIPLIER, 10);
    expect(isPlayerPositionValid(sprinting.x, sprinting.z)).toBe(true);
  });
});
