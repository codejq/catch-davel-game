import type { RenderRobotState } from './render-model';

export interface DavelExpression {
  readonly eyeOpen: number;
  readonly pupilOffset: number;
  readonly pupilCross: number;
  readonly browPressure: number;
  readonly grinDepth: number;
  readonly mouthOpen: number;
  readonly headLean: number;
  readonly handReach: number;
  readonly handLift: number;
  readonly antennaSway: number;
}

type ExpressionRobot = Pick<RenderRobotState, 'id' | 'danceTime' | 'combatState' | 'combatTicks' | 'hitFlashTicks'>;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function davelExpression(robot: ExpressionRobot, motionScale: number): DavelExpression {
  const motion = clamp01(motionScale);
  const personalityPhase = robot.danceTime * (2.05 + (robot.id % 4) * 0.19) + robot.id * 1.73;
  const blinkWave = Math.sin(personalityPhase * 0.61);
  const blink = clamp01((blinkWave - 0.92) / 0.08) * motion;
  const telegraph = robot.combatState === 'telegraph' ? motion : 0;
  const recovery = robot.combatState === 'recover'
    ? Math.min(1, Math.max(0.25, robot.combatTicks / 24)) * motion : 0;
  const shock = robot.hitFlashTicks > 0 ? Math.min(1, robot.hitFlashTicks / 4) : 0;
  return {
    eyeOpen: 1 - blink * 0.82 + telegraph * 0.38 - recovery * 0.16 + shock * 0.5,
    pupilOffset: Math.sin(personalityPhase * 0.83) * 0.1 * motion,
    pupilCross: shock * 0.14,
    browPressure: 0.08 + telegraph * 0.15 - recovery * 0.05 - shock * 0.2,
    grinDepth: 0.12 + Math.sin(personalityPhase * 0.47) * 0.025 * motion
      + telegraph * 0.11 - recovery * 0.05 - shock * 0.22,
    mouthOpen: 0.08 + telegraph * 0.3 + recovery * 0.08 + shock * 0.5,
    headLean: telegraph * 0.13 - recovery * 0.06 - shock * 0.08 * motion,
    handReach: telegraph * 0.34 - recovery * 0.05,
    handLift: telegraph * 0.18 - recovery * 0.16 + shock * 0.2 * motion,
    antennaSway: Math.sin(personalityPhase) * 0.1 * motion + telegraph * 0.08 + shock * 0.12 * motion,
  };
}
