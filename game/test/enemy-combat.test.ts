import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { DEFAULT_WEAPON_UPGRADES, TRAINING_WEAPON_MASK } from '../src/sim/weapons';
import { isDanceAttackOnset } from '../src/sim/dance-timing';

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
    let firedTick: number | null = null;
    for (let tick = 0; tick < 120 && !game.state.defeat; tick += 1) {
      game.step(idle);
      sawFireball ||= game.state.projectiles.some((projectile) => projectile.kind === 'fireball');
      sawHit ||= game.state.events.some((event) => event.type === 'player-hit');
      firedTick ??= game.state.events.find((event) => event.type === 'robot-fired')?.tick ?? null;
    }
    expect(sawFireball).toBe(true);
    expect(sawHit).toBe(true);
    expect(game.state.player.health).toBe(0);
    expect(game.state.defeat).toBe(true);
    expect(firedTick).not.toBeNull();
    expect(isDanceAttackOnset(game.state.levelId, firedTick!)).toBe(true);
  });

  it('gives Wobble Scouts a readable close-range slap instead of a projectile', () => {
    const game = new GameSimulation('enemy-melee-proof');
    isolate(game, 0, 1.4);
    const initialHealth = game.state.player.health;
    let meleeTick: number | null = null;
    for (let tick = 0; tick < 130 && meleeTick === null; tick += 1) {
      game.step(idle);
      meleeTick = game.state.events.find((event) => event.type === 'robot-melee')?.tick ?? null;
    }
    expect(game.state.player.health).toBeLessThan(initialHealth);
    expect(game.state.projectiles).toHaveLength(0);
    expect(meleeTick).not.toBeNull();
    expect(isDanceAttackOnset(game.state.levelId, meleeTick!)).toBe(true);
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
    let buffTick: number | null = null;
    for (let tick = 0; tick < 130; tick += 1) {
      game.step(idle);
      sawBuff ||= game.state.events.some((event) => event.type === 'robot-buff');
      buffTick ??= game.state.events.find((event) => event.type === 'robot-buff')?.tick ?? null;
    }
    expect(ally.tempoBuffTicks).toBeGreaterThan(0);
    expect(sawBuff).toBe(true);
    expect(buffTick).not.toBeNull();
    expect(isDanceAttackOnset(game.state.levelId, buffTick!)).toBe(true);
  });

  it('does not begin an attack through a maze wall', () => {
    const game = new GameSimulation('enemy-wall-proof');
    isolate(game, 4, -4);
    game.step(idle);
    expect(game.state.robots[4]!.combatState).toBe('patrol');
    expect(game.state.projectiles).toHaveLength(0);
  });

  it('runs The Final Invoice through readable one-, two-, and three-fireball phases', () => {
    const game = new GameSimulation('boss-phase-proof', TRAINING_WEAPON_MASK, DEFAULT_WEAPON_UPGRADES, 'boss-training');
    const boss = game.state.robots[0]!;
    expect(boss.id).toBe(6);
    expect(boss.health).toBe(420);
    boss.x = game.state.player.x;
    boss.z = game.state.player.z + 3;
    boss.attackCooldownTicks = 0;
    const advanceToVolley = (): { readonly count: number; readonly tick: number } => {
      for (let tick = 0; tick < 140; tick += 1) {
        game.step(idle);
        const fired = game.state.events.find((event) => event.type === 'robot-fired');
        if (fired !== undefined) return { count: game.state.projectiles.length, tick: fired.tick };
      }
      throw new Error('Boss volley did not fire');
    };
    const first = advanceToVolley();
    expect(first.count).toBe(1);
    expect(isDanceAttackOnset(game.state.levelId, first.tick)).toBe(true);
    game.state.projectiles.length = 0;
    boss.health = 270;
    boss.attackCooldownTicks = 0;
    game.step(idle);
    expect(boss.bossPhase).toBe(2);
    expect(game.state.events.map((event) => event.type)).toContain('boss-phase');
    const second = advanceToVolley();
    expect(second.count).toBe(2);
    expect(isDanceAttackOnset(game.state.levelId, second.tick)).toBe(true);
    game.state.projectiles.length = 0;
    boss.health = 130;
    boss.attackCooldownTicks = 0;
    game.step(idle);
    expect(boss.bossPhase).toBe(3);
    const third = advanceToVolley();
    expect(third.count).toBe(3);
    expect(isDanceAttackOnset(game.state.levelId, third.tick)).toBe(true);
  });
});
