import { describe, expect, it } from 'vitest';
import { createPlayer, stepPlayer } from '../src/sim/player';
import { findCell, isPlayerPositionValid, isPlayerPositionValidWithBlockers } from '../src/sim/level';
import {
  PLAYER_DASH_COOLDOWN_TICKS, PLAYER_DASH_ENERGY_COST, PLAYER_SPRINT_MULTIPLIER,
} from '../src/sim/constants';

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

  it('derives deterministic health and energy caps from bounded upgrade levels', () => {
    const player = createPlayer(undefined, undefined, undefined, { maxHealth: 3, maxEnergy: 2 });
    expect(player).toMatchObject({
      health: 145, maxHealth: 145, energy: 124, maxEnergy: 124,
      playerUpgrades: { maxHealth: 3, maxEnergy: 2 },
    });
  });

  it('unlocks the deterministic energy-limited dash in Chapter 2', () => {
    const locked = createPlayer(undefined, undefined, 'level-001');
    const unlocked = createPlayer(undefined, undefined, 'level-011');
    const lockedStart = { x: locked.x, z: locked.z };
    const unlockedStart = { x: unlocked.x, z: unlocked.z };
    const dash = { forward: 1, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false, dash: true } as const;
    stepPlayer(locked, dash, [], 'level-001');
    stepPlayer(unlocked, dash, [], 'level-011');
    expect(Math.hypot(unlocked.x - unlockedStart.x, unlocked.z - unlockedStart.z))
      .toBeGreaterThan(Math.hypot(locked.x - lockedStart.x, locked.z - lockedStart.z) * 10);
    expect(unlocked.energy).toBe(unlocked.maxEnergy - PLAYER_DASH_ENERGY_COST);
    expect(unlocked.dashCooldownTicks).toBe(PLAYER_DASH_COOLDOWN_TICKS);

    const afterDash = { x: unlocked.x, z: unlocked.z };
    stepPlayer(unlocked, dash, [], 'level-011');
    expect(Math.hypot(unlocked.x - afterDash.x, unlocked.z - afterDash.z)).toBeLessThan(0.2);
    expect(unlocked.dashCooldownTicks).toBe(PLAYER_DASH_COOLDOWN_TICKS - 1);
  });

  it('sweeps the dash through intermediate collision checks', () => {
    const levelId = 'level-011' as const;
    const player = createPlayer(undefined, undefined, levelId);
    const start = findCell('S', levelId);
    stepPlayer(
      player,
      { forward: 1, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false, dash: true },
      [{ column: start.column, row: start.row + 1 }],
      levelId,
    );
    expect(player.z).toBeLessThanOrEqual(-16.5 + 0.001);
    expect(isPlayerPositionValidWithBlockers(
      player.x, player.z, 0.34, [{ column: start.column, row: start.row + 1 }], levelId,
    )).toBe(true);
  });
});
