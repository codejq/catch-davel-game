import { describe, expect, it } from 'vitest';
import { createObservation, levelObservation } from '../src/agent/observation';
import { GameSimulation } from '../src/sim/game';

describe('agent observation contract', () => {
  it('provides stable structured state and a machine-readable maze', () => {
    const first = new GameSimulation('agent-proof');
    const second = new GameSimulation('agent-proof');
    expect(createObservation(first.state)).toEqual(createObservation(second.state));
    const observation = createObservation(first.state);
    expect(observation.schemaVersion).toBe(4);
    expect(observation.player.selectedWeapon).toBe('pulse');
    expect(observation.player.unlockedWeapons).toEqual(['pulse']);
    expect(observation.playerBombs).toEqual([]);
    expect(observation.robots).toHaveLength(6);
    expect(observation.robots.map((robot) => robot.id)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(observation.pickups.map((pickup) => pickup.id)).toEqual(['repair-kit', 'workshop-key', 'pulse-cell']);
    expect(observation.objective).toEqual({ id: 'deactivate-davels', complete: false, exitUnlocked: false });
    expect(observation.door).toMatchObject({ id: 'workshop-lock', open: false, requiresKey: true });
    expect(levelObservation().rows.every((row) => row.length === 15)).toBe(true);
  });
});
