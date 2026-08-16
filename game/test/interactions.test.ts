import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { isPlayerPositionValidWithBlockers } from '../src/sim/level';
import {
  closedDoorCells, hazardTicksUntilToggle, queueNextEncounterWave, stepEncounterWaves, stepLevelHazards,
  stepDefenseTarget, stepLevelHazardPhases,
} from '../src/sim/interactions';
import { createSimulationSnapshot, parseSimulationSnapshot } from '../src/sim/serialization';
import { PLAYABLE_LEVELS, type PlayableLevelId } from '../src/content/levels/catalog';

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

  it('clamps pickups and regeneration to authoritative upgraded resource caps', () => {
    const game = new GameSimulation(
      'upgraded-pickup-proof', undefined, undefined, 'campaign', 'level-001', 'standard',
      { maxHealth: 2, maxEnergy: 3 },
    );
    expect(game.state.player).toMatchObject({ health: 130, maxHealth: 130, energy: 136, maxEnergy: 136 });
    const repair = game.state.level.pickups.find((pickup) => pickup.kind === 'health')!;
    game.state.player.health = 120;
    game.state.player.x = repair.x;
    game.state.player.z = repair.z;
    game.step(idle);
    expect(game.state.player.health).toBe(130);
    expect(game.state.events).toContainEqual(expect.objectContaining({ type: 'health-collected', value: 10 }));
    game.state.player.energy = 135.95;
    game.state.player.x = game.state.level.checkpoint.x + 1;
    game.state.player.z = game.state.level.checkpoint.z + 1;
    game.step(idle);
    expect(game.state.player.energy).toBe(136);
  });

  it('awards deterministic branch and secret coin caches once', () => {
    const game = new GameSimulation('coin-cache-proof', undefined, undefined, 'campaign', 'level-004');
    const caches = game.state.level.pickups.filter((pickup) => pickup.kind === 'coin');
    expect(caches.map((pickup) => pickup.id)).toEqual(['coin-cache', 'secret-coin-cache']);
    const expectedCoins = caches.reduce((sum, pickup) => sum + pickup.amount, 0);
    for (const cache of caches) {
      game.state.player.x = cache.x;
      game.state.player.z = cache.z;
      game.step(idle);
      expect(game.state.events).toContainEqual(expect.objectContaining({ type: 'coin-collected', value: cache.amount }));
    }
    expect(game.state.player.coins).toBe(expectedCoins);
    expect(caches.every((pickup) => !pickup.active)).toBe(true);
  });

  it('turns the Level 4 key pickup into a one-shot authoritative ambush', () => {
    const game = new GameSimulation('ambush-proof', undefined, undefined, 'campaign', 'level-004');
    expect(game.state.robots.every((robot) => !robot.spawned && !robot.active)).toBe(true);
    const beforeTrigger = parseSimulationSnapshot(JSON.stringify(createSimulationSnapshot(game.state)));
    const key = game.state.level.pickups.find((pickup) => pickup.kind === 'key')!;
    game.state.player.x = key.x;
    game.state.player.z = key.z;
    game.step(idle);
    expect(game.state.events.map((event) => event.type)).toEqual(expect.arrayContaining([
      'key-collected', 'ambush-triggered',
    ]));
    expect(game.state.robots.every((robot) => robot.spawned && robot.active)).toBe(true);
    game.step(idle);
    expect(game.state.events.some((event) => event.type === 'ambush-triggered')).toBe(false);

    const restored = GameSimulation.fromSnapshot(beforeTrigger);
    restored.state.player.x = key.x;
    restored.state.player.z = key.z;
    restored.step(idle);
    expect(restored.state.robots.map((robot) => [robot.spawned, robot.active])).toEqual(
      game.state.robots.map((robot) => [robot.spawned, robot.active]),
    );
  });

  it('freezes Level 7 Davel motion and attacks on deterministic flashlight beats', () => {
    const game = new GameSimulation('freeze-dance-proof', undefined, undefined, 'campaign', 'level-007');
    const before = game.state.robots.map((robot) => ({
      x: robot.x, z: robot.z, danceTime: robot.danceTime, cooldown: robot.attackCooldownTicks,
    }));
    game.step(idle);
    expect(game.state.robots.map((robot) => ({
      x: robot.x, z: robot.z, danceTime: robot.danceTime, cooldown: robot.attackCooldownTicks,
    }))).toEqual(before);
    expect(game.state.projectiles).toHaveLength(0);

    game.state.tick = 60;
    game.step(idle);
    expect(game.state.robots.some((robot, index) => robot.danceTime !== before[index]!.danceTime)).toBe(true);
  });

  it('materializes distinct valid interaction layouts for every playable campaign level', () => {
    const signatures: string[] = [];
    for (const definition of PLAYABLE_LEVELS) {
      const game = new GameSimulation(definition.seed, undefined, undefined, 'campaign', definition.id as PlayableLevelId);
      const level = game.state.level;
      signatures.push([
        ...level.pickups.map((pickup) => `${pickup.x},${pickup.z},${pickup.amount}`),
        `${level.door.x},${level.door.z}`, `${level.checkpoint.x},${level.checkpoint.z}`,
      ].join('|'));
      expect(level.checkpoint.id).toBe(definition.checkpoints[0]!.presetId);
      expect(isPlayerPositionValidWithBlockers(
        level.door.x, level.door.z, 0.34, closedDoorCells(level), game.state.levelId,
      )).toBe(false);
      expect(new Set(level.pickups.map((pickup) => `${pickup.x},${pickup.z}`)).size).toBe(level.pickups.length);
    }
    expect(new Set(signatures).size).toBe(PLAYABLE_LEVELS.length);
  });

  it('applies the Level 6 conveyor deterministically only during its active phase', () => {
    const game = new GameSimulation('conveyor-proof', undefined, undefined, 'campaign', 'level-006');
    const hazard = game.state.level.hazards[0]!;
    game.state.player.x = hazard.x;
    game.state.player.z = hazard.z;
    const startZ = game.state.player.z;
    stepLevelHazards(game.state.player, game.state.level, 0, game.state.levelId);
    expect(hazard.active).toBe(true);
    expect(game.state.player.z).toBeCloseTo(startZ + 2.1 / 60, 8);
    const inactiveZ = game.state.player.z;
    stepLevelHazards(game.state.player, game.state.level, 120, game.state.levelId);
    expect(hazard.active).toBe(false);
    expect(game.state.player.z).toBe(inactiveZ);
  });

  it('cycles three staggered Level 8 clockwork gates without trapping a crossing player', () => {
    const game = new GameSimulation('timed-door-proof', undefined, undefined, 'campaign', 'level-008');
    const gates = game.state.level.hazards;
    expect(gates.map((hazard) => hazard.kind)).toEqual(['timed-door', 'timed-door', 'timed-door']);
    expect(gates.map((hazard) => hazard.active)).toEqual([true, true, false]);
    expect(gates.map((hazard) => hazardTicksUntilToggle(hazard, 0))).toEqual([105, 45, 60]);
    expect(closedDoorCells(game.state.level)).toEqual(expect.arrayContaining([
      { column: 6, row: 8 }, { column: 10, row: 8 },
    ]));

    game.state.player.x = gates[0]!.x;
    game.state.player.z = gates[0]!.z;
    expect(closedDoorCells(game.state.level, game.state.player)).not.toContainEqual({ column: 6, row: 8 });

    stepLevelHazardPhases(game.state.level, 60);
    expect(gates.map((hazard) => hazard.active)).toEqual([true, false, true]);
    stepLevelHazardPhases(game.state.level, 105);
    expect(gates.map((hazard) => hazard.active)).toEqual([false, false, true]);

    game.state.tick = 105;
    const restored = parseSimulationSnapshot(JSON.stringify(createSimulationSnapshot(game.state)));
    expect(restored.level.hazards).toEqual(gates);

    const inconsistent = structuredClone(createSimulationSnapshot(game.state));
    inconsistent.level.hazards[0]!.active = true;
    expect(() => parseSimulationSnapshot(JSON.stringify(inconsistent))).toThrow(/hazard phase/);
  });

  it('holds and deterministically releases the second Level 9 wave across snapshots', () => {
    const game = new GameSimulation('wave-proof', undefined, undefined, 'campaign', 'level-009');
    expect(game.state.robots.filter((robot) => robot.spawned)).toHaveLength(5);
    expect(game.state.robots.filter((robot) => robot.active)).toHaveLength(5);
    for (const robot of game.state.robots) robot.active = false;
    expect(queueNextEncounterWave(game.state.level)).toBe(true);
    expect(game.state.level.encounter.pendingTicks).toBe(45);
    const restored = parseSimulationSnapshot(JSON.stringify(createSimulationSnapshot(game.state)));
    expect(restored.level.encounter).toEqual({ waveIndex: 0, waveCount: 2, pendingTicks: 45 });
    for (let tick = 0; tick < 44; tick += 1) {
      stepEncounterWaves(game.state.robots, game.state.level, game.state.levelId);
    }
    expect(game.state.level.encounter.pendingTicks).toBe(1);
    expect(game.state.robots.some((robot) => robot.active)).toBe(false);
    stepEncounterWaves(game.state.robots, game.state.level, game.state.levelId);
    expect(game.state.level.encounter).toEqual({ waveIndex: 1, waveCount: 2, pendingTicks: 0 });
    expect(game.state.robots.filter((robot) => robot.spawned)).toHaveLength(10);
    expect(game.state.robots.filter((robot) => robot.active)).toHaveLength(5);
  });

  it('keeps a queued second wave authoritative after one bomb defeats several Davels', () => {
    const game = new GameSimulation('wave-bomb-proof', undefined, undefined, 'campaign', 'level-009');
    for (const robot of game.state.robots.filter((candidate) => candidate.active)) {
      robot.x = game.state.player.x;
      robot.z = game.state.player.z;
      robot.health = 1;
    }
    game.state.playerBombs.push({
      id: 1, x: game.state.player.x, y: 0.15, z: game.state.player.z,
      velocityX: 0, velocityY: 0, velocityZ: 0, fuseTicks: 1,
    });
    game.state.nextPlayerBombId = 2;
    game.step(idle);
    expect(game.state.level.encounter).toEqual({ waveIndex: 0, waveCount: 2, pendingTicks: 45 });
    expect(game.state.level.objectiveComplete).toBe(false);
  });

  it('keeps boss training single-wave in every maze', () => {
    const game = new GameSimulation('boss-wave-proof', undefined, undefined, 'boss-training', 'level-009');
    expect(game.state.level.encounter).toEqual({ waveIndex: 0, waveCount: 1, pendingTicks: 0 });
    expect(game.state.robots).toHaveLength(1);
  });

  it('makes the Level 17 prize bank solid, authoritative, and destructible', () => {
    const game = new GameSimulation('defense-target-proof', undefined, undefined, 'campaign', 'level-017');
    const target = game.state.level.defense!;
    expect(target).toMatchObject({ id: 'prize-bank', health: 360, maxHealth: 360 });
    expect(closedDoorCells(game.state.level)).toContainEqual({ column: target.column, row: target.row });
    game.state.level.keyCollected = true;
    game.state.level.pickups.find((pickup) => pickup.kind === 'key')!.active = false;
    const attacker = game.state.robots[0]!;
    attacker.x = target.x;
    attacker.z = target.z;
    const strikes = stepDefenseTarget(game.state.level, game.state.robots, 0);
    expect(strikes).toEqual([{ robotId: attacker.id, damage: 9 }]);
    expect(target.health).toBe(351);

    const restored = parseSimulationSnapshot(JSON.stringify(createSimulationSnapshot(game.state)));
    expect(restored.level.defense).toEqual(target);
    target.health = 1;
    game.step(idle);
    expect(target.health).toBe(0);
    expect(game.state.defeat).toBe(true);
  });

  it('reverses the Level 18 route gates exactly when the key is collected', () => {
    const game = new GameSimulation('backtrack-gate-proof', undefined, undefined, 'campaign', 'level-018');
    const forward = game.state.level.hazards.find((hazard) => hazard.id === 'backtrack-forward-gate')!;
    const returning = game.state.level.hazards.find((hazard) => hazard.id === 'backtrack-return-gate')!;
    expect([forward.active, returning.active]).toEqual([false, true]);
    expect(hazardTicksUntilToggle(forward, game.state.tick, game.state.levelId)).toBe(0);
    const key = game.state.level.pickups.find((pickup) => pickup.kind === 'key')!;
    game.state.player.x = key.x;
    game.state.player.z = key.z;
    game.step(idle);
    expect(game.state.level.keyCollected).toBe(true);
    expect([forward.active, returning.active]).toEqual([true, false]);
    expect(closedDoorCells(game.state.level)).toContainEqual({ column: forward.column, row: forward.row });
    expect(closedDoorCells(game.state.level)).not.toContainEqual({ column: returning.column, row: returning.row });
    const restored = parseSimulationSnapshot(JSON.stringify(createSimulationSnapshot(game.state)));
    expect(restored.level.hazards).toEqual(game.state.level.hazards);
  });

  it('runs the Level 19 gauntlet with opposing motion lanes and alternating curtains', () => {
    const game = new GameSimulation('midnight-matinee-proof', undefined, undefined, 'campaign', 'level-019');
    const conveyors = game.state.level.hazards.filter((hazard) => hazard.kind === 'conveyor');
    const curtains = game.state.level.hazards.filter((hazard) => hazard.kind === 'timed-door');
    expect(conveyors.map(({ directionZ }) => directionZ)).toEqual([1, -1]);
    expect(curtains.map(({ active }) => active)).toEqual([true, false]);
    stepLevelHazardPhases(game.state.level, 80, game.state.levelId);
    expect(curtains.map(({ active }) => active)).toEqual([false, true]);
    expect(closedDoorCells(game.state.level)).toContainEqual({ column: 8, row: 10 });
  });
});
