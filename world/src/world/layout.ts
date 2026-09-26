import { fbm, seedOf } from '../core/noise';
import { Random } from '../core/random';
import { buildBuilding, buildWatchtower, type BuildingParts, type BuildingPlan } from './buildings';
import { distanceToPolyline, Terrain, type FlatSite, type Road } from './terrain';
import type { TreeKind, WorldTheme } from './themes';

export interface Placement { readonly x: number; readonly y: number; readonly z: number; readonly scale: number; readonly yaw: number }
export interface TreePlacement extends Placement { readonly kind: TreeKind }
export interface Patrol { readonly id: string; readonly waypoints: readonly { readonly x: number; readonly z: number }[]; readonly guard: boolean }

export interface WorldLayout {
  readonly theme: WorldTheme;
  readonly terrain: Terrain;
  readonly buildings: readonly { readonly plan: BuildingPlan; readonly parts: BuildingParts }[];
  readonly towers: readonly BuildingParts[];
  readonly roads: readonly Road[];
  readonly trees: readonly TreePlacement[];
  readonly bushes: readonly Placement[];
  readonly rocks: readonly Placement[];
  readonly spawn: { readonly x: number; readonly z: number; readonly yaw: number };
  readonly portal: { readonly x: number; readonly z: number; readonly yaw: number };
  readonly patrols: readonly Patrol[];
  /** Container that holds the portal keycard. */
  readonly keycardContainerId: string;
}

const MIN_BUILDING_GAP = 7;

export function generateLayout(theme: WorldTheme): WorldLayout {
  const random = new Random(theme.seed);
  const half = theme.size / 2;
  const playable = half * 0.78;

  const spawn = { x: random.range(-20, 20), z: playable - 18, yaw: 0 };
  const portal = { x: random.range(-30, 30), z: -playable + 22, yaw: 0 };

  // Village: buildings scattered around a centre plaza, avoiding each other and the spawn/portal areas.
  const plans: BuildingPlan[] = [];
  const sites: FlatSite[] = [];
  const village = { x: random.range(-25, 25), z: random.range(-25, 5) };
  for (let attempt = 0; attempt < 400 && plans.length < theme.buildingCount; attempt += 1) {
    const angle = random.range(0, Math.PI * 2);
    const distance = plans.length < 3 ? random.range(14, 32) : random.range(18, 78);
    const x = village.x + Math.cos(angle) * distance;
    const z = village.z + Math.sin(angle) * distance;
    const floors: 1 | 2 = random.chance(theme.buildingStyle === 'bunker' ? 0.35 : 0.5) ? 2 : 1;
    const width = Math.round(random.range(7, 11));
    const depth = Math.round(random.range(7, 10));
    const radius = Math.hypot(width, depth) / 2;
    if (Math.abs(x) > playable - 20 || Math.abs(z) > playable - 20) continue;
    if (Math.hypot(x - spawn.x, z - spawn.z) < 45 || Math.hypot(x - portal.x, z - portal.z) < 25) continue;
    if (sites.some((site) => Math.hypot(site.x - x, site.z - z) < site.radius + radius + MIN_BUILDING_GAP)) continue;
    if (Terrain.baseHeight(theme, x, z) < (theme.waterLevel ?? -99) + 1.5) continue;
    // Face the plaza, snapped to a quarter turn so walls stay axis-aligned.
    const toPlaza = Math.atan2(village.x - x, village.z - z);
    const rotation = (((Math.round(toPlaza / (Math.PI / 2)) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
    const roof = theme.buildingStyle === 'village' && floors === 1 && random.chance(0.75) ? 'pitched' : 'flat';
    plans.push({
      id: `${theme.id}-b${plans.length}`, x, z, baseY: 0, rotation, width, depth, floors,
      style: theme.buildingStyle, roof, seed: `${theme.seed}-b${plans.length}`,
    });
    sites.push({ x, z, radius });
  }
  sites.push({ x: portal.x, z: portal.z, radius: 9 });
  sites.push({ x: village.x, z: village.z, radius: 10 });
  const towerSites = [
    { x: spawn.x + random.range(-30, 30), z: spawn.z - random.range(38, 52) },
    { x: village.x + (random.chance(0.5) ? -1 : 1) * random.range(50, 70), z: village.z + random.range(-20, 20) },
  ].filter((site) => !sites.some((other) => Math.hypot(other.x - site.x, other.z - site.z) < other.radius + 6));
  for (const tower of towerSites) sites.push({ x: tower.x, z: tower.z, radius: 4 });

  const roads: Road[] = [
    { points: [{ x: spawn.x, z: spawn.z + 10 }, { x: (spawn.x + village.x) / 2 + random.range(-15, 15), z: (spawn.z + village.z) / 2 }, village], width: 4.5 },
    { points: [village, { x: (portal.x + village.x) / 2 + random.range(-15, 15), z: (portal.z + village.z) / 2 }, { x: portal.x, z: portal.z + 6 }], width: 4.5 },
    ...plans.map((plan) => ({ points: [{ x: plan.x, z: plan.z }, village], width: 2.6 })),
  ];

  const terrain = Terrain.generate(theme, sites, roads);
  const buildings = plans.map((plan) => {
    const placed = { ...plan, baseY: terrain.heightAt(plan.x, plan.z) };
    return { plan: placed, parts: buildBuilding(placed) };
  });
  const towers = towerSites.map((site, index) => buildWatchtower(`${theme.id}-t${index}`, site.x, terrain.heightAt(site.x, site.z), site.z));

  const blocked = (x: number, z: number, clearance: number): boolean => {
    if (Math.abs(x) > half * 0.9 || Math.abs(z) > half * 0.9) return true;
    if (sites.some((site) => Math.hypot(site.x - x, site.z - z) < site.radius + clearance)) return true;
    if (roads.some((road) => distanceToPolyline(x, z, road.points) < road.width / 2 + clearance)) return true;
    if (Math.hypot(x - spawn.x, z - spawn.z) < 6) return true;
    return theme.waterLevel !== null && terrain.heightAt(x, z) < theme.waterLevel + 0.3;
  };

  const seed = seedOf(theme.seed);
  const trees: TreePlacement[] = [];
  for (let attempt = 0; attempt < theme.treeCount * 6 && trees.length < theme.treeCount; attempt += 1) {
    const x = random.range(-half * 0.9, half * 0.9);
    const z = random.range(-half * 0.9, half * 0.9);
    const forest = fbm(x / 70, z / 70, seed + 21, 3);
    if (random.next() > forest * forest * 2.4) continue;
    if (blocked(x, z, 2.5) || terrain.slopeAt(x, z) > 0.9) continue;
    if (trees.some((tree) => Math.abs(tree.x - x) < 1.6 && Math.abs(tree.z - z) < 1.6)) continue;
    trees.push({ kind: random.pick(theme.trees), x, y: terrain.heightAt(x, z), z, scale: random.range(0.75, 1.35), yaw: random.range(0, Math.PI * 2) });
  }
  const bushes: Placement[] = [];
  for (let attempt = 0; attempt < theme.bushCount * 6 && bushes.length < theme.bushCount; attempt += 1) {
    // Bushes cluster at forest edges and near buildings, where a sniper wants cover.
    const anchor = random.chance(0.6) && trees.length > 0 ? random.pick(trees) : random.chance(0.5) && sites.length > 0 ? random.pick(sites) : null;
    const x = anchor === null ? random.range(-half * 0.85, half * 0.85) : anchor.x + random.range(-12, 12);
    const z = anchor === null ? random.range(-half * 0.85, half * 0.85) : anchor.z + random.range(-12, 12);
    if (blocked(x, z, 1.2)) continue;
    bushes.push({ x, y: terrain.heightAt(x, z), z, scale: random.range(0.8, 1.5), yaw: random.range(0, Math.PI * 2) });
  }
  const rocks: Placement[] = [];
  for (let attempt = 0; attempt < theme.rockCount * 4 && rocks.length < theme.rockCount; attempt += 1) {
    const x = random.range(-half * 0.95, half * 0.95);
    const z = random.range(-half * 0.95, half * 0.95);
    if (blocked(x, z, 1)) continue;
    rocks.push({ x, y: terrain.heightAt(x, z), z, scale: random.range(0.4, 2.6) * (terrain.slopeAt(x, z) > 0.4 ? 1.5 : 1), yaw: random.range(0, Math.PI * 2) });
  }

  // Robot patrols loop around buildings; guards hold the portal and the plaza.
  const patrols: Patrol[] = [];
  const shuffled = [...buildings].sort(() => random.next() - 0.5);
  for (let index = 0; index < theme.sentries; index += 1) {
    if (index === 0) {
      patrols.push({ id: `${theme.id}-s${index}`, guard: true, waypoints: [{ x: portal.x - 5, z: portal.z + 4 }, { x: portal.x + 5, z: portal.z + 4 }] });
      continue;
    }
    if (index === 1) {
      patrols.push({ id: `${theme.id}-s${index}`, guard: false, waypoints: loop(village.x, village.z, 9, 5, random) });
      continue;
    }
    const building = shuffled[index % Math.max(1, shuffled.length)];
    if (building === undefined) break;
    const reach = Math.max(building.plan.width, building.plan.depth) / 2 + 3;
    patrols.push({ id: `${theme.id}-s${index}`, guard: random.chance(0.25), waypoints: loop(building.plan.x, building.plan.z, reach, 4, random) });
  }

  // The keycard sits in a container of the building farthest from the spawn.
  const farthest = [...buildings].sort((a, b) =>
    Math.hypot(b.plan.x - spawn.x, b.plan.z - spawn.z) - Math.hypot(a.plan.x - spawn.x, a.plan.z - spawn.z))[0];
  const keycardContainerId = farthest?.parts.containers[random.int(0, Math.max(0, farthest.parts.containers.length - 1))]?.id
    ?? towers[0]?.containers[0]?.id ?? 'none';

  spawn.yaw = Math.atan2(village.x - spawn.x, -(village.z - spawn.z));
  return { theme, terrain, buildings, towers, roads, trees, bushes, rocks, spawn, portal, patrols, keycardContainerId };
}

function loop(cx: number, cz: number, radius: number, count: number, random: Random): { x: number; z: number }[] {
  const start = random.range(0, Math.PI * 2);
  return Array.from({ length: count }, (_, index) => {
    const angle = start + (index / count) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * radius, z: cz + Math.sin(angle) * radius };
  });
}
