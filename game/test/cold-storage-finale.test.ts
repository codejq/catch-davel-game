import { describe, expect, it } from 'vitest';
import { createObservation } from '../src/agent/observation';
import { localizedContentString } from '../src/content/localization/catalogs';
import { runtimeUiText } from '../src/content/localization/runtime-ui';
import { LEVEL_036 } from '../src/content/levels/level-036';
import { mazeRuntimeProfile } from '../src/content/runtime-manifests';
import { GameSimulation } from '../src/sim/game';
import { campaignRobotWaves, ROBOT_DEFINITIONS } from '../src/sim/robots';

function coldStorage(): GameSimulation {
  return new GameSimulation('campaign-level-036-v1', undefined, undefined, 'campaign', 'level-036');
}

describe('Cold Storage campaign finale', () => {
  it('stages the complete stable roster before the Refrigerator Robot', () => {
    const waves = campaignRobotWaves('level-036');
    expect(waves).toEqual([[0, 2, 4, 8], [1, 3, 9, 10], [5, 7, 11], [6]]);
    expect(new Set(waves.flat())).toEqual(new Set(ROBOT_DEFINITIONS.map((_, id) => id)));
    expect(ROBOT_DEFINITIONS[waves[3]![0]!]!.rank).toBe('boss');
  });

  it('makes the single authored repair intentionally limited', () => {
    const level = coldStorage();
    expect(mazeRuntimeProfile(LEVEL_036.maze.templateSetId).interactions.health.amount).toBe(12);
    expect(level.state.level.pickups.find((pickup) => pickup.kind === 'health')?.amount).toBe(12);
  });

  it('keeps four opposing ice lanes and publishes the final boss phase to LLMs', () => {
    const simulation = coldStorage();
    const hazards = simulation.state.level.hazards;
    expect(hazards).toHaveLength(4);
    expect(new Set(hazards.map((hazard) => `${hazard.directionX},${hazard.directionZ}`))).toEqual(
      new Set(['1,0', '0,-1', '0,1', '-1,0']),
    );
    const boss = simulation.state.robots.find((robot) => robot.id === 6)!;
    for (const robot of simulation.state.robots) {
      robot.spawned = true;
      robot.active = robot.id === boss.id;
    }
    simulation.state.level.encounter.waveIndex = 3;
    expect(createObservation(simulation.state).robots.find((robot) => robot.id === boss.id))
      .toMatchObject({ rank: 'boss', bossPhase: expect.any(Number) });
  });

  it('authors a bright Refrigerator Robot identity in both release locales', () => {
    expect(LEVEL_036.dance.presetId).toBe('refrigerator-robot-rumble');
    expect(localizedContentString('en', 'levels.036.name')).toBe('Cold Storage');
    expect(localizedContentString('ar', 'levels.036.name')).toBe('المخزن البارد');
    expect(runtimeUiText('en', 'refrigeratorBossTitle')).toBe('REFRIGERATOR ROBOT');
    expect(runtimeUiText('ar', 'refrigeratorBossPhase', { phase: 3 })).toBe('روبوت الثلاجة · المرحلة 3');
  });
});
