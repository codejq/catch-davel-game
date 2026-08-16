import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import {
  closedDoorCells, hazardTicksUntilToggle, stepLevelHazardPhases,
} from '../src/sim/interactions';
import {
  MAGENTA_DRAIN_ACTIVATION_TICKS, MAGENTA_DRAIN_WARNING_TICKS, magentaDrainRiseProgress,
} from '../src/sim/level-mechanics';

describe('Magenta Drain rising hazard escape', () => {
  it('activates its three permanent collision stages on exact fixed ticks', () => {
    const simulation = new GameSimulation(
      'campaign-level-027-v1', undefined, undefined, 'campaign', 'level-027',
    );
    const [lower, middle, upper] = simulation.state.level.hazards;
    expect([lower?.active, middle?.active, upper?.active]).toEqual([false, false, false]);
    expect(hazardTicksUntilToggle(lower!, 0, 'level-027')).toBe(MAGENTA_DRAIN_ACTIVATION_TICKS[0]);

    stepLevelHazardPhases(simulation.state.level, MAGENTA_DRAIN_ACTIVATION_TICKS[0] - 1, 'level-027');
    expect(lower?.active).toBe(false);
    expect(hazardTicksUntilToggle(lower!, MAGENTA_DRAIN_ACTIVATION_TICKS[0] - 1, 'level-027')).toBe(1);
    stepLevelHazardPhases(simulation.state.level, MAGENTA_DRAIN_ACTIVATION_TICKS[0], 'level-027');
    expect([lower?.active, middle?.active, upper?.active]).toEqual([true, false, false]);
    expect(closedDoorCells(simulation.state.level)).toContainEqual({ column: 4, row: 6 });

    stepLevelHazardPhases(simulation.state.level, 8_000, 'level-027');
    expect([lower?.active, middle?.active, upper?.active]).toEqual([true, true, true]);
  });

  it('derives a bounded raw-WebGL2 warning rise before each collision activates', () => {
    const activation = MAGENTA_DRAIN_ACTIVATION_TICKS[1];
    expect(magentaDrainRiseProgress('level-027', activation - MAGENTA_DRAIN_WARNING_TICKS - 1, 1)).toBe(0);
    expect(magentaDrainRiseProgress('level-027', activation - MAGENTA_DRAIN_WARNING_TICKS / 2, 1)).toBe(0.5);
    expect(magentaDrainRiseProgress('level-027', activation, 1)).toBe(1);
    expect(magentaDrainRiseProgress('level-026', activation, 1)).toBe(0);
  });
});
