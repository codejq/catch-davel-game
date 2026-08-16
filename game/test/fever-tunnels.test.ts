import { describe, expect, it } from 'vitest';
import { visibilityPulseFog } from '../src/render/visibility-pulse';
import { GameSimulation } from '../src/sim/game';
import { stepLevelHazardPhases } from '../src/sim/interactions';

describe('Fever Tunnels fire-and-poison remix', () => {
  it('runs staggered flame shutters beside opposing poison currents', () => {
    const simulation = new GameSimulation(
      'campaign-level-029-v1', undefined, undefined, 'campaign', 'level-029',
    );
    const [westFlame, eastFlame, northPoison, southPoison] = simulation.state.level.hazards;
    expect([westFlame?.kind, eastFlame?.kind, northPoison?.kind, southPoison?.kind])
      .toEqual(['timed-door', 'timed-door', 'conveyor', 'conveyor']);
    expect([northPoison?.directionX, southPoison?.directionX]).toEqual([1, -1]);

    stepLevelHazardPhases(simulation.state.level, 0, 'level-029');
    expect([westFlame?.active, eastFlame?.active]).toEqual([true, false]);
    stepLevelHazardPhases(simulation.state.level, 90, 'level-029');
    expect([westFlame?.active, eastFlame?.active]).toEqual([false, true]);
  });

  it('keeps the fever haze presentation-only and driven by deterministic ticks', () => {
    const simulation = new GameSimulation(
      'campaign-level-029-v1', undefined, undefined, 'campaign', 'level-029',
    );
    const before = structuredClone(simulation.state);
    const first = visibilityPulseFog('level-029', simulation.state.tick);
    const repeated = visibilityPulseFog('level-029', simulation.state.tick);
    expect(first).toEqual(repeated);
    expect(first.greenMix).toBeGreaterThan(0);
    expect(simulation.state).toEqual(before);
  });
});
