import type { CollisionWorld, Vec3 } from '../core/collision';

const CELL = 0.5;
const CLEARANCE = 0.3;
/** Highest step a walker can take (the player's own step is 0.42 m). */
const MAX_STEP = 0.45;
/** Headroom for a crouching person: low door lintels are passable, the walker ducks under them. */
const HEADROOM = 1.3;
const MAX_DROP = 2.5;
const MAX_EXPANSIONS = 160_000;

interface Node { readonly cx: number; readonly cz: number; readonly ground: number }

/**
 * Finds a walking route from `from` (the walker's feet) to within `reach` metres of `to` on the same floor as `to`
 * (a thing at height `to.y` sits on a floor at most ~2 m below it). A* over a 0.5 m grid where each node also
 * carries its floor height, so routes climb stairs and pass through doorways; closed doors count as passable (the
 * walker opens them). Returns the route's corners, or null if none was found within the search budget.
 */
export function findPath(world: CollisionWorld, from: Vec3, to: Vec3, reach = 1.2): Vec3[] | null {
  const start: Node = { cx: Math.round(from.x / CELL), cz: Math.round(from.z / CELL), ground: from.y };
  const goalX = to.x; const goalZ = to.z;
  const key = (node: Node): string => `${node.cx},${node.cz},${Math.round(node.ground * 4)}`;
  const heuristic = (node: Node): number => {
    const dx = Math.abs(node.cx * CELL - goalX); const dz = Math.abs(node.cz * CELL - goalZ);
    return (Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)) / CELL;
  };
  const isGoal = (node: Node): boolean =>
    Math.hypot(node.cx * CELL - goalX, node.cz * CELL - goalZ) <= reach && node.ground <= to.y + 0.3 && node.ground >= to.y - 2.2;

  const nodes = new Map<string, Node>();
  const cost = new Map<string, number>();
  const came = new Map<string, string>();
  const open = new MinHeap<string>();
  const startKey = key(start);
  nodes.set(startKey, start);
  cost.set(startKey, 0);
  open.push(startKey, heuristic(start));
  let expansions = 0;
  let goalKey: string | null = null;
  while (open.size > 0 && expansions < MAX_EXPANSIONS) {
    const currentKey = open.pop();
    const here = nodes.get(currentKey)!;
    if (isGoal(here)) { goalKey = currentKey; break; }
    expansions += 1;
    const base = cost.get(currentKey)!;
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        if (dx === 0 && dz === 0) continue;
        const next = stepTo(world, here, here.cx + dx, here.cz + dz);
        if (next === null) continue;
        // No cutting corners past walls.
        if (dx !== 0 && dz !== 0 && (stepTo(world, here, here.cx + dx, here.cz) === null || stepTo(world, here, here.cx, here.cz + dz) === null)) continue;
        const nextKey = key(next);
        const total = base + (dx !== 0 && dz !== 0 ? Math.SQRT2 : 1) + Math.abs(next.ground - here.ground);
        if (total < (cost.get(nextKey) ?? Number.POSITIVE_INFINITY)) {
          nodes.set(nextKey, next);
          cost.set(nextKey, total);
          came.set(nextKey, currentKey);
          open.push(nextKey, total + heuristic(next));
        }
      }
    }
  }
  if (goalKey === null) return null;

  const route: Node[] = [];
  for (let id: string | undefined = goalKey; id !== undefined; id = came.get(id)) route.push(nodes.get(id)!);
  route.reverse();
  // Keep only corners and changes of level, so the walker moves in straight lines between them.
  const waypoints: Vec3[] = [];
  for (let index = 1; index < route.length; index += 1) {
    const previous = route[index - 1]!; const point = route[index]!; const next = route[index + 1];
    const turning = next === undefined || next.cx - point.cx !== point.cx - previous.cx || next.cz - point.cz !== point.cz - previous.cz
      || Math.abs(next.ground - point.ground) > 0.2;
    if (turning) waypoints.push({ x: point.cx * CELL, y: point.ground, z: point.cz * CELL });
  }
  return waypoints;
}

/** Where a walker standing on `from` ends up stepping into cell (cx, cz), or null if it can't. */
function stepTo(world: CollisionWorld, from: Node, cx: number, cz: number): Node | null {
  const x = cx * CELL; const z = cz * CELL;
  const ground = world.groundHeight(x, z, CLEARANCE, from.ground, MAX_STEP);
  if (ground - from.ground > MAX_STEP || from.ground - ground > MAX_DROP) return null;
  for (const volume of world.query(x - CLEARANCE, z - CLEARANCE, x + CLEARANCE, z + CLEARANCE, 'solid')) {
    if (!volume.enabled || volume.tag === 'stairs' || volume.tag?.startsWith('door:') === true) continue;
    if (volume.maxY <= ground + MAX_STEP || volume.minY >= ground + HEADROOM) continue;
    if (x + CLEARANCE <= volume.minX || x - CLEARANCE >= volume.maxX || z + CLEARANCE <= volume.minZ || z - CLEARANCE >= volume.maxZ) continue;
    return null;
  }
  return { cx, cz, ground };
}

/** Binary min-heap of ids keyed by priority. */
class MinHeap<T> {
  private readonly ids: T[] = [];
  private readonly priorities: number[] = [];

  get size(): number { return this.ids.length; }

  push(id: T, priority: number): void {
    this.ids.push(id); this.priorities.push(priority);
    let index = this.ids.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.priorities[parent]! <= this.priorities[index]!) break;
      this.swap(index, parent);
      index = parent;
    }
  }

  pop(): T {
    const top = this.ids[0]!;
    const lastId = this.ids.pop()!; const lastPriority = this.priorities.pop()!;
    if (this.ids.length > 0) {
      this.ids[0] = lastId; this.priorities[0] = lastPriority;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1; const right = left + 1;
        let smallest = index;
        if (left < this.ids.length && this.priorities[left]! < this.priorities[smallest]!) smallest = left;
        if (right < this.ids.length && this.priorities[right]! < this.priorities[smallest]!) smallest = right;
        if (smallest === index) break;
        this.swap(index, smallest);
        index = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.ids[a], this.ids[b]] = [this.ids[b]!, this.ids[a]!];
    [this.priorities[a], this.priorities[b]] = [this.priorities[b]!, this.priorities[a]!];
  }
}
