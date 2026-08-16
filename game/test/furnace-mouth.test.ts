import { describe, expect, it } from 'vitest';
import { runtimeUiText } from '../src/content/localization/runtime-ui';
import { GameSimulation } from '../src/sim/game';
import { stepLevelHazardPhases } from '../src/sim/interactions';

describe('Furnace Mouth chapter boss', () => {
  it('materializes the three-phase fire-spitting boss behind four rotating flame jaws', () => {
    const simulation = new GameSimulation(
      'campaign-level-030-v1', undefined, undefined, 'campaign', 'level-030',
    );
    const boss = simulation.state.robots.find((robot) => robot.active)!;
    expect(boss.id).toBe(6);
    expect(boss.bossPhase).toBe(1);
    expect(simulation.state.level.hazards).toHaveLength(4);
    expect(simulation.state.level.hazards.every((hazard) => hazard.kind === 'timed-door')).toBe(true);

    stepLevelHazardPhases(simulation.state.level, 0, 'level-030');
    expect(simulation.state.level.hazards.map((hazard) => hazard.active)).toEqual([true, true, false, false]);
    stepLevelHazardPhases(simulation.state.level, 80, 'level-030');
    expect(simulation.state.level.hazards.map((hazard) => hazard.active)).toEqual([false, false, true, true]);
  });

  it('gives the shared boss authority a localized Furnace Mouth presentation identity', () => {
    expect(runtimeUiText('en', 'furnaceBossTitle')).toBe('FURNACE MOUTH');
    expect(runtimeUiText('ar', 'furnaceBossTitle')).toBe('فم الفرن');
    expect(runtimeUiText('en', 'furnaceBossPhase', { phase: 3 })).toBe('FURNACE MOUTH · PHASE 3');
  });
});
