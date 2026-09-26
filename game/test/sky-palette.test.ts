import { describe, expect, it } from 'vitest';
import { skyGradient } from '../src/render/sky-palette';
import { orthographic } from '../src/render/math';

describe('sky gradient', () => {
  it('derives a paler horizon and a deeper zenith from a palette sky', () => {
    const { horizon, zenith } = skyGradient([0.32, 0.83, 1]);
    const luminance = (color: readonly number[]): number => color[0]! * 0.2126 + color[1]! * 0.7152 + color[2]! * 0.0722;
    expect(luminance(horizon)).toBeGreaterThan(luminance(zenith));
    expect(zenith[2]).toBeGreaterThan(zenith[0]);
    for (const channel of [...horizon, ...zenith]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(1);
    }
  });

  it('stays in range for extreme palettes', () => {
    for (const sky of [[0, 0, 0], [1, 1, 1], [1, 0, 0.5]] as const) {
      const { horizon, zenith } = skyGradient(sky);
      expect([...horizon, ...zenith].every((channel) => channel >= 0 && channel <= 1)).toBe(true);
    }
  });
});

describe('orthographic projection', () => {
  it('maps the view box onto clip space', () => {
    const matrix = new Float32Array(16);
    orthographic(matrix, -2, 2, -1, 1, 1, 11);
    const project = (x: number, y: number, z: number): number[] => [
      matrix[0]! * x + matrix[12]!, matrix[5]! * y + matrix[13]!, matrix[10]! * z + matrix[14]!,
    ];
    expect(project(2, 1, -1).map((value) => Number(value.toFixed(6)))).toEqual([1, 1, -1]);
    expect(project(-2, -1, -11).map((value) => Number(value.toFixed(6)))).toEqual([-1, -1, 1]);
  });
});
