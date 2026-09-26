import { describe, expect, it } from 'vitest';
import { createRoundedBox } from '../src/render/geometry';

describe('rounded box mesh', () => {
  for (const detailed of [true, false]) {
    it(`stays inside the unit box with outward counter-clockwise faces (${detailed ? 'detailed' : 'fast'})`, () => {
      const mesh = createRoundedBox(0.12, detailed);
      const { vertices, indices } = mesh;
      for (let index = 0; index < vertices.length; index += 6) {
        for (let axis = 0; axis < 3; axis += 1) expect(Math.abs(vertices[index + axis]!)).toBeLessThanOrEqual(0.5 + 1e-6);
        expect(Math.hypot(vertices[index + 3]!, vertices[index + 4]!, vertices[index + 5]!)).toBeCloseTo(1, 5);
      }
      let checked = 0;
      for (let triangle = 0; triangle < indices.length; triangle += 3) {
        const [a, b, c] = [indices[triangle]!, indices[triangle + 1]!, indices[triangle + 2]!].map((vertex) => vertex * 6);
        const edge1 = [0, 1, 2].map((axis) => vertices[b! + axis]! - vertices[a! + axis]!);
        const edge2 = [0, 1, 2].map((axis) => vertices[c! + axis]! - vertices[a! + axis]!);
        const cross = [
          edge1[1]! * edge2[2]! - edge1[2]! * edge2[1]!,
          edge1[2]! * edge2[0]! - edge1[0]! * edge2[2]!,
          edge1[0]! * edge2[1]! - edge1[1]! * edge2[0]!,
        ];
        const area = Math.hypot(cross[0]!, cross[1]!, cross[2]!);
        if (area < 1e-9) continue;
        const centroid = [0, 1, 2].map((axis) => vertices[a! + axis]! + vertices[b! + axis]! + vertices[c! + axis]!);
        expect(cross[0]! * centroid[0]! + cross[1]! * centroid[1]! + cross[2]! * centroid[2]!).toBeGreaterThan(0);
        checked += 1;
      }
      expect(checked).toBeGreaterThanOrEqual(12);
    });
  }
});
