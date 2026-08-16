import { describe, expect, it } from 'vitest';
import { davelExpression } from '../src/render/davel-expression';

describe('presentation-only Davel expressions', () => {
  const robot = { id: 3, danceTime: 4.25, combatState: 'patrol' as const, combatTicks: 0, hitFlashTicks: 0 };

  it('is deterministic and gives stable robot IDs independent facial timing', () => {
    expect(davelExpression(robot, 1)).toEqual(davelExpression(robot, 1));
    expect(davelExpression({ ...robot, id: 4 }, 1).pupilOffset).not.toBe(davelExpression(robot, 1).pupilOffset);
  });

  it('makes attack and recovery intent visually distinct while honoring zero motion', () => {
    const patrol = davelExpression(robot, 1);
    const telegraph = davelExpression({ ...robot, combatState: 'telegraph', combatTicks: 20 }, 1);
    const recover = davelExpression({ ...robot, combatState: 'recover', combatTicks: 20 }, 1);
    expect(telegraph.eyeOpen).toBeGreaterThan(patrol.eyeOpen);
    expect(telegraph.handReach).toBeGreaterThan(0.3);
    expect(telegraph.mouthOpen).toBeGreaterThan(recover.mouthOpen);
    expect(recover.handLift).toBeLessThan(0);
    expect(davelExpression({ ...robot, combatState: 'telegraph' }, 0).handReach).toBe(0);
  });

  it('turns impact flashes into a shocked face that stays legible at zero motion', () => {
    const patrol = davelExpression(robot, 1);
    const shocked = davelExpression({ ...robot, hitFlashTicks: 4 }, 1);
    expect(shocked.eyeOpen).toBeGreaterThan(patrol.eyeOpen);
    expect(shocked.pupilCross).toBeGreaterThan(0.1);
    expect(shocked.browPressure).toBeLessThan(0);
    expect(shocked.grinDepth).toBeLessThan(0);
    expect(shocked.mouthOpen).toBeGreaterThan(0.5);
    expect(shocked.handLift).toBeGreaterThan(0);
    const zeroMotionShock = davelExpression({ ...robot, hitFlashTicks: 4 }, 0);
    expect(zeroMotionShock.pupilCross).toBe(shocked.pupilCross);
    expect(zeroMotionShock.mouthOpen).toBe(shocked.mouthOpen);
    expect(zeroMotionShock.handLift).toBe(0);
  });
});
