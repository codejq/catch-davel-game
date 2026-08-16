import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';

const idle = { forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false } as const;

function isolate(game: GameSimulation, robotId: number, distance: number): void {
  for (const robot of game.state.robots) robot.active = robot.id === robotId;
  const attacker = game.state.robots[robotId]!;
  attacker.x = game.state.player.x;
  attacker.z = game.state.player.z + distance;
  attacker.holdTicks = 5_000;
  attacker.attackCooldownTicks = 0;
}

describe('Davel archetype combat', () => {
  it('telegraphs a Firemouth attack before launching a damaging fireball', () => {
    const game = new GameSimulation('enemy-fire-proof');
    isolate(game, 3, 2.4);
    game.state.player.health = 14;
    game.step(idle);
    expect(game.state.events.map((event) => event.type)).toContain('robot-telegraph');
    expect(game.state.projectiles).toHaveLength(0);
    let sawFireball = false;
    let sawHit = false;
    for (let tick = 0; tick < 120 && !game.state.defeat; tick += 1) {
      game.step(idle);
      sawFireball ||= game.state.projectiles.some((projectile) => projectile.kind === 'fireball');
      sawHit ||= game.state.events.some((event) => event.type === 'player-hit');
    }
    expect(sawFireball).toBe(true);
    expect(sawHit).toBe(true);
    expect(game.state.player.health).toBe(0);
    expect(game.state.defeat).toBe(true);
  });

  it('gives Wobble Scouts a readable close-range slap instead of a projectile', () => {
    const game = new GameSimulation('enemy-melee-proof');
    isolate(game, 0, 1.4);
    const initialHealth = game.state.player.health;
    for (let tick = 0; tick < 30; tick += 1) game.step(idle);
    expect(game.state.player.health).toBeLessThan(initialHealth);
    expect(game.state.projectiles).toHaveLength(0);
  });

  it('lets the Cyan DJ telegraph and tempo-buff a nearby ally', () => {
    const game = new GameSimulation('enemy-dj-proof');
    for (const robot of game.state.robots) robot.active = robot.id === 4 || robot.id === 5;
    const dj = game.state.robots[5]!;
    const ally = game.state.robots[4]!;
    dj.x = game.state.player.x;
    dj.z = game.state.player.z + 3;
    ally.x = dj.x + 1;
    ally.z = dj.z;
    dj.attackCooldownTicks = 0;
    let sawBuff = false;
    for (let tick = 0; tick < 40; tick += 1) {
      game.step(idle);
      sawBuff ||= game.state.events.some((event) => event.type === 'robot-buff');
    }
    expect(ally.tempoBuffTicks).toBeGreaterThan(0);
    expect(sawBuff).toBe(true);
  });

  it('does not begin an attack through a maze wall', () => {
    const game = new GameSimulation('enemy-wall-proof');
    isolate(game, 4, -4);
    game.step(idle);
    expect(game.state.robots[4]!.combatState).toBe('patrol');
    expect(game.state.projectiles).toHaveLength(0);
  });
});
