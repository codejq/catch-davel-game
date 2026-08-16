import { describe, expect, it } from 'vitest';
import { BaselineCampaignAgent } from '../src/agent/baseline-policy';
import { createObservation } from '../src/agent/observation';
import { CHAPTER_01_LEVELS, type Chapter01LevelId } from '../src/content/levels/chapter-01';
import { GameSimulation } from '../src/sim/game';
import { stateChecksum } from '../src/sim/serialization';

function runLevel(levelId: Chapter01LevelId): GameSimulation {
  const level = CHAPTER_01_LEVELS.find((candidate) => candidate.id === levelId)!;
  const validation = level.agentValidation.runs.find((run) => run.mode === 'live-agent' && run.difficulty === 'Standard')!;
  const simulation = new GameSimulation(level.seed, undefined, undefined, 'campaign', levelId);
  const policy = new BaselineCampaignAgent();
  while (!simulation.state.victory && !simulation.state.defeat && simulation.state.tick < validation.maxTicks) {
    const action = policy.next(createObservation(simulation.state));
    simulation.step({
      forward: action.forward ?? 0,
      strafe: action.strafe ?? 0,
      yawDelta: action.turn ?? 0,
      pitchDelta: action.look ?? 0,
      fire: action.fire === true,
      altFire: action.altFire === true,
      weapon: action.weapon ?? null,
    });
  }
  return simulation;
}

describe('Chapter 1 campaign QA runner', () => {
  for (const level of CHAPTER_01_LEVELS) {
    it(`completes ${level.id} within its declared Standard tick budget`, () => {
      const first = runLevel(level.id as Chapter01LevelId);
      const second = runLevel(level.id as Chapter01LevelId);
      const validation = level.agentValidation.runs[0]!;
      const diagnostic = JSON.stringify({
        levelId: level.id,
        tick: first.state.tick,
        health: first.state.player.health,
        remaining: first.state.robots.filter((robot) => robot.active).length,
        checksum: stateChecksum(first.state),
      });
      expect(first.state.defeat, diagnostic).toBe(false);
      expect(first.state.victory, diagnostic).toBe(validation.expectedCompletion);
      expect(first.state.tick, diagnostic).toBeLessThan(validation.maxTicks);
      expect(stateChecksum(second.state), diagnostic).toBe(stateChecksum(first.state));
      expect(second.state.tick, diagnostic).toBe(first.state.tick);
    });
  }
});
