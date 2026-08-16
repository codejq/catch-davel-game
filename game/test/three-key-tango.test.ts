import { describe, expect, it } from 'vitest';
import { createObservation } from '../src/agent/observation';
import { GameSimulation } from '../src/sim/game';
import {
  closedDoorCells, collectLevelInteractions, openNearbyDoor, stepLevelHazardPhases,
} from '../src/sim/interactions';
import { createSimulationSnapshot, parseSimulationSnapshot } from '../src/sim/serialization';

describe('Three-Key Tango authoritative progression', () => {
  it('opens each lock from its own key and keeps the final door closed until all three are collected', () => {
    const simulation = new GameSimulation(
      'campaign-level-028-v1', undefined, undefined, 'campaign', 'level-028',
    );
    const level = simulation.state.level;
    const keys = level.pickups.filter((pickup) => pickup.kind === 'key');
    expect(keys.map((key) => key.id)).toEqual(['brass-tango-key', 'cyan-tango-key', 'magenta-tango-key']);
    expect(level.hazards.map((hazard) => hazard.active)).toEqual([true, true]);
    expect(closedDoorCells(level)).toEqual(expect.arrayContaining([
      { column: 6, row: 5 }, { column: 7, row: 8 }, { column: 9, row: 12 },
    ]));

    simulation.state.player.x = keys[0]!.x;
    simulation.state.player.z = keys[0]!.z;
    expect(collectLevelInteractions(simulation.state.player, level)).toContainEqual({ type: 'key-collected' });
    stepLevelHazardPhases(level, simulation.state.tick, 'level-028');
    expect(level.keyCollected).toBe(false);
    expect(level.hazards.map((hazard) => hazard.active)).toEqual([false, true]);
    expect(openNearbyDoor(simulation.state.player, level)).toBeNull();

    const restored = parseSimulationSnapshot(JSON.stringify(createSimulationSnapshot(simulation.state)));
    expect(restored.level.pickups.filter((pickup) => pickup.kind === 'key').map((key) => key.active))
      .toEqual([false, true, true]);
    expect(createObservation(GameSimulation.fromSnapshot(restored).state).pickups.filter((pickup) => pickup.kind === 'key'))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'brass-tango-key', active: false }),
        expect.objectContaining({ id: 'cyan-tango-key', active: true }),
        expect.objectContaining({ id: 'magenta-tango-key', active: true }),
      ]));

    for (const [index, expectedHazards] of [[1, [false, false]], [2, [false, false]]] as const) {
      simulation.state.player.x = keys[index]!.x;
      simulation.state.player.z = keys[index]!.z;
      collectLevelInteractions(simulation.state.player, level);
      stepLevelHazardPhases(level, simulation.state.tick, 'level-028');
      expect(level.hazards.map((hazard) => hazard.active)).toEqual(expectedHazards);
      expect(level.keyCollected).toBe(index === 2);
    }

    simulation.state.player.x = level.door.x;
    simulation.state.player.z = level.door.z;
    expect(openNearbyDoor(simulation.state.player, level)).toEqual({ type: 'door-opened' });
    expect(closedDoorCells(level)).toEqual([]);
  });

  it('rejects a partial-key snapshot that falsely claims every key is collected', () => {
    const simulation = new GameSimulation(
      'three-key-snapshot-proof', undefined, undefined, 'campaign', 'level-028',
    );
    const snapshot = createSimulationSnapshot(simulation.state);
    snapshot.level.keyCollected = true;
    expect(() => parseSimulationSnapshot(JSON.stringify(snapshot))).toThrow(/key state/);
  });
});
