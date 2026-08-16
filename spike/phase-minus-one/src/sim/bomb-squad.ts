import { PARTICLES_PER_ROBOT, ROBOT_COUNT } from './constants';
import { EventBuffer, EventClass, EventKind } from './events';
import type { SimulationState } from './state';

function emit(
  state: SimulationState,
  events: EventBuffer,
  robotId: number,
  eventClass: EventClass,
  kind: EventKind,
  value: number,
): void {
  const chest = robotId * PARTICLES_PER_ROBOT + 1;
  events.emit({
    eventClass,
    kind,
    tick: state.tick,
    sequence: state.nextEventSequence++,
    robotId,
    x: state.particles.x[chest]!,
    y: state.particles.y[chest]!,
    z: state.particles.z[chest]!,
    value,
  });
}

export function detonateRepresentativeBombSquad(state: SimulationState, events: EventBuffer): void {
  events.reset();
  for (let robotId = 0; robotId < ROBOT_COUNT; robotId += 1) {
    const chest = robotId * PARTICLES_PER_ROBOT + 1;
    const x = state.particles.x[chest]!;
    const z = state.particles.z[chest]!;
    const inverseLength = 1 / Math.max(0.001, Math.sqrt(x * x + z * z));
    state.robots.health[robotId] = Math.max(1, state.robots.health[robotId]! - 35);
    for (let localParticle = 0; localParticle < PARTICLES_PER_ROBOT; localParticle += 1) {
      const particle = robotId * PARTICLES_PER_ROBOT + localParticle;
      state.particles.previousX[particle] = state.particles.x[particle]! - x * inverseLength * 0.12;
      state.particles.previousY[particle] = state.particles.y[particle]! - 0.08;
      state.particles.previousZ[particle] = state.particles.z[particle]! - z * inverseLength * 0.12;
    }
    emit(state, events, robotId, EventClass.StateCritical, EventKind.Damage, 35);
    emit(state, events, robotId, EventClass.StateCritical, EventKind.Knockback, 12);
    emit(state, events, robotId, EventClass.PresentationOnly, EventKind.HitMarker, 1);
    emit(state, events, robotId, EventClass.PresentationOnly, EventKind.Spark, 4);
    emit(state, events, robotId, EventClass.PresentationOnly, EventKind.Debris, 3);
    emit(state, events, robotId, EventClass.StateCritical, EventKind.CriticalAudio, 1);
  }
  emit(state, events, 0, EventClass.StateCritical, EventKind.TempoChange, 1);
  emit(state, events, 0, EventClass.StateCritical, EventKind.Objective, 1);
}
