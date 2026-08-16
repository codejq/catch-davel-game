import { FIXED_DT_SECONDS, PARTICLES_PER_ROBOT, ROBOT_COUNT } from './constants';
import { NavigationWorkspace } from './pathfinding';
import { BASE_POSE } from './scenario';
import type { SimulationState } from './state';

const WAYPOINT_X = new Float64Array([-7.8, 7.8, 7.8, -7.8]);
const WAYPOINT_Z = new Float64Array([-7.2, -7.2, 7.2, 7.2]);

function triangleWave(phase: number, period: number): number {
  const wrapped = ((phase % period) + period) % period;
  const normalized = wrapped / period;
  return normalized < 0.5 ? normalized * 4 - 1 : 3 - normalized * 4;
}

export function updateNavigationAndPoseTargets(
  state: SimulationState,
  workspace: NavigationWorkspace,
): void {
  const { particles, robots, tick } = state;
  const speed = 0.48 * FIXED_DT_SECONDS;

  for (let robotId = 0; robotId < ROBOT_COUNT; robotId += 1) {
    let waypoint = robots.waypointIndex[robotId]!;
    const formationX = ((robotId % 6) - 2.5) * 0.08;
    const formationZ = (Math.floor(robotId / 6) - 1.5) * 0.08;
    const targetRootX = WAYPOINT_X[waypoint]! + formationX;
    const targetRootZ = WAYPOINT_Z[waypoint]! + formationZ;
    const goalDeltaX = targetRootX - robots.rootX[robotId]!;
    const goalDeltaZ = targetRootZ - robots.rootZ[robotId]!;
    const goalDistance = Math.hypot(goalDeltaX, goalDeltaZ);
    if (goalDistance < 0.45) {
      waypoint = (waypoint + 1) & 3;
      robots.waypointIndex[robotId] = waypoint;
    } else {
      const next = workspace.findNextStep(
        robots.rootX[robotId]!,
        robots.rootZ[robotId]!,
        targetRootX,
        targetRootZ,
      );
      const deltaX = next.x - robots.rootX[robotId]!;
      const deltaZ = next.z - robots.rootZ[robotId]!;
      const distance = Math.hypot(deltaX, deltaZ);
      const scale = distance > 1e-9 ? Math.min(speed / distance, 1) : 0;
      robots.rootX[robotId] = robots.rootX[robotId]! + deltaX * scale;
      robots.rootZ[robotId] = robots.rootZ[robotId]! + deltaZ * scale;
    }

    const beat = tick * 2 + robots.phaseOffset[robotId]!;
    const sway = triangleWave(beat, 120);
    const accent = triangleWave(beat + 30, 60);
    const particleBase = robotId * PARTICLES_PER_ROBOT;

    for (let localId = 0; localId < PARTICLES_PER_ROBOT; localId += 1) {
      const particleIndex = particleBase + localId;
      const pose = BASE_POSE[localId];
      if (pose === undefined) throw new Error(`Missing pose ${localId}`);
      let offsetX = 0;
      let offsetY = 0;
      let offsetZ = 0;

      if (localId === 0) {
        offsetX = sway * 0.08;
        offsetZ = accent * 0.05;
      } else if (localId >= 3 && localId <= 8) {
        const side = localId % 2 === 1 ? -1 : 1;
        offsetX = side * accent * 0.15;
        offsetY = sway * 0.1;
        offsetZ = side * sway * 0.12;
      } else if (localId >= 9) {
        const side = localId % 2 === 1 ? -1 : 1;
        offsetX = side * sway * 0.06;
        offsetY = localId >= 13 ? Math.max(0, side * accent) * 0.1 : 0;
        offsetZ = side * accent * 0.09;
      } else {
        offsetX = sway * 0.035;
      }

      particles.targetX[particleIndex] = robots.rootX[robotId]! + pose[0] + offsetX;
      particles.targetY[particleIndex] = pose[1] + offsetY;
      particles.targetZ[particleIndex] = robots.rootZ[robotId]! + pose[2] + offsetZ;
    }
  }
}
