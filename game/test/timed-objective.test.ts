import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';

const idle = { forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false } as const;

describe('Valve Velocity timed objective', () => {
  it('keeps the exit locked until the authoritative stabilization tick', () => {
    const simulation = new GameSimulation('campaign-level-024-v1', undefined, undefined, 'campaign', 'level-024');
    for (const robot of simulation.state.robots) {
      robot.spawned = true;
      robot.active = false;
      robot.health = 0;
    }
    simulation.state.level.encounter.waveIndex = 2;
    simulation.state.tick = 3_599;
    simulation.step(idle);
    expect(simulation.state.level.objectiveComplete).toBe(false);
    simulation.step(idle);
    expect(simulation.state.level.objectiveComplete).toBe(true);
    expect(simulation.state.events.map((event) => event.type)).toEqual(['objective-complete', 'exit-unlocked']);
  });
});
