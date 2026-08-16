import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';

const idle = { forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false } as const;

describe('Davel fire attacks', () => {
  it('spawns a deterministic fireball, damages the player, and emits defeat', () => {
    const game = new GameSimulation('enemy-fire-proof');
    const attacker = game.state.robots[0]!;
    for (const other of game.state.robots.slice(1)) other.active = false;
    attacker.x = game.state.player.x;
    attacker.z = game.state.player.z + 2;
    attacker.holdTicks = 5_000;
    attacker.attackCooldownTicks = 0;
    game.state.player.health = 9;
    game.step(idle);
    expect(game.state.projectiles).toHaveLength(1);
    let sawHit = false;
    for (let tick = 0; tick < 60 && !game.state.defeat; tick += 1) {
      game.step(idle);
      sawHit ||= game.state.events.some((event) => event.type === 'player-hit');
    }
    expect(sawHit).toBe(true);
    expect(game.state.player.health).toBe(0);
    expect(game.state.defeat).toBe(true);
    expect(game.state.projectiles).toHaveLength(0);
  });

  it('does not fire through a maze wall', () => {
    const game = new GameSimulation('enemy-wall-proof');
    const attacker = game.state.robots[0]!;
    for (const other of game.state.robots.slice(1)) other.active = false;
    attacker.x = game.state.player.x;
    attacker.z = game.state.player.z - 4;
    attacker.attackCooldownTicks = 0;
    game.step(idle);
    expect(game.state.projectiles).toHaveLength(0);
  });
});
