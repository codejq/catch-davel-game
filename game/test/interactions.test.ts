import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { isPlayerPositionValidWithBlockers } from '../src/sim/level';
import { closedDoorCells } from '../src/sim/interactions';

const idle = { forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false } as const;

describe('authoritative Level 1 interactions', () => {
  it('collects the key, opens the blocking workshop door, and activates the checkpoint', () => {
    const game = new GameSimulation('level-flow-proof');
    const key = game.state.level.pickups.find((pickup) => pickup.kind === 'key')!;
    expect(isPlayerPositionValidWithBlockers(
      game.state.level.door.x, game.state.level.door.z, 0.34, closedDoorCells(game.state.level),
    )).toBe(false);
    game.state.player.x = key.x;
    game.state.player.z = key.z;
    game.step(idle);
    expect(game.state.level.keyCollected).toBe(true);
    expect(key.active).toBe(false);
    game.state.player.x = game.state.level.door.x;
    game.state.player.z = game.state.level.door.z - 2;
    game.step(idle);
    expect(game.state.level.door.open).toBe(true);
    expect(closedDoorCells(game.state.level)).toEqual([]);
    game.state.player.x = game.state.level.checkpoint.x;
    game.state.player.z = game.state.level.checkpoint.z;
    game.step(idle);
    expect(game.state.level.checkpoint.activated).toBe(true);
  });

  it('consumes repair and energy pickups only when they restore a resource', () => {
    const game = new GameSimulation('pickup-proof');
    const repair = game.state.level.pickups.find((pickup) => pickup.kind === 'health')!;
    const energy = game.state.level.pickups.find((pickup) => pickup.kind === 'energy')!;
    game.state.player.x = repair.x;
    game.state.player.z = repair.z;
    game.step(idle);
    expect(repair.active).toBe(true);
    game.state.player.health = 60;
    game.step(idle);
    expect(game.state.player.health).toBe(85);
    expect(repair.active).toBe(false);
    game.state.player.x = energy.x;
    game.state.player.z = energy.z;
    game.state.player.energy = 50;
    game.step(idle);
    expect(game.state.player.energy).toBeGreaterThan(85);
    expect(energy.active).toBe(false);
  });
});
