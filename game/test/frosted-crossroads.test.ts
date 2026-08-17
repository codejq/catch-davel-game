import { describe, expect, it } from 'vitest';
import { createObservation } from '../src/agent/observation';
import { localizedContentString } from '../src/content/localization/catalogs';
import { LEVEL_034 } from '../src/content/levels/level-034';
import { GameSimulation } from '../src/sim/game';
import { ROBOT_DEFINITIONS } from '../src/sim/robots';

function levelThirtyFour(): GameSimulation {
  return new GameSimulation('campaign-level-034-v1', undefined, undefined, 'campaign', 'level-034');
}

describe('Frosted Crossroads route-reading encounter', () => {
  it('materializes four always-active crossing ice lanes with four different pulls', () => {
    const hazards = levelThirtyFour().state.level.hazards;
    expect(hazards).toHaveLength(4);
    expect(hazards.every((hazard) => hazard.kind === 'ice' && hazard.active)).toBe(true);
    expect(new Set(hazards.map((hazard) => `${hazard.directionX},${hazard.directionZ}`))).toEqual(
      new Set(['1,0', '0,-1', '0,1', '-1,0']),
    );
  });

  it('keeps the Shielder readable through the public agent observation', () => {
    const simulation = levelThirtyFour();
    const shielder = simulation.state.robots.find((robot) => ROBOT_DEFINITIONS[robot.id]?.archetype === 'violet-shielder')!;
    expect(shielder.id).toBe(11);
    expect(createObservation(simulation.state).robots.find((robot) => robot.id === shielder.id)?.shield)
      .toMatchObject({ active: expect.any(Boolean), damageMultiplier: expect.any(Number) });
  });

  it('authors a distinct crystal-locking identity in both release locales', () => {
    expect(LEVEL_034.dance.presetId).toBe('crystal-locking-dance');
    expect(LEVEL_034.tags).toEqual(expect.arrayContaining(['glass-route-visibility', 'crossing-ice']));
    expect(localizedContentString('en', 'levels.034.name')).toBe('Frosted Crossroads');
    expect(localizedContentString('ar', 'levels.034.name')).toBe('مفترق الطرق المتجمد');
  });
});
