import { describe, expect, it } from 'vitest';
import { createObservation } from '../src/agent/observation';
import { GameSimulation } from '../src/sim/game';
import { stepEnemyCombat } from '../src/sim/enemy-combat';

describe('The Crimson Pair synchronization', () => {
  it('starts, exposes, and resolves both elite telegraphs on the same authoritative ticks', () => {
    const simulation = new GameSimulation('campaign-level-025-v1', undefined, undefined, 'campaign', 'level-025');
    for (const robot of simulation.state.robots) {
      robot.spawned = true;
      robot.active = robot.id === 5 || robot.id === 7;
      robot.combatState = 'patrol';
      robot.combatTicks = 0;
      robot.attackCooldownTicks = 0;
      if (robot.active) {
        robot.x = simulation.state.player.x;
        robot.z = simulation.state.player.z;
      }
    }
    simulation.state.level.encounter.waveIndex = 2;
    let nextProjectileId = 1;
    const opening = stepEnemyCombat(
      simulation.state.player, simulation.state.robots, simulation.state.projectiles,
      nextProjectileId, 0, 'level-025', false, 'standard',
    );
    nextProjectileId = opening.nextProjectileId;
    const pair = simulation.state.robots.filter((robot) => robot.active);
    expect(pair.map((robot) => [robot.id, robot.combatState, robot.combatTicks])).toEqual([
      [5, 'telegraph', 35], [7, 'telegraph', 35],
    ]);
    expect(createObservation(simulation.state).robots.map((robot) => [robot.id, robot.combatState, robot.combatTicks]))
      .toEqual([[5, 'telegraph', 35], [7, 'telegraph', 35]]);

    let resolvedTick: number | null = null;
    for (let tick = 1; tick < 120 && resolvedTick === null; tick += 1) {
      simulation.state.tick = tick;
      const result = stepEnemyCombat(
        simulation.state.player, simulation.state.robots, simulation.state.projectiles,
        nextProjectileId, tick, 'level-025', false, 'standard',
      );
      nextProjectileId = result.nextProjectileId;
      if (result.buffRobotIds.includes(5) || result.firedRobotIds.includes(7)) {
        expect(result.buffRobotIds).toContain(5);
        expect(result.firedRobotIds).toContain(7);
        resolvedTick = tick;
      }
    }
    expect(resolvedTick).not.toBeNull();
    expect(pair.map((robot) => robot.attackCooldownTicks)).toEqual([96, 96]);
  });
});
