import type { CollisionWorld, Vec3 } from '../core/collision';
import type { Random } from '../core/random';
import type { WorldLayout } from './layout';

export interface LootSpot {
  readonly position: Vec3;
  /** Where it was left: on a building floor, or outside by a tree, rock, bush, or road. */
  readonly where: 'indoors' | 'tree' | 'rock' | 'bush' | 'road';
}

/**
 * Picks spots for loose loot lying around a world: on the floors of buildings and outside at the foot of trees and
 * rocks, in bushes, and along roads. Different every playthrough when given a fresh `random`. Spots inside walls,
 * furniture, or other solids are skipped.
 */
export function scatterLootSpots(layout: WorldLayout, collision: CollisionWorld, random: Random, indoorCount: number, outdoorCount: number): LootSpot[] {
  const spots: LootSpot[] = [];
  const clear = (point: Vec3): boolean =>
    // Probe at knee height (the margin also applies vertically, so lower would catch the floor itself).
    collision.inside('solid', { x: point.x, y: point.y + 0.6, z: point.z }, 0.3) === null
    && spots.every((spot) => Math.hypot(spot.position.x - point.x, spot.position.z - point.z) > 3);

  for (let attempt = 0; attempt < indoorCount * 12 && spots.length < indoorCount && layout.buildings.length > 0; attempt += 1) {
    const { plan } = random.pick(layout.buildings);
    const turned = plan.rotation % 2 === 1;
    const width = (turned ? plan.depth : plan.width) - 2;
    const depth = (turned ? plan.width : plan.depth) - 2;
    if (width <= 0 || depth <= 0) continue;
    const x = plan.x + (random.next() - 0.5) * width;
    const z = plan.z + (random.next() - 0.5) * depth;
    // Upstairs now and then in two-storey houses.
    const feet = plan.floors === 2 && random.chance(0.35) ? plan.baseY + 3.6 : plan.baseY + 0.4;
    const y = collision.groundHeight(x, z, 0.25, feet, 0.5);
    if (y < plan.baseY - 0.2) continue;
    const point = { x, y, z };
    if (clear(point)) spots.push({ position: point, where: 'indoors' });
  }

  const indoorTotal = spots.length;
  for (let attempt = 0; attempt < outdoorCount * 12 && spots.length - indoorTotal < outdoorCount; attempt += 1) {
    const roll = random.next();
    let where: LootSpot['where'];
    let x: number; let z: number;
    if (roll < 0.4 && layout.trees.length > 0) {
      const tree = random.pick(layout.trees);
      const angle = random.next() * Math.PI * 2; const distance = 0.9 + random.next() * 1.4;
      x = tree.x + Math.cos(angle) * distance; z = tree.z + Math.sin(angle) * distance; where = 'tree';
    } else if (roll < 0.6 && layout.rocks.length > 0) {
      const rock = random.pick(layout.rocks);
      const angle = random.next() * Math.PI * 2; const distance = rock.scale * 1.2 + 0.6;
      x = rock.x + Math.cos(angle) * distance; z = rock.z + Math.sin(angle) * distance; where = 'rock';
    } else if (roll < 0.8 && layout.bushes.length > 0) {
      const bush = random.pick(layout.bushes);
      x = bush.x + (random.next() - 0.5); z = bush.z + (random.next() - 0.5); where = 'bush';
    } else if (layout.roads.length > 0) {
      const road = random.pick(layout.roads);
      const from = random.pick(road.points);
      x = from.x + (random.next() - 0.5) * road.width; z = from.z + (random.next() - 0.5) * road.width; where = 'road';
    } else {
      continue;
    }
    const point = { x, y: layout.terrain.heightAt(x, z), z };
    if (clear(point)) spots.push({ position: point, where });
  }
  return spots;
}
