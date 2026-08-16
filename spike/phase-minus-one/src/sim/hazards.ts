import { PARTICLES_PER_ROBOT, ROBOT_COUNT } from './constants';
import { EventBuffer, EventClass, EventKind } from './events';
import type { SimulationState } from './state';

const HAZARD_COUNT = 16;

function hazardCoordinate(index: number, axis: 'x' | 'z'): number {
  const column = index % 4;
  const row = Math.floor(index / 4);
  return axis === 'x' ? (column - 1.5) * 4.25 : (row - 1.5) * 4.25;
}

export function stepHazards(state: SimulationState, events: EventBuffer): void {
  for (let hazard = 0; hazard < HAZARD_COUNT; hazard += 1) {
    const hazardX = hazardCoordinate(hazard, 'x');
    const hazardZ = hazardCoordinate(hazard, 'z');
    const active = (state.tick + hazard * 11) % 180 < 75;
    for (let robotId = 0; robotId < ROBOT_COUNT; robotId += 1) {
      const deltaX = state.robots.rootX[robotId]! - hazardX;
      const deltaZ = state.robots.rootZ[robotId]! - hazardZ;
      const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;
      if (!active || distanceSquared > 1.35 * 1.35 || (state.tick + robotId + hazard) % 30 !== 0) continue;
      state.robots.health[robotId] = Math.max(1, state.robots.health[robotId]! - 1);
      const chest = robotId * PARTICLES_PER_ROBOT + 1;
      events.emit({
        eventClass: EventClass.StateCritical,
        kind: EventKind.Damage,
        tick: state.tick,
        sequence: state.nextEventSequence++,
        robotId,
        x: state.particles.x[chest]!,
        y: state.particles.y[chest]!,
        z: state.particles.z[chest]!,
        value: 1,
      });
    }
  }
}

