import { describe, expect, it } from 'vitest';
import {
  DISTANCE_CONSTRAINT_COUNT,
  PARTICLE_COUNT,
  PARTICLES_PER_ROBOT,
  ROBOT_COUNT,
} from '../src/sim/constants';
import { createScenario } from '../src/sim/scenario';

describe('approved 24-robot scenario', () => {
  it('contains the full articulated workload', () => {
    const state = createScenario('scenario-shape');
    expect(ROBOT_COUNT).toBe(24);
    expect(PARTICLES_PER_ROBOT).toBe(15);
    expect(PARTICLE_COUNT).toBe(360);
    expect(state.particles.x).toHaveLength(360);
    expect(state.constraints.particleA).toHaveLength(DISTANCE_CONSTRAINT_COUNT);
    expect(DISTANCE_CONSTRAINT_COUNT).toBe(336);
  });

  it('assigns stable robot and local IDs in creation order', () => {
    const state = createScenario('stable-ids');
    for (let particle = 0; particle < PARTICLE_COUNT; particle += 1) {
      expect(state.particles.robotId[particle]).toBe(Math.floor(particle / PARTICLES_PER_ROBOT));
      expect(state.particles.localId[particle]).toBe(particle % PARTICLES_PER_ROBOT);
    }
  });
});

