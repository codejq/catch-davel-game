import { describe, expect, it } from 'vitest';
import {
  BOMB_DAMAGE, LASER_BASE_DAMAGE, PULSE_BURST_RESET_TICKS, PULSE_DAMAGE, PULSE_IMPACT_KIND, PULSE_MAX_SPREAD_RADIANS,
  SWORD_CHARGED_DAMAGE, SWORD_DAMAGE, effectivePulseBurstShots, fireLaser, firePulse, pulseSpreadOffset,
} from '../src/sim/combat';
import { GameSimulation } from '../src/sim/game';
import { TRAINING_WEAPON_MASK } from '../src/sim/weapons';
import { PLAYER_EYE_HEIGHT } from '../src/sim/constants';
import { ROBOT_DEFINITIONS } from '../src/sim/robots';
import { cellCenter } from '../src/sim/level';
import {
  WEAK_POINT_COIN_MULTIPLIER, WEAK_POINT_DAMAGE_MULTIPLIER, weakPointPosition,
} from '../src/sim/weak-point';

const idle = { forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false } as const;

describe('pulse gun', () => {
  it('keeps the first shot exact and grows a deterministic bounded rapid-fire pattern until recovery', () => {
    expect(pulseSpreadOffset('spread-proof', 0, 0)).toEqual({ yaw: 0, pitch: 0, radians: 0 });
    const first = [1, 2, 3, 4].map((burstShots) => pulseSpreadOffset('spread-proof', burstShots, burstShots));
    const second = [1, 2, 3, 4].map((burstShots) => pulseSpreadOffset('spread-proof', burstShots, burstShots));
    expect(first).toEqual(second);
    first.map((spread) => spread.radians).forEach((radians, index) => {
      expect(radians).toBeCloseTo([0.006, 0.012, 0.018, PULSE_MAX_SPREAD_RADIANS][index]!);
    });
    expect(effectivePulseBurstShots(PULSE_BURST_RESET_TICKS, 0, 4)).toBe(4);
    expect(effectivePulseBurstShots(PULSE_BURST_RESET_TICKS + 1, 0, 4)).toBe(0);
  });

  it('applies rapid-fire spread to the authoritative ray instead of only the crosshair', () => {
    const prepare = (): GameSimulation => {
      const game = new GameSimulation('spread-ray-proof');
      const target = game.state.robots[0]!;
      for (const other of game.state.robots.slice(1)) other.active = false;
      const playerPoint = cellCenter(1, 1);
      const targetPoint = cellCenter(5, 1);
      game.state.player.x = playerPoint.x;
      game.state.player.z = playerPoint.z;
      game.state.player.yaw = Math.PI / 2;
      target.x = targetPoint.x;
      target.z = targetPoint.z;
      target.heading = -Math.PI / 2;
      const core = weakPointPosition(target, ROBOT_DEFINITIONS[target.id]!);
      game.state.player.pitch = Math.atan2(core.y - PLAYER_EYE_HEIGHT, target.x - game.state.player.x);
      return game;
    };
    const recovered = prepare();
    expect(firePulse(recovered.state.player, recovered.state.robots, 19, -1_000, 'level-001', recovered.state.seed, 0, 0).weakPoint).toBe(true);
    const rapid = prepare();
    const result = firePulse(rapid.state.player, rapid.state.robots, 19, -1_000, 'level-001', rapid.state.seed, 4, 4);
    expect(result.hitRobotId).toBe(rapid.state.robots[0]!.id);
    expect(result.weakPoint).toBe(false);
    expect(result.spreadRadians).toBe(PULSE_MAX_SPREAD_RADIANS);
  });

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
    const pulse = game.state.events.find((event) => event.type === 'pulse-fired');
    expect(pulse).toMatchObject({ value: PULSE_IMPACT_KIND.wall });
    expect([pulse?.x, pulse?.y, pulse?.z].every((value) => Number.isFinite(value))).toBe(true);
  });

  it('reports a deterministic visual contact anchor for robot hits and wall misses', () => {
    const hitGame = new GameSimulation('pulse-contact-hit');
    const target = hitGame.state.robots[0]!;
    for (const other of hitGame.state.robots.slice(1)) other.active = false;
    target.x = hitGame.state.player.x;
    target.z = hitGame.state.player.z + 2;
    const hit = firePulse(hitGame.state.player, hitGame.state.robots, 0, -1_000);
    expect(hit.impactKind).toBe(PULSE_IMPACT_KIND.robot);
    expect([hit.impactX, hit.impactY, hit.impactZ].every(Number.isFinite)).toBe(true);

    const wallGame = new GameSimulation('pulse-contact-wall');
    wallGame.state.robots.forEach((robot) => { robot.active = false; });
    wallGame.state.player.yaw = 0;
    const wall = firePulse(wallGame.state.player, wallGame.state.robots, 0, -1_000);
    expect(wall.impactKind).toBe(PULSE_IMPACT_KIND.wall);
    expect([wall.impactX, wall.impactY, wall.impactZ].every(Number.isFinite)).toBe(true);
  });

  it('rewards precision only while the authored vulnerability beat is active', () => {
    const game = new GameSimulation('weak-point-proof');
    const target = game.state.robots[0]!;
    for (const other of game.state.robots.slice(1)) other.active = false;
    target.x = game.state.player.x;
    target.z = game.state.player.z + 2;
    target.heading = Math.PI;
    game.state.player.yaw = Math.PI;
    const definition = ROBOT_DEFINITIONS[target.id]!;
    const core = weakPointPosition(target, definition);
    game.state.player.pitch = Math.atan2(
      core.y - PLAYER_EYE_HEIGHT, Math.hypot(core.x - game.state.player.x, core.z - game.state.player.z),
    );

    const normal = firePulse(game.state.player, game.state.robots, 0, -1_000);
    expect(normal.weakPoint).toBe(false);
    expect(target.health).toBe(100 - PULSE_DAMAGE);

    target.health = 50;
    game.state.player.energy = 100;
    const vulnerable = firePulse(game.state.player, game.state.robots, 19, 0);
    expect(vulnerable.weakPoint).toBe(true);
    expect(vulnerable.defeatedRobotId).toBe(target.id);
    expect(vulnerable.coinsAwarded).toBe(definition.coinReward * WEAK_POINT_COIN_MULTIPLIER);
    expect(game.state.player.coins).toBe(definition.coinReward * WEAK_POINT_COIN_MULTIPLIER);
  });

  it('keeps an off-core body hit normal during a vulnerability beat', () => {
    const game = new GameSimulation('weak-point-miss');
    const target = game.state.robots[0]!;
    for (const other of game.state.robots.slice(1)) other.active = false;
    target.x = game.state.player.x;
    target.z = game.state.player.z + 2;
    target.heading = Math.PI / 2;
    game.state.player.yaw = Math.PI;
    game.state.player.pitch = Math.atan2(
      ROBOT_DEFINITIONS[target.id]!.scale * 1.16 - PLAYER_EYE_HEIGHT, 2,
    );
    const hit = firePulse(game.state.player, game.state.robots, 19, -1_000);
    expect(hit.weakPoint).toBe(false);
    expect(target.health).toBe(100 - PULSE_DAMAGE);
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
    const detonation = game.state.events.find((event) => event.type === 'bomb-detonated');
    expect(detonation).toMatchObject({ value: bomb.id, x: bomb.x, y: bomb.y, z: bomb.z });
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

  it('applies the same vulnerability multiplier to a precisely aimed laser', () => {
    const game = new GameSimulation('laser-weak-point', TRAINING_WEAPON_MASK);
    const target = isolatedTarget(game)!;
    target.heading = Math.PI;
    game.state.player.yaw = Math.PI;
    const core = weakPointPosition(target, ROBOT_DEFINITIONS[target.id]!);
    game.state.player.pitch = Math.atan2(
      core.y - PLAYER_EYE_HEIGHT, Math.hypot(core.x - game.state.player.x, core.z - game.state.player.z),
    );
    const result = fireLaser(game.state.player, game.state.robots, LASER_BASE_DAMAGE, 19);
    expect(result.hit?.weakPoint).toBe(true);
    expect(target.health).toBeCloseTo(100 - LASER_BASE_DAMAGE * WEAK_POINT_DAMAGE_MULTIPLIER, 5);
  });

  it('applies snapshotted weapon upgrades to damage, efficiency, capacity, and heat', () => {
    const upgraded = new GameSimulation('upgrade-combat', TRAINING_WEAPON_MASK, {
      pulseDamage: 1, pulseEfficiency: 1, swordCooling: 1, bombCapacity: 1, laserCooling: 1,
    });
    const target = isolatedTarget(upgraded)!;
    upgraded.step({ ...idle, weapon: 'pulse', fire: true });
    expect(target.health).toBe(54);
    expect(upgraded.state.player.energy).toBeCloseTo(96.5, 5);
    expect(upgraded.state.player.bombs).toBe(4);

    target.health = 100;
    upgraded.step({ ...idle, weapon: 'sword', fire: true });
    expect(upgraded.state.player.swordHeat).toBeLessThan(18);
    upgraded.step({ ...idle, weapon: 'laser', fire: true });
    expect(upgraded.state.player.laserHeat).toBeLessThan(1.35);
  });
});
