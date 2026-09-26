import { fbm, seedOf, valueNoise } from '../core/noise';
import type { WorldTheme } from './themes';

export interface FlatSite {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}

export interface Road {
  readonly points: readonly { readonly x: number; readonly z: number }[];
  readonly width: number;
}

const CELL = 1.5;

/** Heightfield terrain: rolling hills, a mountain rim at the map edge, and flattened building plots and roads. */
export class Terrain {
  readonly resolution: number;
  readonly heights: Float32Array;
  /** 0..1 per vertex: how much the vertex belongs to a dirt road or yard (drives the ground colour). */
  readonly pathMask: Float32Array;
  readonly half: number;

  private constructor(readonly theme: WorldTheme) {
    this.half = theme.size / 2;
    this.resolution = Math.round(theme.size / CELL) + 1;
    this.heights = new Float32Array(this.resolution * this.resolution);
    this.pathMask = new Float32Array(this.resolution * this.resolution);
  }

  /** Raw procedural height before plots and roads are carved in. */
  static baseHeight(theme: WorldTheme, x: number, z: number): number {
    const seed = seedOf(theme.seed);
    const half = theme.size / 2;
    let height = (fbm(x / 90, z / 90, seed, 5) - 0.45) * theme.hills * 2;
    height += (valueNoise(x / 22, z / 22, seed + 7) - 0.5) * theme.hills * 0.18;
    if (theme.id === 'dust-ridge') height += Math.sin(x / 19 + fbm(x / 60, z / 60, seed + 3) * 6) * 1.4;
    const edge = Math.max(Math.abs(x), Math.abs(z)) / half;
    const rim = Math.max(0, (edge - 0.72) / 0.28);
    height += rim * rim * theme.mountainRim * (0.6 + fbm(x / 40, z / 40, seed + 11, 4) * 0.8);
    return height;
  }

  static generate(theme: WorldTheme, sites: readonly FlatSite[], roads: readonly Road[]): Terrain {
    const terrain = new Terrain(theme);
    const siteHeights = sites.map((site) => Terrain.baseHeight(theme, site.x, site.z));
    for (let row = 0; row < terrain.resolution; row += 1) {
      for (let column = 0; column < terrain.resolution; column += 1) {
        const x = -terrain.half + column * CELL;
        const z = -terrain.half + row * CELL;
        let height = Terrain.baseHeight(theme, x, z);
        let path = 0;
        // Roads first, then building plots flattened over them, so no road lifts the ground above a doorstep.
        for (const road of roads) {
          const distance = distanceToPolyline(x, z, road.points);
          const blend = 1 - smoothstep(road.width * 0.5, road.width * 0.5 + 4, distance);
          if (blend > 0) {
            const smoothHeight = Terrain.baseHeight(theme, x, z) * 0.35 + height * 0.65;
            height += (smoothHeight - height) * blend * 0.6;
            path = Math.max(path, 1 - smoothstep(road.width * 0.35, road.width * 0.5 + 0.8, distance));
          }
        }
        // Later sites (village square, portal, towers) blend in first; the house plots listed first go last so
        // each house keeps its own level ground right up to its doorstep.
        for (let index = sites.length - 1; index >= 0; index -= 1) {
          const site = sites[index]!;
          const distance = Math.hypot(x - site.x, z - site.z);
          const blend = 1 - smoothstep(site.radius, site.radius + 10, distance);
          height += (siteHeights[index]! - height) * blend;
          path = Math.max(path, (1 - smoothstep(site.radius * 0.6, site.radius + 2, distance)) * 0.75);
        }
        const index = row * terrain.resolution + column;
        terrain.heights[index] = height;
        terrain.pathMask[index] = path;
      }
    }
    return terrain;
  }

  get cellSize(): number { return CELL; }

  heightAt(x: number, z: number): number {
    const fx = (x + this.half) / CELL;
    const fz = (z + this.half) / CELL;
    const max = this.resolution - 1;
    const cx = Math.max(0, Math.min(max - 1, Math.floor(fx)));
    const cz = Math.max(0, Math.min(max - 1, Math.floor(fz)));
    const tx = Math.max(0, Math.min(1, fx - cx));
    const tz = Math.max(0, Math.min(1, fz - cz));
    const h00 = this.heights[cz * this.resolution + cx]!;
    const h10 = this.heights[cz * this.resolution + cx + 1]!;
    const h01 = this.heights[(cz + 1) * this.resolution + cx]!;
    const h11 = this.heights[(cz + 1) * this.resolution + cx + 1]!;
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  }

  slopeAt(x: number, z: number): number {
    const dx = this.heightAt(x + 1, z) - this.heightAt(x - 1, z);
    const dz = this.heightAt(x, z + 1) - this.heightAt(x, z - 1);
    return Math.hypot(dx, dz) / 2;
  }

  pathAt(x: number, z: number): number {
    const column = Math.round((x + this.half) / CELL);
    const row = Math.round((z + this.half) / CELL);
    if (column < 0 || row < 0 || column >= this.resolution || row >= this.resolution) return 0;
    return this.pathMask[row * this.resolution + column]!;
  }

  /** The walkable play area stops before the mountain rim. */
  get playableHalf(): number { return this.half * 0.8; }
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function distanceToPolyline(x: number, z: number, points: readonly { readonly x: number; readonly z: number }[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    const abx = b.x - a.x; const abz = b.z - a.z;
    const lengthSq = abx * abx + abz * abz || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / lengthSq));
    best = Math.min(best, Math.hypot(x - (a.x + abx * t), z - (a.z + abz * t)));
  }
  return best;
}
