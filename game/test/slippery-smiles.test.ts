import { describe, expect, it } from 'vitest';
import { createObservation } from '../src/agent/observation';
import { localizedContentString } from '../src/content/localization/catalogs';
import { LEVEL_032 } from '../src/content/levels/level-032';
import { GameSimulation } from '../src/sim/game';

describe('Slippery Smiles mobile ranged squads', () => {
  it('authors opposing ice lanes and a mobile ranged opening without hidden state', () => {
    const simulation = new GameSimulation(
      'campaign-level-032-v1', undefined, undefined, 'campaign', 'level-032',
    );
    const observation = createObservation(simulation.state);
    expect(observation.levelId).toBe('level-032');
    expect(observation.hazards).toHaveLength(4);
    expect(observation.hazards.every((hazard) => hazard.kind === 'ice' && hazard.active)).toBe(true);
    expect(observation.robots.filter((robot) => robot.archetype === 'blue-slider')).toHaveLength(2);
    expect(LEVEL_032.tags).toContain('mobile-ranged-squads');
  });

  it('ships the reviewed identity in both release locales', () => {
    expect(localizedContentString('en', 'levels.032.name')).toBe('Slippery Smiles');
    expect(localizedContentString('ar', 'levels.032.name')).toBe('الابتسامات الزلقة');
    expect(localizedContentString('en', 'objectives.level_032')).toContain('ranged');
  });
});
