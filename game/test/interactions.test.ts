import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { isPlayerPositionValidWithBlockers } from '../src/sim/level';
import {
  closedDoorCells, queueNextEncounterWave, stepEncounterWaves, stepLevelHazards,
} from '../src/sim/interactions';
import { createSimulationSnapshot, parseSimulationSnapshot } from '../src/sim/serialization';
import { CHAPTER_01_LEVELS, type Chapter01LevelId } from '../src/content/levels/chapter-01';

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

  it('materializes distinct valid interaction layouts for every Chapter 1 level', () => {
    const signatures: string[] = [];
    for (const definition of CHAPTER_01_LEVELS) {
      const game = new GameSimulation(definition.seed, undefined, undefined, 'campaign', definition.id as Chapter01LevelId);
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
    expect(new Set(signatures).size).toBe(10);
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
});
