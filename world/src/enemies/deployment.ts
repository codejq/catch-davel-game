import type { CollisionWorld } from '../core/collision';
import type { Random } from '../core/random';
import { open } from '../population/placement';
import type { WorldLayout } from '../world/layout';
import type { SentryKind } from './sentry';

export interface Deployment {
  readonly id: string;
  readonly kind: SentryKind;
  readonly guard: boolean;
  readonly waypoints: readonly { readonly x: number; readonly z: number }[];
}

/** Nobody starts closer than this to where the player spawns. */
export const SPAWN_CLEARANCE = 55;

type Point = { x: number; z: number };

/**
 * Deploys a world's enemies at random, so every run is different: the theme's robots plus 20 to 30 more, and 10
 * to 15 human soldiers in squads of two or three. Robots patrol round buildings, along roads, and across open
 * ground; one always guards the portal. Everyone starts well away from the player.
 */
export function planForces(layout: WorldLayout, world: CollisionWorld, random: Random,
  robots = layout.theme.sentries + 20 + random.int(0, 10), soldiers = 10 + random.int(0, 5)): Deployment[] {
  const half = layout.theme.size / 2 * 0.78;
  const spawn = layout.spawn;
  const clear = (point: Point): boolean => Math.hypot(point.x - spawn.x, point.z - spawn.z) > SPAWN_CLEARANCE * 0.8
    && Math.abs(point.x) < half && Math.abs(point.z) < half && open(world, layout, point.x, point.z, 0.8);
  const far = (point: Point): boolean => Math.hypot(point.x - spawn.x, point.z - spawn.z) > SPAWN_CLEARANCE;

  const loop = (center: Point, radius: number, count: number): Point[] => {
    const start = random.range(0, Math.PI * 2);
    return Array.from({ length: count }, (_, index) => {
      const angle = start + index / count * Math.PI * 2 + random.range(-0.2, 0.2);
      const reach = radius * random.range(0.8, 1.2);
      return { x: center.x + Math.cos(angle) * reach, z: center.z + Math.sin(angle) * reach };
    }).filter(clear);
  };

  /** A patrol route somewhere in the world: round a building, along a stretch of road, or across open ground. */
  const route = (): Point[] => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const roll = random.next();
      let points: Point[];
      if (roll < 0.45 && layout.buildings.length > 0) {
        const { plan } = random.pick(layout.buildings);
        points = loop(plan, Math.max(plan.width, plan.depth) / 2 + random.range(2.5, 6), 4 + random.int(0, 2));
      } else if (roll < 0.65 && layout.roads.length > 0) {
        const road = random.pick(layout.roads).points;
        const from = random.int(0, Math.max(0, road.length - 2));
        const a = road[from]!; const b = road[Math.min(road.length - 1, from + 1)]!;
        const along = random.next();
        const middle = { x: a.x + (b.x - a.x) * along, z: a.z + (b.z - a.z) * along };
        const dx = b.x - a.x; const dz = b.z - a.z; const length = Math.hypot(dx, dz) || 1;
        const stretch = random.range(10, 22);
        points = [
          { x: middle.x - dx / length * stretch + random.range(-2, 2), z: middle.z - dz / length * stretch + random.range(-2, 2) },
          { x: middle.x + dx / length * stretch + random.range(-2, 2), z: middle.z + dz / length * stretch + random.range(-2, 2) },
        ].filter(clear);
      } else {
        const center = { x: random.range(-half, half), z: random.range(-half, half) };
        points = loop(center, random.range(5, 14), 3 + random.int(0, 2));
      }
      if (points.length >= 2 && points.some(far)) {
        // Start somewhere along the route, not always at its first corner.
        const shift = random.int(0, points.length - 1);
        return [...points.slice(shift), ...points.slice(0, shift)];
      }
    }
    return [];
  };

  const forces: Deployment[] = [];
  const theme = layout.theme.id;
  // The portal guard stands its post, a few metres off the gate.
  const portal = layout.portal;
  const post = [...Array(60)].map((_, attempt) => {
    const angle = random.range(0, Math.PI * 2); const reach = 4 + attempt * 0.3;
    return { x: portal.x + Math.cos(angle) * reach, z: portal.z + Math.sin(angle) * reach };
  }).find(clear) ?? route()[0] ?? { x: portal.x, z: portal.z + 4 };
  forces.push({ id: `${theme}-s0`, kind: 'robot', guard: true, waypoints: [post, ...[{ x: post.x + random.range(-6, 6), z: post.z + random.range(-3, 3) }].filter(clear)] });
  for (let index = 1; index < robots; index += 1) {
    const waypoints = route();
    if (waypoints.length === 0) continue;
    // Some robots stand sentry at one spot instead of walking a beat.
    const guard = random.chance(0.2);
    forces.push({ id: `${theme}-s${index}`, kind: 'robot', guard, waypoints: guard ? [waypoints.find(far) ?? waypoints[0]!] : waypoints });
  }
  let squad = 0;
  for (let placed = 0; placed < soldiers;) {
    const waypoints = route();
    if (waypoints.length === 0) { placed += 1; continue; }
    const size = Math.min(soldiers - placed, 2 + random.int(0, 1));
    squad += 1;
    for (let member = 0; member < size; member += 1) {
      // Squad mates walk the same beat a step or two apart.
      const offset = { x: (member % 2 === 0 ? 1 : -1) * 1.6 * Math.ceil(member / 2), z: member * 1.2 };
      const own = waypoints.map((point) => ({ x: point.x + offset.x, z: point.z + offset.z }));
      forces.push({ id: `${theme}-g${squad}-${member + 1}`, kind: 'soldier', guard: false, waypoints: own.every(clear) ? own : waypoints });
      placed += 1;
    }
  }
  return forces;
}
