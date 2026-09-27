import { clamp, type CollisionWorld, type Vec3 } from '../core/collision';
import type { Random } from '../core/random';

/** What a family member does when nothing is wrong. */
export type CalmActivity = 'eat' | 'idle' | 'stroll';

export interface CivilianLook {
  readonly skin: number; readonly hair: number; readonly shirt: number; readonly pants: number; readonly shoes: number;
  readonly longHair: boolean;
}

/**
 * A civilian or a family dog. Innocents never attack anyone; when danger comes near they panic, and each reacts in
 * character: brave ones run for cover and hide, timid ones freeze where they are, and after a while everyone
 * creeps back home and carries on.
 */
export interface Civilian {
  readonly id: string;
  readonly kind: 'adult' | 'child' | 'dog';
  readonly family: number;
  readonly look: CivilianLook;
  readonly home: { readonly x: number; readonly z: number; readonly heading: number };
  readonly activity: CalmActivity;
  /** Picnic seat for diners: where they sit and which way they face. */
  readonly seat: { readonly x: number; readonly y: number; readonly z: number; readonly heading: number } | null;
  /** Dogs follow this family member around. */
  readonly owner: string | null;
  /** 0..1: how likely to run for cover rather than freeze on the spot. */
  readonly bravery: number;
  /** 0..1: how cheerful (waves and bounces more) while calm. */
  readonly cheer: number;
  position: Vec3;
  heading: number;
  mode: 'calm' | 'flee' | 'hide' | 'return' | 'dead';
  target: { x: number; z: number } | null;
  threat: { x: number; z: number } | null;
  timer: number;
  /** Walk cycle phase and smoothed speed, for animation. */
  walkPhase: number;
  speed: number;
  deathTime: number;
  /** Seconds until the next change of calm behaviour (a new stroll point, a look around). */
  idleTimer: number;
}

export const CIVILIAN = {
  walk: 1.3, run: 4.6, childRun: 3.9, dogRun: 6.2,
  radius: 0.28,
  /** Height of the body box for hit tests (adults; children and dogs are scaled). */
  height: 1.72,
  /** Danger this close sets off a panic. */
  gunshotPanicRange: 45,
  robotPanicRange: 12,
  hideRadius: 24,
} as const;

export function bodyHeight(civilian: Civilian): number {
  return civilian.kind === 'adult' ? CIVILIAN.height : civilian.kind === 'child' ? CIVILIAN.height * 0.64 : 0.62;
}

/** Something frightening happened at `threat`: panic, unless already safely hidden from something far off. */
export function alarm(civilian: Civilian, threat: { x: number; z: number }, random: Random): void {
  if (civilian.mode === 'dead') return;
  const distance = Math.hypot(threat.x - civilian.position.x, threat.z - civilian.position.z);
  if ((civilian.mode === 'hide' || civilian.mode === 'flee') && distance > 10) {
    civilian.timer = Math.max(civilian.timer, 6);
    return;
  }
  civilian.threat = { x: threat.x, z: threat.z };
  if (civilian.kind !== 'dog' && random.next() > civilian.bravery) {
    // Freeze: crouch down on the spot, hands over the head.
    civilian.mode = 'hide';
    civilian.target = null;
    civilian.timer = 5 + random.next() * 6;
    return;
  }
  civilian.mode = 'flee';
  civilian.target = null;
  civilian.timer = 10;
}

/** Advances one innocent for a frame. `owner` is the family member a dog follows. */
export function updateCivilian(civilian: Civilian, dt: number, world: CollisionWorld, random: Random, owner: Civilian | null): void {
  if (civilian.mode === 'dead') { civilian.deathTime += dt; return; }
  civilian.timer -= dt;
  let goal: { x: number; z: number } | null = null;
  let pace = 0;
  const run = civilian.kind === 'dog' ? CIVILIAN.dogRun : civilian.kind === 'child' ? CIVILIAN.childRun : CIVILIAN.run;

  switch (civilian.mode) {
    case 'flee': {
      if (civilian.target === null) {
        const threat = civilian.threat ?? civilian.position;
        civilian.target = findHidingSpot(world, civilian.position, { x: threat.x, y: civilian.position.y + 1.4, z: threat.z }, CIVILIAN.hideRadius)
          ?? awayFrom(civilian.position, threat, 14 + random.next() * 8);
      }
      goal = civilian.target;
      pace = run;
      if (Math.hypot(goal.x - civilian.position.x, goal.z - civilian.position.z) < 0.7 || civilian.timer <= 0) {
        civilian.mode = 'hide';
        civilian.timer = (civilian.kind === 'dog' ? 4 : 7) + random.next() * 8;
      }
      break;
    }
    case 'hide':
      // Crouched in cover; peek at the threat now and then.
      if (civilian.threat !== null) civilian.heading = turn(civilian.heading, Math.atan2(civilian.threat.x - civilian.position.x, civilian.threat.z - civilian.position.z), 2 * dt);
      if (civilian.timer <= 0) { civilian.mode = 'return'; civilian.threat = null; }
      break;
    case 'return': {
      const home = homeSpot(civilian, owner);
      goal = home;
      pace = CIVILIAN.walk * (civilian.kind === 'dog' ? 1.6 : 1);
      if (Math.hypot(home.x - civilian.position.x, home.z - civilian.position.z) < 0.5) civilian.mode = 'calm';
      break;
    }
    case 'calm':
      ({ goal, pace } = calm(civilian, dt, random, owner));
      break;
  }

  let moved = 0;
  if (goal !== null && pace > 0) {
    const dx = goal.x - civilian.position.x; const dz = goal.z - civilian.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.15) {
      civilian.heading = turn(civilian.heading, Math.atan2(dx, dz), 8 * dt);
      moved = Math.min(distance, pace * dt);
      civilian.position.x += dx / distance * moved;
      civilian.position.z += dz / distance * moved;
      world.resolveHorizontal(civilian.position, CIVILIAN.radius, bodyHeight(civilian), 0.42);
    }
  }
  civilian.speed += (moved / Math.max(dt, 1e-6) - civilian.speed) * Math.min(1, dt * 8);
  civilian.walkPhase += moved * (civilian.kind === 'dog' ? 5 : civilian.kind === 'child' ? 4.2 : 3.2);
  if (civilian.mode === 'calm' && civilian.activity === 'eat' && civilian.seat !== null && moved === 0) {
    civilian.position.y = civilian.seat.y;
  } else {
    civilian.position.y = world.groundHeight(civilian.position.x, civilian.position.z, CIVILIAN.radius * 0.5, civilian.position.y + 0.3, 0.42);
  }
}

/** Calm behaviour: diners stay seated, strollers wander about home, dogs trot after their owner. */
function calm(civilian: Civilian, dt: number, random: Random, owner: Civilian | null): { goal: { x: number; z: number } | null; pace: number } {
  civilian.idleTimer -= dt;
  if (civilian.kind === 'dog' && owner !== null && owner.mode !== 'dead') {
    const gap = Math.hypot(owner.position.x - civilian.position.x, owner.position.z - civilian.position.z);
    if (gap > 3.5) return { goal: { x: owner.position.x + Math.sin(owner.heading + 2) * 1.2, z: owner.position.z + Math.cos(owner.heading + 2) * 1.2 }, pace: gap > 8 ? CIVILIAN.dogRun * 0.6 : CIVILIAN.walk * 1.5 };
  }
  if (civilian.activity === 'eat' && civilian.seat !== null) {
    const seat = civilian.seat;
    if (Math.hypot(seat.x - civilian.position.x, seat.z - civilian.position.z) > 0.2) return { goal: seat, pace: CIVILIAN.walk };
    civilian.heading = turn(civilian.heading, seat.heading, 3 * dt);
    return { goal: null, pace: 0 };
  }
  if (civilian.activity === 'stroll' || civilian.kind === 'dog') {
    if (civilian.target === null || civilian.idleTimer <= 0) {
      civilian.idleTimer = 3 + random.next() * 6;
      const angle = random.next() * Math.PI * 2; const reach = 1.5 + random.next() * (civilian.kind === 'dog' ? 5 : 7);
      const centre = civilian.kind === 'dog' && owner !== null ? owner.position : civilian.home;
      // Now and then just stand and look about instead.
      civilian.target = random.chance(0.35) ? null : { x: centre.x + Math.cos(angle) * reach, z: centre.z + Math.sin(angle) * reach };
    }
    if (civilian.target !== null && Math.hypot(civilian.target.x - civilian.position.x, civilian.target.z - civilian.position.z) < 0.3) civilian.target = null;
    return { goal: civilian.target, pace: civilian.kind === 'dog' ? CIVILIAN.walk * 1.4 : CIVILIAN.walk };
  }
  // Idle: stand chatting by home, turning to look about now and then.
  if (Math.hypot(civilian.home.x - civilian.position.x, civilian.home.z - civilian.position.z) > 0.4) return { goal: civilian.home, pace: CIVILIAN.walk };
  if (civilian.idleTimer <= 0) { civilian.idleTimer = 2 + random.next() * 5; civilian.target = null; }
  civilian.heading = turn(civilian.heading, civilian.home.heading + Math.sin(civilian.idleTimer * 0.7) * 0.8, 1.5 * dt);
  return { goal: null, pace: 0 };
}

function homeSpot(civilian: Civilian, owner: Civilian | null): { x: number; z: number } {
  if (civilian.kind === 'dog' && owner !== null && owner.mode !== 'dead') return { x: owner.position.x + 1, z: owner.position.z + 1 };
  return civilian.seat ?? civilian.home;
}

function awayFrom(from: Vec3, threat: { x: number; z: number }, distance: number): { x: number; z: number } {
  const dx = from.x - threat.x; const dz = from.z - threat.z;
  const length = Math.hypot(dx, dz) || 1;
  return { x: from.x + dx / length * distance, z: from.z + dz / length * distance };
}

function turn(current: number, target: number, maxStep: number): number {
  let difference = (target - current) % (Math.PI * 2);
  if (difference > Math.PI) difference -= Math.PI * 2;
  if (difference < -Math.PI) difference += Math.PI * 2;
  return current + clamp(difference, -maxStep, maxStep);
}

/** A spot behind a trunk, rock, or wall that hides someone standing at `from` from `threat`, nearest first. */
export function findHidingSpot(world: CollisionWorld, from: Vec3, threat: Vec3, radius: number): { x: number; z: number } | null {
  let best: { x: number; z: number } | null = null;
  let bestTravel = Number.POSITIVE_INFINITY;
  const volumes = world.query(from.x - radius, from.z - radius, from.x + radius, from.z + radius, 'solid')
    .filter((volume) => volume.enabled && volume.tag !== 'glass' && volume.maxY - volume.minY > 1.4 && volume.maxX - volume.minX < 14 && volume.maxZ - volume.minZ < 14);
  for (const volume of volumes) {
    const centerX = (volume.minX + volume.maxX) / 2; const centerZ = (volume.minZ + volume.maxZ) / 2;
    const awayX = centerX - threat.x; const awayZ = centerZ - threat.z;
    const length = Math.hypot(awayX, awayZ) || 1;
    const reach = Math.max(volume.maxX - volume.minX, volume.maxZ - volume.minZ) / 2 + 0.55;
    const spot = { x: centerX + awayX / length * reach, z: centerZ + awayZ / length * reach };
    const travel = Math.hypot(spot.x - from.x, spot.z - from.z);
    if (travel > radius || travel >= bestTravel) continue;
    const ground = world.groundHeight(spot.x, spot.z, 0.2, from.y + 0.5, 0.42);
    if (world.inside('solid', { x: spot.x, y: ground + 0.9, z: spot.z }, 0.2) !== null) continue;
    if (world.lineOfSight(threat, { x: spot.x, y: ground + 0.9, z: spot.z }, (candidate) => candidate.tag === 'glass')) continue;
    bestTravel = travel;
    best = spot;
  }
  return best;
}

/** Ray against an innocent's body box (standing, crouched, sitting, or a dog). */
export function rayCivilian(origin: Vec3, direction: Vec3, civilian: Civilian): number | null {
  if (civilian.mode === 'dead') return null;
  const low = civilian.mode === 'hide' ? 0.55 : civilian.mode === 'calm' && civilian.activity === 'eat' ? 0.8 : 1;
  const top = civilian.position.y + bodyHeight(civilian) * low;
  const half = civilian.kind === 'dog' ? 0.45 : 0.27;
  const base = civilian.position.y;
  let near = -Infinity; let far = Infinity;
  const bounds = [[origin.x, direction.x, civilian.position.x - half, civilian.position.x + half], [origin.y, direction.y, base, top], [origin.z, direction.z, civilian.position.z - half, civilian.position.z + half]] as const;
  for (const [o, d, min, max] of bounds) {
    if (Math.abs(d) < 1e-9) { if (o < min || o > max) return null; continue; }
    let t1 = (min - o) / d; let t2 = (max - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    near = Math.max(near, t1); far = Math.min(far, t2);
    if (near > far) return null;
  }
  return far < 0 ? null : Math.max(0, near);
}
