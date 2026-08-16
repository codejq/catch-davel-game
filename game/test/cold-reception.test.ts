import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { cellCenter } from '../src/sim/level';
import { stepLevelHazards } from '../src/sim/interactions';
import { localizedContentString } from '../src/content/localization/catalogs';
import { createObservation } from '../src/agent/observation';

describe('Cold Reception ice tutorial', () => {
  it('materializes three always-active ice lanes and drifts the player deterministically', () => {
    const simulation = new GameSimulation(
      'campaign-level-031-v1', undefined, undefined, 'campaign', 'level-031',
    );
    expect(simulation.state.level.hazards.map((hazard) => hazard.kind)).toEqual(['ice', 'ice', 'ice']);
    expect(simulation.state.level.hazards.every((hazard) => hazard.active)).toBe(true);

    const lane = simulation.state.level.hazards[0]!;
    const start = cellCenter(lane.column, lane.row);
    simulation.state.player.x = start.x;
    simulation.state.player.z = start.z;
    stepLevelHazards(simulation.state.player, simulation.state.level, 12, 'level-031');
    expect(simulation.state.player.x).toBeGreaterThan(start.x);
    expect(simulation.state.player.z).toBe(start.z);
    expect(createObservation(simulation.state).hazards.map((hazard) => hazard.kind)).toEqual(['ice', 'ice', 'ice']);
  });

  it('ships the mission identity in both release locales', () => {
    expect(localizedContentString('en', 'levels.031.name')).toBe('Cold Reception');
    expect(localizedContentString('ar', 'levels.031.name')).toBe('الاستقبال البارد');
    expect(localizedContentString('en', 'objectives.level_031')).toContain('ice');
  });
});
