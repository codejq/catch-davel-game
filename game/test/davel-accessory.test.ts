import { describe, expect, it } from 'vitest';
import { davelAccessory } from '../src/render/davel-accessory';
import { ROBOT_DEFINITIONS } from '../src/sim/robots';

describe('procedural Davel accessory identities', () => {
  it('gives every stable Chapter 1 Davel a distinct silhouette accessory', () => {
    const accessories = ROBOT_DEFINITIONS.map((_, robotId) => davelAccessory(robotId));
    expect(accessories.every((accessory) => accessory !== null)).toBe(true);
    expect(new Set(accessories).size).toBe(ROBOT_DEFINITIONS.length);
    expect(davelAccessory(6)).toBe('invoice-crown');
  });

  it('rejects unknown and non-integral identities', () => {
    expect(davelAccessory(-1)).toBeNull();
    expect(davelAccessory(99)).toBeNull();
    expect(davelAccessory(1.5)).toBeNull();
  });
});
