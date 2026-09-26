import { Random } from '../core/random';
import type { BuildingStyle } from './themes';

export type PartRole = 'wall' | 'wall-inner' | 'floor' | 'roof' | 'trim' | 'glass' | 'stairs' | 'metal' | 'wood' | 'fabric';

/** A box in world space. `pitch` tilts visual-only parts (pitched roofs) around the building's local X axis. */
export interface Part {
  readonly x: number; readonly y: number; readonly z: number;
  readonly width: number; readonly height: number; readonly depth: number;
  readonly role: PartRole;
  readonly collide: boolean;
  readonly pitch?: number;
  readonly yaw?: number;
}

export interface DoorPlan {
  readonly id: string;
  /** Hinge position (bottom of the door) in world space. */
  readonly hingeX: number; readonly hingeY: number; readonly hingeZ: number;
  readonly width: number; readonly height: number;
  /** World yaw of the closed door leaf, measured from +X. */
  readonly closedYaw: number;
}

export type ContainerKind = 'crate' | 'cabinet' | 'locker' | 'desk';

export interface ContainerPlan {
  readonly id: string;
  readonly kind: ContainerKind;
  readonly x: number; readonly y: number; readonly z: number;
  readonly width: number; readonly height: number; readonly depth: number;
  readonly yaw: number;
}

export interface LadderPlan {
  readonly x: number; readonly z: number; readonly baseY: number; readonly topY: number;
  readonly yaw: number;
  /** Direction the climber steps off at the top, e.g. "-z". */
  readonly exit: '+x' | '-x' | '+z' | '-z';
}

export interface BuildingPlan {
  readonly id: string;
  readonly x: number; readonly z: number; readonly baseY: number;
  /** Quarter turns (0..3) so walls stay axis-aligned for collision. */
  readonly rotation: 0 | 1 | 2 | 3;
  readonly width: number; readonly depth: number;
  readonly floors: 1 | 2;
  readonly style: BuildingStyle;
  readonly roof: 'pitched' | 'flat';
  readonly seed: string;
}

export interface BuildingParts {
  readonly parts: Part[];
  readonly doors: DoorPlan[];
  readonly containers: ContainerPlan[];
  readonly ladders: LadderPlan[];
}

interface Opening { readonly center: number; readonly width: number; readonly bottom: number; readonly top: number; readonly door?: boolean }

const WALL = 0.25;
const STOREY = 3.2;
const SLAB = 0.22;

/** Generates every box of a building in world space from its plan. */
export function buildBuilding(plan: BuildingPlan): BuildingParts {
  const random = new Random(plan.seed);
  const local: Part[] = [];
  const doors: DoorPlan[] = [];
  const containers: ContainerPlan[] = [];
  const ladders: LadderPlan[] = [];
  const w = plan.width; const d = plan.depth;
  const hw = w / 2; const hd = d / 2;
  const totalHeight = plan.floors * STOREY;
  const windowRow = (floor: number, length: number, avoid: number | null): Opening[] => {
    const openings: Opening[] = [];
    const count = Math.max(1, Math.floor(length / 3.2));
    for (let index = 0; index < count; index += 1) {
      const center = -length / 2 + (index + 0.5) * (length / count);
      if (avoid !== null && Math.abs(center - avoid) < 1.6) continue;
      openings.push({ center, width: 1.1, bottom: floor * STOREY + 1, top: floor * STOREY + 2.15 });
    }
    return openings;
  };
  const doorCenter = random.range(-w / 4, w / 4);
  const backDoor = plan.floors === 1 && random.chance(0.5);

  // Front wall (+z local) with the main door, back wall (-z), and the two side walls.
  const front: Opening[] = [{ center: doorCenter, width: 1.15, bottom: 0, top: 2.25, door: true }];
  const back: Opening[] = backDoor ? [{ center: 0, width: 1.15, bottom: 0, top: 2.25, door: true }] : [];
  for (let floor = 0; floor < plan.floors; floor += 1) {
    // No window directly above the door either: its sill would be built from the ground up and seal the doorway.
    front.push(...windowRow(floor, w - 1, doorCenter));
    back.push(...windowRow(floor, w - 1, floor === 0 && backDoor ? 0 : null));
  }
  const sides: Opening[] = [];
  for (let floor = 0; floor < plan.floors; floor += 1) sides.push(...windowRow(floor, d - 1, null));
  wallAlongX(local, 0, hd - WALL / 2, w, totalHeight, front);
  wallAlongX(local, 0, -hd + WALL / 2, w, totalHeight, back);
  wallAlongZ(local, -hw + WALL / 2, 0, d - WALL * 2, totalHeight, sides);
  wallAlongZ(local, hw - WALL / 2, 0, d - WALL * 2, totalHeight, sides);

  for (const opening of front.filter((candidate) => candidate.door === true)) {
    doors.push(localDoor(`${plan.id}-front`, opening.center - opening.width / 2, hd - WALL / 2, opening.width, 0));
  }
  if (backDoor) doors.push(localDoor(`${plan.id}-back`, 0.575, -hd + WALL / 2, 1.15, Math.PI));

  // Ground floor slab slightly above the plot so it reads as a real floor.
  local.push({ x: 0, y: 0.06, z: 0, width: w - WALL, height: 0.12, depth: d - WALL, role: 'floor', collide: true });
  // Door step.
  local.push({ x: doorCenter, y: 0.03, z: hd + 0.35, width: 1.8, height: 0.12, depth: 0.7, role: 'trim', collide: true });

  if (plan.floors === 2) {
    // Upper floor with a stairwell opening along the left wall, and a staircase underneath it.
    const stairWidth = 1.1;
    const steps = 13;
    const rise = STOREY / steps;
    const run = 0.3;
    const stairStartZ = hd - WALL - 1.2;
    const stairX = -hw + WALL + stairWidth / 2 + 0.05;
    for (let step = 0; step < steps; step += 1) {
      const stepHeight = rise * (step + 1);
      local.push({
        x: stairX, y: stepHeight / 2, z: stairStartZ - step * run - run / 2,
        width: stairWidth, height: stepHeight, depth: run, role: 'stairs', collide: true,
      });
    }
    const wellStart = stairStartZ - steps * run - 0.2;
    const slabY = STOREY - SLAB / 2;
    // Slab split around the stairwell hole.
    const holeMinX = -hw + WALL;
    const holeMaxX = holeMinX + stairWidth + 0.15;
    local.push({ x: (holeMaxX + hw - WALL) / 2, y: slabY, z: 0, width: hw - WALL - holeMaxX, height: SLAB, depth: d - WALL * 2, role: 'floor', collide: true });
    const southDepth = hd - WALL - stairStartZ;
    if (southDepth > 0.05) local.push({ x: (holeMinX + holeMaxX) / 2, y: slabY, z: (stairStartZ + hd - WALL) / 2, width: holeMaxX - holeMinX, height: SLAB, depth: southDepth, role: 'floor', collide: true });
    const northDepth = wellStart - (-hd + WALL);
    if (northDepth > 0.05) local.push({ x: (holeMinX + holeMaxX) / 2, y: slabY, z: (wellStart - hd + WALL) / 2, width: holeMaxX - holeMinX, height: SLAB, depth: northDepth, role: 'floor', collide: true });
    // Railing along the stairwell edge upstairs.
    local.push({ x: holeMaxX + 0.03, y: STOREY + 0.5, z: (wellStart + stairStartZ) / 2, width: 0.06, height: 1, depth: stairStartZ - wellStart, role: 'wood', collide: true });
  }

  if (plan.roof === 'flat') {
    local.push({ x: 0, y: totalHeight + SLAB / 2, z: 0, width: w, height: SLAB, depth: d, role: 'roof', collide: true });
    // Parapet around the roof edge makes a sniper nest.
    local.push({ x: 0, y: totalHeight + SLAB + 0.45, z: hd - 0.12, width: w, height: 0.9, depth: 0.24, role: 'wall', collide: true });
    local.push({ x: 0, y: totalHeight + SLAB + 0.45, z: -hd + 0.12, width: w, height: 0.9, depth: 0.24, role: 'wall', collide: true });
    local.push({ x: -hw + 0.12, y: totalHeight + SLAB + 0.45, z: 0, width: 0.24, height: 0.9, depth: d - 0.48, role: 'wall', collide: true });
    // Leave a gap in the right parapet where the ladder arrives.
    const gap = 1.2;
    const sideLength = (d - 0.48 - gap) / 2;
    local.push({ x: hw - 0.12, y: totalHeight + SLAB + 0.45, z: -gap / 2 - sideLength / 2, width: 0.24, height: 0.9, depth: sideLength, role: 'wall', collide: true });
    local.push({ x: hw - 0.12, y: totalHeight + SLAB + 0.45, z: gap / 2 + sideLength / 2, width: 0.24, height: 0.9, depth: sideLength, role: 'wall', collide: true });
    ladders.push({ x: hw + 0.3, z: 0, baseY: 0, topY: totalHeight + SLAB, yaw: 0, exit: '-x' });
  } else {
    // Pitched roof: two tilted slabs over a ceiling that stops anyone climbing into the attic.
    local.push({ x: 0, y: totalHeight + 0.08, z: 0, width: w, height: 0.16, depth: d, role: 'trim', collide: true });
    const rise = Math.min(2.4, d * 0.32);
    const slope = Math.atan2(rise, d / 2);
    const slab = Math.hypot(rise, d / 2) + 0.5;
    local.push({ x: 0, y: totalHeight + rise / 2 + 0.2, z: d / 4, width: w + 0.8, height: 0.18, depth: slab, role: 'roof', collide: false, pitch: slope });
    local.push({ x: 0, y: totalHeight + rise / 2 + 0.2, z: -d / 4, width: w + 0.8, height: 0.18, depth: slab, role: 'roof', collide: false, pitch: -slope });
    // Gable ends.
    for (const side of [-1, 1] as const) {
      for (let layer = 0; layer < 4; layer += 1) {
        const layerHeight = rise / 4;
        const layerDepth = d * (1 - (layer + 0.5) / 4);
        local.push({ x: side * (hw - WALL / 2), y: totalHeight + layerHeight * (layer + 0.5), z: 0, width: WALL, height: layerHeight, depth: layerDepth, role: 'wall', collide: false });
      }
    }
  }

  // Furniture and searchable containers, kept clear of doors and stairs.
  const containerKinds: readonly ContainerKind[] = plan.style === 'bunker' ? ['locker', 'crate', 'desk'] : ['cabinet', 'crate', 'desk'];
  const containerCount = 1 + plan.floors + (random.chance(0.5) ? 1 : 0);
  for (let index = 0; index < containerCount; index += 1) {
    const kind = containerKinds[index % containerKinds.length]!;
    const floor = plan.floors === 2 && index % 2 === 1 ? 1 : 0;
    const size = kind === 'crate' ? [0.9, 0.8, 0.9] : kind === 'locker' ? [0.8, 1.9, 0.5] : kind === 'desk' ? [1.4, 0.8, 0.7] : [1.1, 1.7, 0.5];
    const againstBack = index % 2 === 0;
    const x = (hw - WALL - 0.9) * (index % 3 === 0 ? 0.55 : -0.1) + random.range(-0.4, 0.4);
    const z = againstBack ? -hd + WALL + size[2]! / 2 + 0.05 : hd - WALL - size[2]! / 2 - 0.9;
    const safeX = floor === 1 || Math.abs(x - doorCenter) > 1.4 ? x : x + 2;
    containers.push({
      id: `${plan.id}-c${index}`, kind,
      x: Math.max(-hw + 1.6, Math.min(hw - 1, safeX)), y: floor * STOREY + (floor === 0 ? 0.12 : 0), z,
      width: size[0]!, height: size[1]!, depth: size[2]!, yaw: againstBack ? 0 : Math.PI,
    });
  }
  // A table and a bed make interiors read as lived-in spaces.
  if (plan.style !== 'bunker') {
    local.push({ x: hw * 0.35, y: 0.12 + 0.76, z: 0.3, width: 1.4, height: 0.06, depth: 0.9, role: 'wood', collide: true });
    for (const [lx, lz] of [[-0.62, -0.38], [0.62, -0.38], [-0.62, 0.38], [0.62, 0.38]] as const) {
      local.push({ x: hw * 0.35 + lx, y: 0.12 + 0.38, z: 0.3 + lz, width: 0.07, height: 0.76, depth: 0.07, role: 'wood', collide: false });
    }
    const bedY = plan.floors === 2 ? STOREY : 0.12;
    local.push({ x: hw - WALL - 1.1, y: bedY + 0.25, z: -hd + WALL + 1.1, width: 1.9, height: 0.5, depth: 1.1, role: 'fabric', collide: true });
  }

  const cos = [1, 0, -1, 0][plan.rotation]!;
  const sin = [0, 1, 0, -1][plan.rotation]!;
  const toWorld = (x: number, z: number): { x: number; z: number } => ({ x: plan.x + x * cos - z * sin, z: plan.z + x * sin + z * cos });
  const quarter = plan.rotation % 2 === 1;
  const yawOffset = -plan.rotation * Math.PI / 2;
  const parts = local.map((part): Part => {
    const position = toWorld(part.x, part.z);
    return {
      ...part,
      x: position.x, y: plan.baseY + part.y, z: position.z,
      width: quarter && part.pitch === undefined ? part.depth : part.width,
      depth: quarter && part.pitch === undefined ? part.width : part.depth,
      ...(part.pitch === undefined ? {} : { yaw: yawOffset }),
    };
  });
  return {
    parts,
    doors: doors.map((door) => {
      const hinge = toWorld(door.hingeX, door.hingeZ);
      return { ...door, hingeX: hinge.x, hingeY: plan.baseY + door.hingeY, hingeZ: hinge.z, closedYaw: door.closedYaw + yawOffset };
    }),
    containers: containers.map((container) => {
      const position = toWorld(container.x, container.z);
      return { ...container, x: position.x, y: plan.baseY + container.y, z: position.z, yaw: container.yaw + yawOffset };
    }),
    ladders: ladders.map((ladder) => {
      const position = toWorld(ladder.x, ladder.z);
      return {
        ...ladder, x: position.x, z: position.z, baseY: plan.baseY + ladder.baseY, topY: plan.baseY + ladder.topY,
        yaw: ladder.yaw + yawOffset, exit: rotateExit(ladder.exit, plan.rotation),
      };
    }),
  };

  function localDoor(id: string, hingeX: number, z: number, width: number, yaw: number): DoorPlan {
    return { id, hingeX, hingeY: 0.12, hingeZ: z, width, height: 2.13, closedYaw: yaw };
  }
}

function wallAlongX(out: Part[], centerX: number, z: number, length: number, height: number, openings: readonly Opening[]): void {
  for (const segment of wallSegments(length, height, openings)) {
    out.push({ x: centerX + segment.center, y: segment.y, z, width: segment.length, height: segment.height, depth: WALL, role: 'wall', collide: true });
  }
  for (const opening of openings) if (opening.door !== true) {
    out.push({ x: centerX + opening.center, y: (opening.bottom + opening.top) / 2, z, width: opening.width, height: opening.top - opening.bottom, depth: 0.04, role: 'glass', collide: false });
  }
}

function wallAlongZ(out: Part[], x: number, centerZ: number, length: number, height: number, openings: readonly Opening[]): void {
  for (const segment of wallSegments(length, height, openings)) {
    out.push({ x, y: segment.y, z: centerZ + segment.center, width: WALL, height: segment.height, depth: segment.length, role: 'wall', collide: true });
  }
  for (const opening of openings) if (opening.door !== true) {
    out.push({ x, y: (opening.bottom + opening.top) / 2, z: centerZ + opening.center, width: 0.04, height: opening.top - opening.bottom, depth: opening.width, role: 'glass', collide: false });
  }
}

interface Segment { readonly center: number; readonly length: number; readonly y: number; readonly height: number }

/** Splits a wall into solid pieces around its openings (full-height piers plus sills and lintels). */
export function wallSegments(length: number, height: number, openings: readonly Opening[]): Segment[] {
  const sorted = [...openings].sort((a, b) => a.center - b.center);
  const segments: Segment[] = [];
  let cursor = -length / 2;
  for (const opening of sorted) {
    const left = opening.center - opening.width / 2;
    const right = opening.center + opening.width / 2;
    if (left > cursor + 0.01) segments.push({ center: (cursor + left) / 2, length: left - cursor, y: height / 2, height });
    if (opening.bottom > 0.01) segments.push({ center: opening.center, length: opening.width, y: opening.bottom / 2, height: opening.bottom });
    if (opening.top < height - 0.01) segments.push({ center: opening.center, length: opening.width, y: (opening.top + height) / 2, height: height - opening.top });
    cursor = Math.max(cursor, right);
  }
  if (cursor < length / 2 - 0.01) segments.push({ center: (cursor + length / 2) / 2, length: length / 2 - cursor, y: height / 2, height });
  return segments;
}

function rotateExit(exit: LadderPlan['exit'], rotation: number): LadderPlan['exit'] {
  const order: LadderPlan['exit'][] = ['+x', '+z', '-x', '-z'];
  return order[(order.indexOf(exit) + rotation) % 4]!;
}

/** A free-standing wooden watchtower: four legs, a railed platform, and a ladder. */
export function buildWatchtower(id: string, x: number, baseY: number, z: number, height = 7): BuildingParts {
  const parts: Part[] = [];
  const half = 1.4;
  for (const [lx, lz] of [[-half, -half], [half, -half], [-half, half], [half, half]] as const) {
    parts.push({ x: x + lx, y: baseY + height / 2, z: z + lz, width: 0.22, height, depth: 0.22, role: 'wood', collide: true });
  }
  parts.push({ x, y: baseY + height, z, width: half * 2 + 0.4, height: 0.16, depth: half * 2 + 0.4, role: 'wood', collide: true });
  for (const [lx, lz, width, depth] of [[0, -half - 0.1, half * 2 + 0.4, 0.08], [-half - 0.1, 0, 0.08, half * 2 + 0.4], [half + 0.1, 0, 0.08, half * 2 + 0.4]] as const) {
    parts.push({ x: x + lx, y: baseY + height + 0.55, z: z + lz, width, height: 0.95, depth, role: 'wood', collide: true });
  }
  // Front rail with a gap for the ladder.
  parts.push({ x: x - 1, y: baseY + height + 0.55, z: z + half + 0.1, width: 1.2, height: 0.95, depth: 0.08, role: 'wood', collide: true });
  parts.push({ x: x + 1, y: baseY + height + 0.55, z: z + half + 0.1, width: 1.2, height: 0.95, depth: 0.08, role: 'wood', collide: true });
  // Roof.
  for (const [lx, lz] of [[-half, -half], [half, -half], [-half, half], [half, half]] as const) {
    parts.push({ x: x + lx, y: baseY + height + 1.2, z: z + lz, width: 0.12, height: 2.2, depth: 0.12, role: 'wood', collide: false });
  }
  parts.push({ x, y: baseY + height + 2.35, z, width: half * 2 + 1, height: 0.14, depth: half * 2 + 1, role: 'roof', collide: false });
  return {
    parts, doors: [], containers: [{ id: `${id}-c0`, kind: 'crate', x: x - 0.6, y: baseY + height + 0.08, z: z - 0.6, width: 0.8, height: 0.6, depth: 0.8, yaw: 0 }],
    ladders: [{ x, z: z + half + 0.35, baseY, topY: baseY + height + 0.08, yaw: 0, exit: '-z' }],
  };
}
