import { ARENA_HALF_EXTENT, FIXED_DT_SECONDS, ROBOT_COUNT } from './constants';
import { EventBuffer, EventClass, EventKind } from './events';
import type { SimulationState } from './state';

function spawnProjectile(state: SimulationState, robotId: number): void {
  const projectiles = state.projectiles;
  const index = projectiles.cursor;
  projectiles.cursor = (projectiles.cursor + 1) % projectiles.active.length;
  projectiles.active[index] = 1;
  projectiles.ownerRobot[index] = robotId;
  projectiles.x[index] = state.robots.rootX[robotId]!;
  projectiles.y[index] = 1.8;
  projectiles.z[index] = state.robots.rootZ[robotId]!;
  const direction = robotId % 4;
  projectiles.velocityX[index] = direction === 0 ? 5 : direction === 2 ? -5 : 0;
  projectiles.velocityY[index] = direction % 2 === 0 ? 0.3 : 0.45;
  projectiles.velocityZ[index] = direction === 1 ? 5 : direction === 3 ? -5 : 0;
}

export function stepProjectiles(state: SimulationState, events: EventBuffer): void {
  if (state.tick % 6 === 0) spawnProjectile(state, (state.tick / 6) % ROBOT_COUNT);
  const projectiles = state.projectiles;
  for (let index = 0; index < projectiles.active.length; index += 1) {
    if (projectiles.active[index] === 0) continue;
    const previousX = projectiles.x[index]!;
    const previousY = projectiles.y[index]!;
    const previousZ = projectiles.z[index]!;
    projectiles.velocityY[index] = projectiles.velocityY[index]! - 0.8 * FIXED_DT_SECONDS;
    projectiles.x[index] = projectiles.x[index]! + projectiles.velocityX[index]! * FIXED_DT_SECONDS;
    projectiles.y[index] = projectiles.y[index]! + projectiles.velocityY[index]! * FIXED_DT_SECONDS;
    projectiles.z[index] = projectiles.z[index]! + projectiles.velocityZ[index]! * FIXED_DT_SECONDS;

    const outside =
      Math.abs(projectiles.x[index]!) > ARENA_HALF_EXTENT ||
      Math.abs(projectiles.z[index]!) > ARENA_HALF_EXTENT ||
      projectiles.y[index]! < 0.1;
    if (outside) {
      projectiles.active[index] = 0;
      events.emit({
        eventClass: EventClass.PresentationOnly,
        kind: EventKind.Spark,
        tick: state.tick,
        sequence: state.nextEventSequence++,
        robotId: projectiles.ownerRobot[index]!,
        x: previousX,
        y: Math.max(0.1, previousY),
        z: previousZ,
        value: 1,
      });
    }
  }
}
