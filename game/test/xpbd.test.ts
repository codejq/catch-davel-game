import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { BODY_POINT_COUNT, XPBD_ITERATIONS, XPBD_SUBSTEPS, applyRobotBodyImpulse } from '../src/sim/xpbd';

const idle = { forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false } as const;

describe('articulated Davel XPBD', () => {
  it('keeps the schema-one solver contract and finite deterministic bodies', () => {
    expect(XPBD_SUBSTEPS).toBe(2);
    expect(XPBD_ITERATIONS).toBe(8);
    const first = new GameSimulation('xpbd-proof');
    const second = new GameSimulation('xpbd-proof');
    applyRobotBodyImpulse(first.state.robots[0]!, 0.08, 0.12, -0.04);
    applyRobotBodyImpulse(second.state.robots[0]!, 0.08, 0.12, -0.04);
    for (let tick = 0; tick < 600; tick += 1) {
      first.step(idle);
      second.step(idle);
    }
    for (let robot = 0; robot < first.state.robots.length; robot += 1) {
      const body = first.state.robots[robot]!.body;
      expect(body.positions).toHaveLength(BODY_POINT_COUNT * 3);
      expect([...body.positions].every(Number.isFinite)).toBe(true);
      expect(body.positions).toEqual(second.state.robots[robot]!.body.positions);
      for (let point = 0; point < BODY_POINT_COUNT; point += 1) expect(body.positions[point * 3 + 1]).toBeGreaterThanOrEqual(0.07);
    }
  });
});
