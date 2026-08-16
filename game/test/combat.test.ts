import { describe, expect, it } from 'vitest';
import { PULSE_DAMAGE } from '../src/sim/combat';
import { GameSimulation } from '../src/sim/game';

const idle = { forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false } as const;

describe('pulse gun', () => {
  it('hits the nearest visible Davel, awards coins, and unlocks the exit after the objective', () => {
    const game = new GameSimulation('combat-proof');
    const target = game.state.robots[0]!;
    target.x = game.state.player.x;
    target.z = game.state.player.z + 2;
    for (const other of game.state.robots.slice(1)) other.active = false;
    game.step({ ...idle, fire: true });
    expect(target.health).toBe(100 - PULSE_DAMAGE);
    expect(target.hitFlashTicks).toBeGreaterThan(0);
    expect(game.state.events.map((event) => event.type)).toContain('robot-hit');
    for (let shot = 0; shot < 2; shot += 1) {
      for (let tick = 0; tick < 10; tick += 1) game.step(idle);
      target.x = game.state.player.x;
      target.z = game.state.player.z + 2;
      game.step({ ...idle, fire: true });
    }
    expect(target.active).toBe(false);
    expect(game.state.player.coins).toBe(10);
    expect(game.state.level.objectiveComplete).toBe(true);
    expect(game.state.victory).toBe(false);
    game.state.player.x = game.state.level.exit.x;
    game.state.player.z = game.state.level.exit.z;
    game.step(idle);
    expect(game.state.victory).toBe(true);
  });

  it('does not shoot through a maze wall', () => {
    const game = new GameSimulation('wall-proof');
    const target = game.state.robots[0]!;
    target.x = game.state.player.x;
    target.z = game.state.player.z - 4;
    game.state.player.yaw = 0;
    game.step({ ...idle, fire: true });
    expect(target.health).toBe(100);
  });
});
