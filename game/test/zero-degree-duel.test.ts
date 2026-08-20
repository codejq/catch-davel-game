import { describe, expect, it } from 'vitest';
import { createObservation } from '../src/agent/observation';
import { localizedContentString } from '../src/content/localization/catalogs';
import { LEVEL_035 } from '../src/content/levels/level-035';
import { GameSimulation } from '../src/sim/game';
import { campaignRobotWaves, ROBOT_DEFINITIONS } from '../src/sim/robots';

function levelThirtyFive(): GameSimulation {
  return new GameSimulation('campaign-level-035-v1', undefined, undefined, 'campaign', 'level-035');
}

describe('Zero-Degree Duel named-elite encounter', () => {
  it('stages two qualifying rounds before the Shielder and both stable elites', () => {
    const waves = campaignRobotWaves('level-035');
    expect(waves).toEqual([[0, 2, 4, 8], [1, 9, 10], [5, 7, 11]]);
    expect(waves.flat().map((id) => ROBOT_DEFINITIONS[id]?.name)).toEqual([
      'Clucky-7', 'Tiny Tyrant', 'Loose Screw', 'Gearbox Grin',
      'Velvet Slide', 'Bolt Jester', 'Clockwork Crook',
      'DJ Grin', 'Foreman Stomp', 'Violet Vault',
    ]);
  });

  it('materializes four always-active face-off ice lanes with opposing pulls', () => {
    const hazards = levelThirtyFive().state.level.hazards;
    expect(hazards).toHaveLength(4);
    expect(hazards.every((hazard) => hazard.kind === 'ice' && hazard.active)).toBe(true);
    expect(new Set(hazards.map((hazard) => `${hazard.directionX},${hazard.directionZ}`))).toEqual(
      new Set(['1,0', '0,-1', '0,1', '-1,0']),
    );
  });

  it('publishes the final Shielder and its plate through the same LLM observation', () => {
    const simulation = levelThirtyFive();
    const shielder = simulation.state.robots.find((robot) => ROBOT_DEFINITIONS[robot.id]?.archetype === 'violet-shielder')!;
    expect(shielder.id).toBe(11);
    for (const robot of simulation.state.robots) {
      robot.spawned = true;
      robot.active = robot.id === shielder.id;
    }
    simulation.state.level.encounter.waveIndex = 2;
    expect(createObservation(simulation.state).robots.find((robot) => robot.id === shielder.id)?.shield)
      .toMatchObject({ active: expect.any(Boolean), damageMultiplier: expect.any(Number) });
  });

  it('authors a distinct freeze-frame identity in both release locales', () => {
    expect(LEVEL_035.dance.presetId).toBe('freeze-frame-face-off');
    expect(localizedContentString('en', 'levels.035.name')).toBe('Zero-Degree Duel');
    expect(localizedContentString('ar', 'levels.035.name')).toBe('مبارزة درجة الصفر');
  });
});
