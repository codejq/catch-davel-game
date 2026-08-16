import type { RenderRobotState } from './render-model';

export interface DavelExpression {
  readonly eyeOpen: number;
  readonly pupilOffset: number;
  readonly browPressure: number;
  readonly grinDepth: number;
  readonly mouthOpen: number;
  readonly headLean: number;
  readonly handReach: number;
  readonly handLift: number;
  readonly antennaSway: number;
}

type ExpressionRobot = Pick<RenderRobotState, 'id' | 'danceTime' | 'combatState' | 'combatTicks'>;

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
  return {
    eyeOpen: 1 - blink * 0.82 + telegraph * 0.38 - recovery * 0.16,
    pupilOffset: Math.sin(personalityPhase * 0.83) * 0.1 * motion,
    browPressure: 0.08 + telegraph * 0.15 - recovery * 0.05,
    grinDepth: 0.12 + Math.sin(personalityPhase * 0.47) * 0.025 * motion + telegraph * 0.11,
    mouthOpen: 0.08 + telegraph * 0.3 + recovery * 0.08,
    headLean: telegraph * 0.13 - recovery * 0.06,
    handReach: telegraph * 0.34 - recovery * 0.05,
    handLift: telegraph * 0.18 - recovery * 0.16,
    antennaSway: Math.sin(personalityPhase) * 0.1 * motion + telegraph * 0.08,
  };
}
