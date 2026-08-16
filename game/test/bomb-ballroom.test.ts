import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import {
  breakBombSeals, completePrimaryObjective, stepLevelHazardPhases,
} from '../src/sim/interactions';

describe('Bombs in the Ballroom destructible route choices', () => {
  it('persists independently broken required and optional seals', () => {
    const simulation = new GameSimulation(
      'campaign-level-026-v1', undefined, undefined, 'campaign', 'level-026',
    );
    const required = simulation.state.level.hazards.find((hazard) => hazard.id === 'ballroom-bomb-seal-center')!;
    const optional = simulation.state.level.hazards.find((hazard) => hazard.id === 'ballroom-bomb-shortcut-left')!;
    expect([required.active, optional.active]).toEqual([true, true]);

    expect(breakBombSeals(simulation.state.level, [{ x: optional.x, z: optional.z }], 'level-026'))
      .toEqual(['ballroom-bomb-shortcut-left']);
    stepLevelHazardPhases(simulation.state.level, 600, 'level-026');
    expect(optional.active).toBe(false);
    expect(required.active).toBe(true);
  });

  it('requires the center seal but not both optional shortcuts for objective completion', () => {
    const simulation = new GameSimulation(
      'campaign-level-026-v1', undefined, undefined, 'campaign', 'level-026',
    );
    const required = simulation.state.level.hazards.find((hazard) => hazard.id === 'ballroom-bomb-seal-center')!;
    const optionalRight = simulation.state.level.hazards.find(
      (hazard) => hazard.id === 'ballroom-bomb-shortcut-right',
    )!;
    expect(completePrimaryObjective(simulation.state.level, 'level-026')).toEqual([]);
    expect(breakBombSeals(simulation.state.level, [{ x: required.x, z: required.z }], 'level-026'))
      .toEqual(['ballroom-bomb-seal-center']);
    expect(optionalRight.active).toBe(true);
    expect(completePrimaryObjective(simulation.state.level, 'level-026')).toEqual([
      { type: 'objective-complete' }, { type: 'exit-unlocked' },
    ]);
  });
});
