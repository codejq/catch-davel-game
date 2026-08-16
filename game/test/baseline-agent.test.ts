import { describe, expect, it } from 'vitest';
import { BaselineCampaignAgent } from '../src/agent/baseline-policy';
import { createObservation } from '../src/agent/observation';
import { GameSimulation } from '../src/sim/game';
import { stateChecksum } from '../src/sim/serialization';
import { LEVEL_001 } from '../src/content/levels/level-001';

describe('public-observation baseline campaign agent', () => {
  it('completes Level 1 deterministically without hidden state', () => {
    const run = (): GameSimulation => {
      const simulation = new GameSimulation();
      const policy = new BaselineCampaignAgent();
      const maximumTicks = LEVEL_001.agentValidation.runs[0].maxTicks;
      while (!simulation.state.victory && !simulation.state.defeat && simulation.state.tick < maximumTicks) {
        const action = policy.next(createObservation(simulation.state));
        simulation.step({
          forward: action.forward ?? 0,
          strafe: action.strafe ?? 0,
          yawDelta: action.turn ?? 0,
          pitchDelta: action.look ?? 0,
          fire: action.fire === true,
        });
      }
      return simulation;
    };
    const first = run();
    const second = run();
    const result = {
      tick: first.state.tick, health: first.state.player.health,
      remaining: first.state.robots.filter((robot) => robot.active).length,
      key: first.state.level.keyCollected, door: first.state.level.door.open,
      checkpoint: first.state.level.checkpoint.activated, objective: first.state.level.objectiveComplete,
    };
    expect(first.state.tick, JSON.stringify(result)).toBe(4_519);
    expect(stateChecksum(first.state)).toBe(LEVEL_001.agentValidation.runs[0].expectedChecksum);
    expect(first.state.defeat, JSON.stringify(result)).toBe(false);
    expect(first.state.victory).toBe(true);
    expect(first.state.level.keyCollected).toBe(true);
    expect(first.state.level.door.open).toBe(true);
    expect(first.state.level.checkpoint.activated).toBe(true);
    expect(first.state.tick).toBeLessThan(LEVEL_001.agentValidation.runs[0].maxTicks);
    expect(second.state.tick).toBe(first.state.tick);
    expect(stateChecksum(second.state)).toBe(stateChecksum(first.state));
  });
});
