import { describe, expect, it } from 'vitest';
import { Random } from '../src/core/random';
import { generateLayout } from '../src/world/layout';
import { WORLDS } from '../src/world/themes';
import { CollisionWorld } from '../src/core/collision';
import { scatterLootSpots } from '../src/world/loot-spots';

describe('loose loot', () => {
  const layout = generateLayout(WORLDS[0]!);
  const collision = new CollisionWorld((x, z) => layout.terrain.heightAt(x, z));
  for (const { parts } of layout.buildings) {
    for (const part of parts.parts) {
      if (!part.collide) continue;
      collision.add('solid', part.x - part.width / 2, part.y - part.height / 2, part.z - part.depth / 2,
        part.x + part.width / 2, part.y + part.height / 2, part.z + part.depth / 2, part.role === 'glass' ? 'glass' : undefined);
    }
    for (const box of parts.containers) collision.addBox('solid', box.x, box.y, box.z, box.width, box.height, box.depth);
  }

  it('lies both inside buildings and outdoors, clear of walls and spread apart', () => {
    const spots = scatterLootSpots(layout, collision, new Random('run-1'), 6, 9);
    const indoors = spots.filter((spot) => spot.where === 'indoors');
    const outdoors = spots.filter((spot) => spot.where !== 'indoors');
    expect(indoors.length).toBeGreaterThan(2);
    expect(outdoors.length).toBeGreaterThan(5);
    for (const spot of spots) expect(collision.inside('solid', { ...spot.position, y: spot.position.y + 0.3 })).toBeNull();
    for (const a of spots) for (const b of spots) if (a !== b) expect(Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z)).toBeGreaterThan(3);
  });

  it('lands somewhere different every playthrough', () => {
    const first = scatterLootSpots(layout, collision, new Random('run-1'), 6, 9).map((spot) => `${spot.position.x.toFixed(1)},${spot.position.z.toFixed(1)}`);
    const second = scatterLootSpots(layout, collision, new Random('run-2'), 6, 9).map((spot) => `${spot.position.x.toFixed(1)},${spot.position.z.toFixed(1)}`);
    expect(first.filter((spot) => second.includes(spot)).length).toBeLessThan(2);
  });
});
