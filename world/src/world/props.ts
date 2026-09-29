import type { CollisionWorld } from '../core/collision';
import type { Random } from '../core/random';
import { open } from '../population/placement';
import type { WorldLayout } from './layout';

export type PropKind = 'barrel' | 'jerrycan';

export interface PropPlan { readonly kind: PropKind; readonly x: number; readonly z: number; readonly yaw: number }

/** Footprint (metres) and height of each prop's collision box: barrels are waist-high cover. */
export const PROP_SIZE: Record<PropKind, { readonly width: number; readonly height: number; readonly model: number }> = {
  barrel: { width: 0.62, height: 0.9, model: 0.9 },
  jerrycan: { width: 0.5, height: 0.48, model: 0.5 },
};

/**
 * Oil drums and jerrycans stacked against the houses: a group of one to three drums, often with a can or two
 * beside them. Kept on open, dry ground, clear of doorways and of the player's spawn.
 */
export function planProps(layout: WorldLayout, world: CollisionWorld, random: Random, doors: readonly { x: number; z: number }[], groups = 14): PropPlan[] {
  const props: PropPlan[] = [];
  const clear = (x: number, z: number): boolean => open(world, layout, x, z, 0.5)
    && doors.every((door) => Math.hypot(door.x - x, door.z - z) > 3)
    && Math.hypot(x - layout.spawn.x, z - layout.spawn.z) > 12
    && props.every((prop) => Math.hypot(prop.x - x, prop.z - z) > 0.62);
  for (let attempt = 0; attempt < groups * 12 && props.length < groups * 3 && layout.buildings.length > 0; attempt += 1) {
    const { plan } = random.pick(layout.buildings);
    const angle = random.range(0, Math.PI * 2);
    const reach = Math.max(plan.width, plan.depth) / 2 + random.range(0.8, 2.2);
    const x = plan.x + Math.cos(angle) * reach; const z = plan.z + Math.sin(angle) * reach;
    if (!clear(x, z)) continue;
    const drums = random.int(1, 3);
    const along = angle + Math.PI / 2;
    for (let index = 0; index < drums; index += 1) {
      const dx = x + Math.cos(along) * index * 0.66; const dz = z + Math.sin(along) * index * 0.66;
      if (index === 0 || clear(dx, dz)) props.push({ kind: 'barrel', x: dx, z: dz, yaw: random.range(0, Math.PI * 2) });
    }
    if (random.chance(0.6)) {
      const cx = x - Math.cos(along) * 0.7; const cz = z - Math.sin(along) * 0.7;
      if (clear(cx, cz)) props.push({ kind: 'jerrycan', x: cx, z: cz, yaw: along + random.range(-0.4, 0.4) });
    }
  }
  return props;
}
