// Axis-aligned collision world on top of a heightfield. Buildings, props, and trees register boxes; special
// volumes mark ladders (climbable), cover (bushes and tall grass that hide the player), and portals.

export interface Vec3 { x: number; y: number; z: number }

export type VolumeKind = 'solid' | 'ladder' | 'cover' | 'portal';

export interface Volume {
  readonly id: number;
  readonly kind: VolumeKind;
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
  enabled: boolean;
  /** Free-form tag used by gameplay (door id, ladder facing, owner mesh). */
  tag?: string;
}

export interface RayHit {
  readonly distance: number;
  readonly point: Vec3;
  readonly volume: Volume | null;
}

const CELL = 8;

export class CollisionWorld {
  private readonly volumes: Volume[] = [];
  private readonly grid = new Map<number, Volume[]>();
  private nextId = 1;

  constructor(readonly terrainHeight: (x: number, z: number) => number) {}

  add(
    kind: VolumeKind, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, tag?: string,
  ): Volume {
    const volume: Volume = {
      id: this.nextId++, kind, enabled: true,
      minX: Math.min(minX, maxX), minY: Math.min(minY, maxY), minZ: Math.min(minZ, maxZ),
      maxX: Math.max(minX, maxX), maxY: Math.max(minY, maxY), maxZ: Math.max(minZ, maxZ),
      ...(tag === undefined ? {} : { tag }),
    };
    this.volumes.push(volume);
    for (let cx = Math.floor(volume.minX / CELL); cx <= Math.floor(volume.maxX / CELL); cx += 1) {
      for (let cz = Math.floor(volume.minZ / CELL); cz <= Math.floor(volume.maxZ / CELL); cz += 1) {
        const key = cellKey(cx, cz);
        const bucket = this.grid.get(key);
        if (bucket === undefined) this.grid.set(key, [volume]);
        else bucket.push(volume);
      }
    }
    return volume;
  }

  /** Adds a solid box centred on (x, z) resting on `baseY`. */
  addBox(kind: VolumeKind, x: number, baseY: number, z: number, width: number, height: number, depth: number, tag?: string): Volume {
    return this.add(kind, x - width / 2, baseY, z - depth / 2, x + width / 2, baseY + height, z + depth / 2, tag);
  }

  get count(): number { return this.volumes.length; }

  query(minX: number, minZ: number, maxX: number, maxZ: number, kind?: VolumeKind): Volume[] {
    const found = new Set<Volume>();
    for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx += 1) {
      for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz += 1) {
        for (const volume of this.grid.get(cellKey(cx, cz)) ?? []) {
          if (!volume.enabled || (kind !== undefined && volume.kind !== kind)) continue;
          if (volume.maxX < minX || volume.minX > maxX || volume.maxZ < minZ || volume.minZ > maxZ) continue;
          found.add(volume);
        }
      }
    }
    return [...found];
  }

  /** First enabled volume of `kind` that contains the point. */
  inside(kind: VolumeKind, point: Vec3, margin = 0): Volume | null {
    for (const volume of this.query(point.x - margin, point.z - margin, point.x + margin, point.z + margin, kind)) {
      if (point.y >= volume.minY - margin && point.y <= volume.maxY + margin) return volume;
    }
    return null;
  }

  /**
   * Height of the surface under a circular footprint: the terrain or the highest solid top that is no more than
   * `stepHeight` above the feet (so stairs and kerbs are walkable while walls are not).
   */
  groundHeight(x: number, z: number, radius: number, feetY: number, stepHeight: number): number {
    let ground = this.terrainHeight(x, z);
    for (const volume of this.query(x - radius, z - radius, x + radius, z + radius, 'solid')) {
      if (!circleOverlapsBox(x, z, radius * 0.7, volume)) continue;
      if (volume.maxY <= feetY + stepHeight && volume.maxY > ground) ground = volume.maxY;
    }
    return ground;
  }

  /** Pushes a vertical capsule out of solid boxes it intersects horizontally. */
  resolveHorizontal(position: Vec3, radius: number, height: number, stepHeight: number): boolean {
    let collided = false;
    for (let iteration = 0; iteration < 3; iteration += 1) {
      let moved = false;
      for (const volume of this.query(position.x - radius, position.z - radius, position.x + radius, position.z + radius, 'solid')) {
        if (volume.maxY <= position.y + stepHeight || volume.minY >= position.y + height) continue;
        const nearestX = clamp(position.x, volume.minX, volume.maxX);
        const nearestZ = clamp(position.z, volume.minZ, volume.maxZ);
        let dx = position.x - nearestX;
        let dz = position.z - nearestZ;
        const distanceSq = dx * dx + dz * dz;
        if (distanceSq >= radius * radius) continue;
        if (distanceSq < 1e-10) {
          // Centre is inside the box: leave through the nearest face.
          const exits = [
            [position.x - volume.minX, -1, 0], [volume.maxX - position.x, 1, 0],
            [position.z - volume.minZ, 0, -1], [volume.maxZ - position.z, 0, 1],
          ] as const;
          let best: readonly [number, number, number] = exits[0];
          for (const exit of exits) if (exit[0] < best[0]) best = exit;
          position.x += best[1] * (best[0] + radius);
          position.z += best[2] * (best[0] + radius);
        } else {
          const distance = Math.sqrt(distanceSq);
          dx /= distance;
          dz /= distance;
          position.x += dx * (radius - distance);
          position.z += dz * (radius - distance);
        }
        moved = true;
        collided = true;
      }
      if (!moved) break;
    }
    return collided;
  }

  /** True when a solid box occupies the vertical span above the feet (used to block standing up). */
  blockedAbove(position: Vec3, radius: number, fromHeight: number, toHeight: number): boolean {
    for (const volume of this.query(position.x - radius, position.z - radius, position.x + radius, position.z + radius, 'solid')) {
      if (!circleOverlapsBox(position.x, position.z, radius * 0.9, volume)) continue;
      if (volume.minY < position.y + toHeight && volume.maxY > position.y + fromHeight) return true;
    }
    return false;
  }

  /** Ray against terrain and solid boxes. Returns the nearest hit within `maxDistance`. */
  raycast(origin: Vec3, direction: Vec3, maxDistance: number, ignore?: (volume: Volume) => boolean): RayHit | null {
    const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
    const dx = direction.x / length; const dy = direction.y / length; const dz = direction.z / length;
    let best: RayHit | null = null;
    const endX = origin.x + dx * maxDistance;
    const endZ = origin.z + dz * maxDistance;
    const steps = Math.ceil(maxDistance / CELL) + 1;
    const visited = new Set<number>();
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const sx = origin.x + (endX - origin.x) * t;
      const sz = origin.z + (endZ - origin.z) * t;
      for (let ox = -1; ox <= 1; ox += 1) {
        for (let oz = -1; oz <= 1; oz += 1) {
          for (const volume of this.grid.get(cellKey(Math.floor(sx / CELL) + ox, Math.floor(sz / CELL) + oz)) ?? []) {
            if (visited.has(volume.id)) continue;
            visited.add(volume.id);
            if (!volume.enabled || volume.kind !== 'solid' || ignore?.(volume) === true) continue;
            const distance = rayBox(origin, dx, dy, dz, volume);
            if (distance !== null && distance <= maxDistance && (best === null || distance < best.distance)) {
              best = { distance, point: { x: origin.x + dx * distance, y: origin.y + dy * distance, z: origin.z + dz * distance }, volume };
            }
          }
        }
      }
    }
    const terrainLimit = best?.distance ?? maxDistance;
    let previous = 0;
    for (let distance = 0.5; distance <= terrainLimit; distance += 0.5) {
      const y = origin.y + dy * distance;
      if (y < this.terrainHeight(origin.x + dx * distance, origin.z + dz * distance)) {
        let low = previous; let high = distance;
        for (let refine = 0; refine < 8; refine += 1) {
          const mid = (low + high) / 2;
          if (origin.y + dy * mid < this.terrainHeight(origin.x + dx * mid, origin.z + dz * mid)) high = mid; else low = mid;
        }
        return { distance: high, point: { x: origin.x + dx * high, y: origin.y + dy * high, z: origin.z + dz * high }, volume: null };
      }
      previous = distance;
    }
    return best;
  }

  /** Number of enabled volumes of `kind` that the segment from `from` to `to` passes through. */
  countAlong(kind: VolumeKind, from: Vec3, to: Vec3): number {
    const dx = to.x - from.x; const dy = to.y - from.y; const dz = to.z - from.z;
    const length = Math.hypot(dx, dy, dz);
    if (length < 1e-6) return 0;
    let count = 0;
    for (const volume of this.query(Math.min(from.x, to.x), Math.min(from.z, to.z), Math.max(from.x, to.x), Math.max(from.z, to.z), kind)) {
      const distance = rayBox(from, dx / length, dy / length, dz / length, volume);
      if (distance !== null && distance <= length) count += 1;
    }
    return count;
  }

  /** Clear line of sight between two points (terrain and solid boxes block). */
  lineOfSight(from: Vec3, to: Vec3, ignore?: (volume: Volume) => boolean): boolean {
    const direction = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
    const distance = Math.hypot(direction.x, direction.y, direction.z);
    if (distance < 1e-6) return true;
    const hit = this.raycast(from, direction, distance - 0.05, ignore);
    return hit === null;
  }
}

function cellKey(cx: number, cz: number): number {
  return (cx + 4096) * 8192 + (cz + 4096);
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function circleOverlapsBox(x: number, z: number, radius: number, volume: Volume): boolean {
  const nx = clamp(x, volume.minX, volume.maxX);
  const nz = clamp(z, volume.minZ, volume.maxZ);
  return (x - nx) ** 2 + (z - nz) ** 2 < radius * radius;
}

function rayBox(origin: Vec3, dx: number, dy: number, dz: number, box: Volume): number | null {
  let tMin = 0;
  let tMax = Number.POSITIVE_INFINITY;
  for (const [o, d, min, max] of [
    [origin.x, dx, box.minX, box.maxX], [origin.y, dy, box.minY, box.maxY], [origin.z, dz, box.minZ, box.maxZ],
  ] as const) {
    if (Math.abs(d) < 1e-9) {
      if (o < min || o > max) return null;
      continue;
    }
    let t1 = (min - o) / d;
    let t2 = (max - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  return tMin;
}
