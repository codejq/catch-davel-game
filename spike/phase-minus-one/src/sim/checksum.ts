import { PARTICLE_COUNT, ROBOT_COUNT, SIMULATION_SCHEMA_VERSION } from './constants';
import type { SimulationState } from './state';

function mix(hash: number, value: number): number {
  hash ^= value >>> 0;
  return Math.imul(hash, 0x01000193) >>> 0;
}

export function checksumState(state: SimulationState): string {
  let hash = 0x811c9dc5;
  hash = mix(hash, SIMULATION_SCHEMA_VERSION);
  hash = mix(hash, state.tick);
  hash = mix(hash, state.rng.state);
  hash = mix(hash, state.coins);
  hash = mix(hash, state.objectivesCompleted);
  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    hash = mix(hash, Math.round(state.particles.x[index]! * 100_000));
    hash = mix(hash, Math.round(state.particles.y[index]! * 100_000));
    hash = mix(hash, Math.round(state.particles.z[index]! * 100_000));
  }
  for (let robot = 0; robot < ROBOT_COUNT; robot += 1) {
    hash = mix(hash, state.robots.health[robot]!);
    hash = mix(hash, state.robots.waypointIndex[robot]!);
  }
  return hash.toString(16).padStart(8, '0');
}

