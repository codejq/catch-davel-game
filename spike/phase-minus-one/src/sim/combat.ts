import { PARTICLES_PER_ROBOT, ROBOT_COUNT } from './constants';
import { EventBuffer, EventClass, EventKind } from './events';
import type { SimulationState } from './state';

function emitAtRobot(
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

export function stepCombatAndEconomy(state: SimulationState, events: EventBuffer): void {
  if (state.tick % 15 === 0) {
    const robotId = Math.floor(state.tick / 15) % ROBOT_COUNT;
    state.robots.health[robotId] = state.robots.health[robotId]! - 7;
    emitAtRobot(state, events, robotId, EventClass.StateCritical, EventKind.Damage, 7);
    emitAtRobot(state, events, robotId, EventClass.PresentationOnly, EventKind.Spark, 1);
    emitAtRobot(state, events, robotId, EventClass.StateCritical, EventKind.CriticalAudio, 1);
    if (state.robots.health[robotId]! <= 0) {
      state.robots.health[robotId] = 100;
      state.coins += 5;
      state.objectivesCompleted += 1;
      emitAtRobot(state, events, robotId, EventClass.StateCritical, EventKind.Coin, 5);
      emitAtRobot(state, events, robotId, EventClass.StateCritical, EventKind.Objective, 1);
    }
  }

  if (state.tick > 0 && state.tick % 120 === 0) {
    for (let robotId = 0; robotId < ROBOT_COUNT; robotId += 1) {
      state.robots.health[robotId] = Math.max(1, state.robots.health[robotId]! - 3);
      emitAtRobot(state, events, robotId, EventClass.StateCritical, EventKind.Damage, 3);
      emitAtRobot(state, events, robotId, EventClass.PresentationOnly, EventKind.Spark, 1);
      emitAtRobot(state, events, robotId, EventClass.PresentationOnly, EventKind.Debris, 2);
    }
    emitAtRobot(state, events, 0, EventClass.StateCritical, EventKind.TempoChange, 1);
  }
}
