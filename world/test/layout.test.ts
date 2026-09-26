import { describe, expect, it } from 'vitest';
import { WORLDS } from '../src/world/themes';
import { generateLayout } from '../src/world/layout';
import { wallSegments } from '../src/world/buildings';

describe('world layout', () => {
  for (const theme of WORLDS) {
    it(`generates a complete, deterministic ${theme.name}`, () => {
      const layout = generateLayout(theme);
      expect(layout.buildings.length).toBeGreaterThanOrEqual(Math.min(6, theme.buildingCount));
      expect(layout.trees.length).toBeGreaterThan(theme.treeCount * 0.5);
      expect(layout.patrols.length).toBe(theme.sentries);
      const containers = [...layout.buildings.flatMap((b) => b.parts.containers), ...layout.towers.flatMap((t) => t.containers)];
      expect(containers.some((container) => container.id === layout.keycardContainerId)).toBe(true);
      expect(layout.buildings.every((b) => b.parts.doors.length >= 1)).toBe(true);
      for (const [index, a] of layout.buildings.entries()) {
        for (const b of layout.buildings.slice(index + 1)) {
          expect(Math.hypot(a.plan.x - b.plan.x, a.plan.z - b.plan.z)).toBeGreaterThan(8);
        }
      }
      expect(Math.hypot(layout.spawn.x - layout.portal.x, layout.spawn.z - layout.portal.z)).toBeGreaterThan(150);
      const again = generateLayout(theme);
      expect(again.trees[10]).toEqual(layout.trees[10]);
      expect(again.keycardContainerId).toBe(layout.keycardContainerId);
      for (const part of layout.buildings.flatMap((b) => b.parts.parts)) {
        expect([part.x, part.y, part.z, part.width, part.height, part.depth].every(Number.isFinite)).toBe(true);
        expect(part.width).toBeGreaterThan(0);
      }
    });
  }

  it('splits walls around doors and windows without covering the openings', () => {
    const segments = wallSegments(8, 3, [{ center: 0, width: 1, bottom: 0, top: 2.2 }, { center: 2.5, width: 1, bottom: 1, top: 2 }]);
    const coverAt = (x: number, y: number): boolean => segments.some((s) =>
      Math.abs(x - s.center) < s.length / 2 && Math.abs(y - s.y) < s.height / 2);
    expect(coverAt(0, 1)).toBe(false);
    expect(coverAt(2.5, 1.5)).toBe(false);
    expect(coverAt(2.5, 0.5)).toBe(true);
    expect(coverAt(0, 2.6)).toBe(true);
    expect(coverAt(-3, 1)).toBe(true);
  });
});

describe('doorways', () => {
  it('every door opening is clear of walls and level with the ground outside, so houses can be entered', () => {
    for (const theme of WORLDS) {
      const layout = generateLayout(theme);
      for (const { parts } of layout.buildings) {
        for (const door of parts.doors) {
          const cx = door.hingeX + Math.cos(door.closedYaw) * door.width / 2;
          const cz = door.hingeZ - Math.sin(door.closedYaw) * door.width / 2;
          // No wall piece may overlap the middle of the opening between the sill and head height.
          const blocking = parts.parts.filter((part) => part.collide && part.role !== 'trim' && part.role !== 'floor'
            && Math.abs(part.x - cx) < part.width / 2 + 0.05 && Math.abs(part.z - cz) < part.depth / 2 + 0.05
            && part.y - part.height / 2 < door.hingeY + 1.9 && part.y + part.height / 2 > door.hingeY + 0.3);
          expect(blocking, `${door.id} blocked`).toEqual([]);
          for (const step of [-1, 1]) {
            const ground = layout.terrain.heightAt(cx + Math.sin(door.closedYaw) * step, cz + Math.cos(door.closedYaw) * step);
            expect(ground - door.hingeY, `${door.id} doorstep`).toBeLessThan(0.45);
          }
        }
      }
    }
  });
});
