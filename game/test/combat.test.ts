import { describe, expect, it } from 'vitest';
import { BOMB_DAMAGE, LASER_BASE_DAMAGE, PULSE_DAMAGE, SWORD_CHARGED_DAMAGE, SWORD_DAMAGE } from '../src/sim/combat';
import { GameSimulation } from '../src/sim/game';
import { TRAINING_WEAPON_MASK } from '../src/sim/weapons';

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
    expect(game.state.player.coins).toBe(2);
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

describe('training arsenal', () => {
  function isolatedTarget(game: GameSimulation, distance = 2): ReturnType<typeof game.state.robots.at> {
    const target = game.state.robots[0]!;
    target.x = game.state.player.x;
    target.z = game.state.player.z + distance;
    target.holdTicks = 10_000;
    for (const other of game.state.robots.slice(1)) other.active = false;
    return target;
  }

  it('supports fast and charged sword attacks plus projectile deflection', () => {
    const fast = new GameSimulation('sword-fast', TRAINING_WEAPON_MASK);
    const fastTarget = isolatedTarget(fast)!;
    fast.state.projectiles.push({
      id: 1, ownerRobotId: 0, kind: 'beat-bolt', x: fast.state.player.x, y: 1.2, z: fast.state.player.z + 1,
      velocityX: 0, velocityY: 0, velocityZ: -1, lifeTicks: 100,
    });
    fast.step({ ...idle, weapon: 'sword', fire: true });
    expect(fastTarget.health).toBe(100 - SWORD_DAMAGE);
    expect(fast.state.projectiles).toHaveLength(0);
    expect(fast.state.events.map((event) => event.type)).toContain('projectile-deflected');

    const charged = new GameSimulation('sword-charged', TRAINING_WEAPON_MASK);
    const chargedTarget = isolatedTarget(charged)!;
    charged.step({ ...idle, weapon: 'sword', fire: true, altFire: true });
    expect(chargedTarget.health).toBe(100 - SWORD_CHARGED_DAMAGE);
    expect(charged.state.events.map((event) => event.type)).toContain('sword-charged');
  });

  it('throws a deterministic arcing bomb with an occluded area blast', () => {
    const game = new GameSimulation('bomb-proof', TRAINING_WEAPON_MASK);
    const target = isolatedTarget(game)!;
    game.step({ ...idle, weapon: 'bomb', fire: true });
    expect(game.state.player.bombs).toBe(2);
    expect(game.state.playerBombs).toHaveLength(1);
    const bomb = game.state.playerBombs[0]!;
    target.x = bomb.x;
    target.z = bomb.z;
    bomb.fuseTicks = 1;
    game.step(idle);
    expect(game.state.playerBombs).toHaveLength(0);
    expect(target.health).toBeLessThanOrEqual(100 - BOMB_DAMAGE * 0.9);
    expect(game.state.events.map((event) => event.type)).toContain('bomb-detonated');
  });

  it('fires a continuous laser with focus state, energy use, and heat', () => {
    const game = new GameSimulation('laser-proof', TRAINING_WEAPON_MASK);
    const target = isolatedTarget(game)!;
    game.step({ ...idle, weapon: 'laser', fire: true });
    expect(target.health).toBeCloseTo(100 - LASER_BASE_DAMAGE, 5);
    expect(game.state.laserActive).toBe(true);
    expect(game.state.laserFocusTicks).toBe(1);
    expect(game.state.player.energy).toBeLessThan(100);
    expect(game.state.player.laserHeat).toBeGreaterThan(0);
  });
});
