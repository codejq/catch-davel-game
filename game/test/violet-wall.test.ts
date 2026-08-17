import { describe, expect, it } from 'vitest';
import { createObservation } from '../src/agent/observation';
import { localizedContentString } from '../src/content/localization/catalogs';
import { LEVEL_033 } from '../src/content/levels/level-033';
import { damageRobot } from '../src/sim/combat';
import { GameSimulation } from '../src/sim/game';
import { ROBOT_DEFINITIONS, SHIELDER_DAMAGE_MULTIPLIER, robotShieldActive } from '../src/sim/robots';
import { createSimulationSnapshot } from '../src/sim/serialization';

function levelThirtyThree(): GameSimulation {
  return new GameSimulation('campaign-level-033-v1', undefined, undefined, 'campaign', 'level-033');
}

describe('Violet Wall shielder introduction', () => {
  it('derives a deterministic shield pose and exposes it through the public observation', () => {
    const simulation = levelThirtyThree();
    const shielder = simulation.state.robots.find((robot) => ROBOT_DEFINITIONS[robot.id]?.archetype === 'violet-shielder')!;
    shielder.combatState = 'telegraph';
    shielder.combatTicks = 36;

    expect(shielder.id).toBe(11);
    expect(robotShieldActive(shielder)).toBe(true);
    expect(createObservation(simulation.state).robots.find((robot) => robot.id === shielder.id)?.shield).toEqual({
      active: true,
      damageMultiplier: SHIELDER_DAMAGE_MULTIPLIER,
    });

    const resumed = GameSimulation.fromSnapshot(createSimulationSnapshot(simulation.state));
    const resumedShielder = resumed.state.robots.find((robot) => robot.id === shielder.id)!;
    expect(robotShieldActive(resumedShielder)).toBe(true);
    expect(createObservation(resumed.state).robots.find((robot) => robot.id === shielder.id)?.shield.active).toBe(true);
  });

  it('reduces ordinary damage by 75 percent while precision hits bypass the plate', () => {
    const simulation = levelThirtyThree();
    const shielder = simulation.state.robots.find((robot) => robot.id === 11)!;
    shielder.combatState = 'telegraph';
    const maximumHealth = shielder.health;

    damageRobot(simulation.state.player, shielder, 40, 0, 0, 0);
    expect(shielder.health).toBe(maximumHealth - 10);

    shielder.health = maximumHealth;
    damageRobot(simulation.state.player, shielder, 40, 0, 0, 0, true);
    expect(shielder.health).toBe(maximumHealth - 60);
  });

  it('authors three ice lanes, a shield-pose dance, and both release locales', () => {
    const simulation = levelThirtyThree();
    expect(simulation.state.level.hazards).toHaveLength(3);
    expect(simulation.state.level.hazards.every((hazard) => hazard.kind === 'ice' && hazard.active)).toBe(true);
    expect(LEVEL_033.dance.presetId).toBe('shield-pose-popping');
    expect(localizedContentString('en', 'levels.033.name')).toBe('Violet Wall');
    expect(localizedContentString('ar', 'levels.033.name')).toBe('الجدار البنفسجي');
  });
});
