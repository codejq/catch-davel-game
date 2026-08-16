import type { RenderRobotState } from './render-model';

export const MAX_COMBAT_STATE_MARKERS_PER_ROBOT = 3;

type MarkerRobot = Pick<RenderRobotState, 'id' | 'x' | 'z' | 'heading' | 'combatState' | 'combatTicks'>;

export interface CombatStateMarker {
  readonly role: 'attack-chevron' | 'recovery-bracket';
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  readonly yScale: number;
  readonly zScale: number;
  readonly color: readonly [number, number, number];
  readonly emission: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function worldPoint(robot: MarkerRobot, localX: number, localZ: number): { readonly x: number; readonly z: number } {
  const rightX = Math.cos(robot.heading);
  const rightZ = -Math.sin(robot.heading);
  const forwardX = Math.sin(robot.heading);
  const forwardZ = Math.cos(robot.heading);
  return {
    x: robot.x + rightX * localX + forwardX * localZ,
    z: robot.z + rightZ * localX + forwardZ * localZ,
  };
}

/** Shape-coded body brackets keep telegraph and recovery readable in a crowd. */
export function combatStateMarkers(
  robot: MarkerRobot,
  robotScale: number,
  motionScale: number,
): readonly CombatStateMarker[] {
  const scale = Math.max(0.5, Math.min(2.5, robotScale));
  const motion = clamp01(motionScale);
  if (robot.combatState === 'patrol') return [];

  if (robot.combatState === 'telegraph') {
    const urgency = 1 - clamp01(robot.combatTicks / 60);
    const pulse = Math.sin((robot.combatTicks + robot.id * 11) * 0.28) * 0.045 * motion;
    const spread = (0.9 - urgency * 0.18 + pulse) * scale;
    return [
      { localX: 0, localY: 2.48 * scale, localZ: 0.08 * scale },
      { localX: -spread, localY: 0.92 * scale, localZ: 0.08 * scale },
      { localX: spread, localY: 0.92 * scale, localZ: 0.08 * scale },
    ].map(({ localX, localY, localZ }) => {
      const point = worldPoint(robot, localX, localZ);
      return {
        role: 'attack-chevron' as const,
        ...point,
        y: localY,
        radius: 0.105 * scale,
        yScale: 1.35,
        zScale: 0.72,
        color: [1, 0.78, 0.08] as const,
        emission: 0.82,
      };
    });
  }

  const breathe = Math.sin((robot.combatTicks + robot.id * 7) * 0.16) * 0.035 * motion;
  return [-1, 1].map((side) => {
    const point = worldPoint(robot, side * (0.82 + breathe) * scale, 0.04 * scale);
    return {
      role: 'recovery-bracket' as const,
      ...point,
      y: 1.08 * scale,
      radius: 0.12 * scale,
      yScale: 1.8,
      zScale: 0.68,
      color: [0.18, 1, 0.82] as const,
      emission: 0.76,
    };
  });
}
