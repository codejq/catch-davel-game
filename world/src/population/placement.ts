import type { CollisionWorld } from '../core/collision';
import type { Random } from '../core/random';
import type { WorldLayout } from '../world/layout';
import type { CalmActivity, Civilian, CivilianLook } from './civilians';

export interface PicnicPlan { readonly x: number; readonly y: number; readonly z: number; readonly heading: number }

export interface PopulationPlan {
  readonly civilians: Civilian[];
  readonly picnics: PicnicPlan[];
  readonly tanks: { readonly id: string; readonly route: { x: number; z: number }[]; readonly start: number }[];
}

const SKIN = [0xf1c7a5, 0xe0ac86, 0xc68a62, 0x9b6a45, 0x70482c, 0xf6d6bf];
const HAIR = [0x2a1d14, 0x4a3020, 0x7a4c28, 0xc79a55, 0x1b1b1b, 0x9a3a1e, 0xd9c28a];
const SHIRTS = [0xe8504a, 0xf2a93b, 0x4fb3e8, 0x6cc26a, 0xf4e04d, 0xd66fc8, 0x49c9b8, 0xffffff, 0xf08a5d, 0x8a7ff0];
const PANTS = [0x2f4a78, 0x3b3b3b, 0x6b5a45, 0x8a9bb0, 0x5a6b3a, 0xb8a27a];
const SHOES = [0x2b2b2b, 0xe8e8e8, 0x6b3a22, 0x3a4a8a];
const DOGS = [0x8a5a2e, 0xd9b27a, 0x2a2420, 0xf0e6d6, 0x6b4a33];

function look(random: Random, dog = false): CivilianLook {
  if (dog) {
    const coat = random.pick(DOGS);
    return { skin: coat, hair: random.chance(0.5) ? coat : random.pick(DOGS), shirt: random.pick([0xd03a2a, 0x2a6ad0, 0x2aa05a]), pants: coat, shoes: 0x1a1a1a, longHair: random.chance(0.5) };
  }
  return { skin: random.pick(SKIN), hair: random.pick(HAIR), shirt: random.pick(SHIRTS), pants: random.pick(PANTS), shoes: random.pick(SHOES), longHair: random.chance(0.45) };
}

/** True when a patch of ground is open (no walls, trunks, or furniture) and dry. */
function open(world: CollisionWorld, layout: WorldLayout, x: number, z: number, radius: number): boolean {
  const water = layout.theme.waterLevel;
  if (water !== null && layout.terrain.heightAt(x, z) < water + 0.4) return false;
  const ground = world.groundHeight(x, z, 0.3, layout.terrain.heightAt(x, z) + 0.5, 0.42);
  for (const [dx, dz] of [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]] as const) {
    if (world.inside('solid', { x: x + dx, y: ground + 0.9, z: z + dz }, 0.35) !== null) return false;
    if (Math.abs(layout.terrain.heightAt(x + dx, z + dz) - ground) > 0.8) return false;
  }
  return true;
}

function person(id: string, kind: Civilian['kind'], family: number, home: { x: number; z: number; heading: number }, activity: CalmActivity,
  seat: Civilian['seat'], owner: string | null, random: Random, world: CollisionWorld): Civilian {
  const start = seat ?? home;
  return {
    id, kind, family, look: look(random, kind === 'dog'), home, activity, seat, owner,
    bravery: kind === 'dog' ? 1 : 0.45 + random.next() * 0.5, cheer: random.next(),
    position: { x: start.x, y: world.terrainHeight(start.x, start.z), z: start.z },
    heading: seat?.heading ?? home.heading, mode: 'calm', target: null, threat: null, timer: 0,
    walkPhase: random.next() * 10, speed: 0, deathTime: 0, idleTimer: random.next() * 4,
  };
}

/**
 * Settles families beside houses (some round a picnic table, some strolling or chatting in the yard, many with a
 * dog) and plans tank patrols: one along the road from the village to the portal and one circling the village,
 * both starting well away from the player's spawn.
 */
export function planPopulation(layout: WorldLayout, world: CollisionWorld, random: Random, families = 5, tanks = 2): PopulationPlan {
  const civilians: Civilian[] = [];
  const picnics: PicnicPlan[] = [];
  const homes = [...layout.buildings].sort(() => random.next() - 0.5);
  let placed = 0;
  for (const { plan } of homes) {
    if (placed >= families) break;
    let spot: { x: number; z: number } | null = null;
    for (let attempt = 0; attempt < 24 && spot === null; attempt += 1) {
      const angle = random.next() * Math.PI * 2;
      const distance = Math.hypot(plan.width, plan.depth) / 2 + 3 + random.next() * 4;
      const x = plan.x + Math.cos(angle) * distance; const z = plan.z + Math.sin(angle) * distance;
      if (open(world, layout, x, z, 2.2) && Math.hypot(x - layout.spawn.x, z - layout.spawn.z) > 25) spot = { x, z };
    }
    if (spot === null) continue;
    const family = placed;
    placed += 1;
    const heading = random.next() * Math.PI * 2;
    const adults = random.chance(0.8) ? 2 : 1;
    const children = random.int(0, 3);
    const picnic = random.chance(0.6);
    const members: { kind: 'adult' | 'child'; id: string }[] = [];
    for (let index = 0; index < adults; index += 1) members.push({ kind: 'adult', id: '' });
    for (let index = 0; index < children; index += 1) members.push({ kind: 'child', id: '' });
    if (picnic) {
      // A table along `heading` with a bench each side; family members take seats facing across it.
      const ground = world.groundHeight(spot.x, spot.z, 0.3, layout.terrain.heightAt(spot.x, spot.z) + 0.5, 0.42);
      picnics.push({ x: spot.x, y: ground, z: spot.z, heading });
      members.forEach((member, index) => {
        const side = index % 2 === 0 ? 1 : -1;
        const along = (Math.floor(index / 2) - 0.5) * 0.75;
        const across = 0.72 * side;
        const x = spot!.x + Math.cos(heading) * along + Math.sin(heading) * across;
        const z = spot!.z - Math.sin(heading) * along + Math.cos(heading) * across;
        const facing = Math.atan2(spot!.x - x, spot!.z - z);
        const id = `h${civilians.filter((civilian) => civilian.kind !== 'dog').length + 1}`;
        member.id = id;
        civilians.push(person(id, member.kind, family, { x, z, heading: facing }, 'eat', { x, y: ground, z, heading: facing }, null, random, world));
      });
    } else {
      members.forEach((member, index) => {
        const angle = heading + index * (Math.PI * 2 / members.length);
        const x = spot!.x + Math.cos(angle) * 1.1; const z = spot!.z + Math.sin(angle) * 1.1;
        const id = `h${civilians.filter((civilian) => civilian.kind !== 'dog').length + 1}`;
        member.id = id;
        const activity: CalmActivity = member.kind === 'child' || random.chance(0.4) ? 'stroll' : 'idle';
        civilians.push(person(id, member.kind, family, { x, z, heading: Math.atan2(spot!.x - x, spot!.z - z) }, activity, null, null, random, world));
      });
    }
    if (random.chance(0.7)) {
      const owner = members[members.length - 1]!.id;
      civilians.push(person(`k${civilians.filter((civilian) => civilian.kind === 'dog').length + 1}`, 'dog', family,
        { x: spot.x + 1.8, z: spot.z + 1.2, heading }, 'stroll', null, owner, random, world));
    }
  }

  // Tank routes: the village-to-portal road, densified, and a ring round the village.
  const routes: { x: number; z: number }[][] = [];
  const road = layout.roads[layout.roads.length - 1];
  if (road !== undefined) routes.push(densify(road.points, 8));
  const village = layout.roads[0]?.points[layout.roads[0].points.length - 1] ?? { x: 0, z: 0 };
  // Wide enough to pass outside every house in the village.
  const radius = Math.max(40, ...layout.buildings.map(({ plan }) => Math.hypot(plan.x - village.x, plan.z - village.z) + Math.hypot(plan.width, plan.depth) / 2 + 8));
  const ring: { x: number; z: number }[] = [];
  const water = layout.theme.waterLevel;
  const dry = (x: number, z: number): boolean => water === null || layout.terrain.heightAt(x, z) > water + 0.5;
  for (let step = 0; step <= 20; step += 1) {
    const angle = step / 20 * Math.PI * 2;
    // Swing wide of lakes: try nearer and further rings before giving up on this point.
    const reach = [radius, radius - 12, radius + 12, radius - 24, radius + 24].find((candidate) => dry(village.x + Math.cos(angle) * candidate, village.z + Math.sin(angle) * candidate));
    if (reach !== undefined) ring.push({ x: village.x + Math.cos(angle) * reach, z: village.z + Math.sin(angle) * reach });
  }
  routes.push(ring);
  const tankPlans = routes.map((route) => route.filter((point) => dry(point.x, point.z))).filter((route) => route.length >= 2).slice(0, tanks).map((route, index) => {
    // Start at the point of the route furthest from where the player spawns.
    let start = 0; let furthest = -1;
    route.forEach((point, pointIndex) => {
      const distance = Math.hypot(point.x - layout.spawn.x, point.z - layout.spawn.z);
      if (distance > furthest) { furthest = distance; start = pointIndex; }
    });
    return { id: `t${index + 1}`, route, start: Math.max(0, Math.min(start, route.length - 2)) };
  });
  return { civilians, picnics, tanks: tankPlans };
}

function densify(points: readonly { x: number; z: number }[], spacing: number): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]!; const b = points[index + 1]!;
    const steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / spacing));
    for (let step = 0; step < steps; step += 1) out.push({ x: a.x + (b.x - a.x) * step / steps, z: a.z + (b.z - a.z) * step / steps });
  }
  const last = points[points.length - 1];
  if (last !== undefined) out.push({ x: last.x, z: last.z });
  return out;
}

