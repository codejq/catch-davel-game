import { describe, expect, it } from 'vitest';
import {
  ROBOT_HEALTH_BAR_INSTANCE_COUNT, ROBOT_HEALTH_BAR_MAX_DISTANCE, robotHealthBar,
  type RobotHealthBarInput,
} from '../src/render/robot-health-bar';

const input: RobotHealthBarInput = {
  x: 3, z: -2, heading: 0.7, playerX: -1, playerZ: -5, headY: 2, scale: 1, health: 70, maxHealth: 100,
  rank: 'ordinary', playerDistance: 6,
};

describe('bounded 3D Davel health bars', () => {
  it('shows exactly two occlusion-correct segments only for nearby damaged non-bosses', () => {
    expect(robotHealthBar(input)).toHaveLength(ROBOT_HEALTH_BAR_INSTANCE_COUNT);
    expect(robotHealthBar({ ...input, health: 100 })).toEqual([]);
    expect(robotHealthBar({ ...input, health: 0 })).toEqual([]);
    expect(robotHealthBar({ ...input, rank: 'boss' })).toEqual([]);
    expect(robotHealthBar({ ...input, playerDistance: ROBOT_HEALTH_BAR_MAX_DISTANCE + 0.01 })).toEqual([]);
  });

  it('encodes exact remaining health in width and uses green, amber, then red thresholds', () => {
    const width = (health: number): number => {
      const remaining = robotHealthBar({ ...input, health })[1]!;
      return Math.hypot(remaining.end.x - remaining.start.x, remaining.end.z - remaining.start.z);
    };
    expect(width(75)).toBeCloseTo(0.87);
    expect(width(50)).toBeCloseTo(0.58);
    expect(width(20)).toBeCloseTo(0.232);
    expect(robotHealthBar({ ...input, health: 75 })[1]?.color).toEqual([0.18, 1, 0.68]);
    expect(robotHealthBar({ ...input, health: 50 })[1]?.color).toEqual([1, 0.78, 0.08]);
    expect(robotHealthBar({ ...input, health: 20 })[1]?.color).toEqual([1, 0.18, 0.24]);
  });

  it('keeps every scaled segment finite and bounded', () => {
    for (const scale of [0.2, 1, 4]) {
      for (const segment of robotHealthBar({ ...input, scale, health: 1 })) {
        expect([
          segment.start.x, segment.start.y, segment.start.z,
          segment.end.x, segment.end.y, segment.end.z,
          segment.radius, segment.emission, ...segment.color,
        ].every(Number.isFinite)).toBe(true);
        expect(segment.radius).toBeGreaterThan(0);
        expect(segment.emission).toBeGreaterThanOrEqual(0);
        expect(segment.emission).toBeLessThanOrEqual(1);
      }
    }
  });

  it('faces the player independently of the Davel heading', () => {
    expect(robotHealthBar({ ...input, heading: -2.4 })).toEqual(robotHealthBar({ ...input, heading: 1.1 }));
  });

  it('keeps even oversized non-boss bars below the maze wall top', () => {
    const segments = robotHealthBar({ ...input, headY: 3, scale: 2.5 });
    expect(Math.max(...segments.flatMap((segment) => [segment.start.y, segment.end.y])))
      .toBeLessThanOrEqual(2.82);
  });
});
