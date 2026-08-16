import { describe, expect, it } from 'vitest';
import { XorShift32 } from '../src/sim/random';

describe('XorShift32', () => {
  it('repeats exactly for the same string seed', () => {
    const first = new XorShift32('repeatable');
    const second = new XorShift32('repeatable');
    const firstValues = Array.from({ length: 32 }, () => first.nextUint32());
    const secondValues = Array.from({ length: 32 }, () => second.nextUint32());
    expect(firstValues).toEqual(secondValues);
  });

  it('does not use zero as its absorbing state', () => {
    const random = new XorShift32(0);
    expect(random.nextUint32()).not.toBe(0);
  });
});

