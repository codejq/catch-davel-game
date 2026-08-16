import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/game';
import { AUTHORITATIVE_DECIMAL_PLACES, quantizeAuthoritativeNumber } from '../src/sim/quantization';

describe('authoritative numeric quantization', () => {
  it('normalizes low-order drift and negative zero at the fixed-step boundary', () => {
    expect(AUTHORITATIVE_DECIMAL_PLACES).toBe(8);
    expect(quantizeAuthoritativeNumber(1.123456784)).toBe(1.12345678);
    expect(quantizeAuthoritativeNumber(1.123456784 + Number.EPSILON)).toBe(1.12345678);
    expect(Object.is(quantizeAuthoritativeNumber(-Number.EPSILON), -0)).toBe(false);
    const simulation = new GameSimulation('quantization-proof');
    expect(String(simulation.state.robots[0]!.body.positions[0]).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(8);
  });
});
