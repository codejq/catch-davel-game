import { clamp, type CollisionWorld, type Vec3 } from '../core/collision';
import type { Random } from '../core/random';
import type { Stance } from '../player/body';

export type SentryMode = 'patrol' | 'suspicious' | 'alert' | 'search' | 'dead';

/** Robots are 1.8x human size (about three and a half metres tall) so they read clearly through the scope at range. */
const SCALE = 1.8;

export const SENTRY = {
  scale: SCALE,
  radius: 0.45 * SCALE,
  eyeHeight: 1.85 * SCALE,
  headHeight: 1.95 * SCALE,
  headRadius: 0.24 * SCALE,
  bodyHalfWidth: 0.45 * SCALE,
  bodyBottom: 0.75 * SCALE,
  bodyTop: 1.65 * SCALE,
  sightRange: 95,
  fieldOfView: Math.PI * 0.62,
  patrolSpeed: 1.35,
  huntSpeed: 2.6,
  health: 100,
  fireInterval: 1.2,
  damage: 12,
  /** Robot rifles only hurt at close quarters; beyond this they close in instead of shooting. */
  effectiveRange: 10,
  /** How close an alerted robot tries to get before it stops to shoot. */
  standoff: 6.5,
  hearingRange: 75,
} as const;

export interface SentryState {
  readonly id: string;
  position: Vec3;
  heading: number;
  readonly waypoints: readonly { readonly x: number; readonly z: number }[];
  waypoint: number;
  readonly guard: boolean;
  mode: SentryMode;
  awareness: number;
  health: number;
  fireCooldown: number;
  lastKnown: { x: number; z: number } | null;
  searchTimer: number;
  sightCheckTimer: number;
  canSeePlayer: boolean;
  /** How much of the player this sentry can see right now, 0..1 (cover and foliage reduce it). */
  exposure: number;
  /** The most exposed point on the player, where this sentry aims. */
  aimPoint: Vec3 | null;
  walkPhase: number;
  deathTime: number;
  /** Seconds since this sentry last fired, for muzzle flash. */
  sinceShot: number;
}

export interface PlayerSnapshot {
  readonly eye: Vec3;
  readonly position: Vec3;
  readonly stance: Stance;
  readonly moving: boolean;
  readonly sprinting: boolean;
  readonly concealed: boolean;
}

export interface SentryShot {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly hit: boolean;
  readonly damage: number;
  /** Where the round struck the world (a tree, wall, or the ground) instead of the player, if it did. */
  readonly impact: Vec3 | null;
}

/** Each layer of leaves between a sentry and a body point lets through this much visibility. */
export const FOLIAGE_TRANSMISSION = 0.3;

/** Points on the player's body that a sentry tries to see: head, chest, both shoulders, and hips. */
export function bodySamples(player: PlayerSnapshot, from: Vec3): Vec3[] {
  const { position } = player;
  const heights = player.stance === 'prone' ? { head: 0.38, chest: 0.25, hips: 0.2 }
    : player.stance === 'crouch' ? { head: 1.08, chest: 0.8, hips: 0.5 } : { head: 1.62, chest: 1.3, hips: 0.95 };
  const awayX = position.x - from.x; const awayZ = position.z - from.z;
  const length = Math.hypot(awayX, awayZ) || 1;
  const sideX = -awayZ / length * 0.28; const sideZ = awayX / length * 0.28;
  return [
    { x: position.x, y: position.y + heights.head, z: position.z },
    { x: position.x, y: position.y + heights.chest, z: position.z },
    { x: position.x + sideX, y: position.y + heights.chest, z: position.z + sideZ },
    { x: position.x - sideX, y: position.y + heights.chest, z: position.z - sideZ },
    { x: position.x, y: position.y + heights.hips, z: position.z },
  ];
}

/**
 * Fraction of the player's body a sentry can see from `eye`: solid cover (tree trunks, walls, rocks) hides a
 * point completely and every layer of foliage in the way thins it out.
 */
export function playerExposure(world: CollisionWorld, eye: Vec3, player: PlayerSnapshot): { exposure: number; aimPoint: Vec3 | null } {
  let total = 0;
  let best = 0;
  let aimPoint: Vec3 | null = null;
  const samples = bodySamples(player, eye);
  for (const sample of samples) {
    if (!world.lineOfSight(eye, sample, (volume) => volume.tag === 'glass')) continue;
    const weight = FOLIAGE_TRANSMISSION ** world.countAlong('cover', eye, sample);
    total += weight;
    if (weight > best) { best = weight; aimPoint = sample; }
  }
  return { exposure: total / samples.length, aimPoint };
}

export function createSentry(id: string, waypoints: readonly { x: number; z: number }[], guard: boolean, world: CollisionWorld): SentryState {
  const start = waypoints[0] ?? { x: 0, z: 0 };
  return {
    id, waypoints, guard, waypoint: 0, mode: 'patrol', awareness: 0, health: SENTRY.health, fireCooldown: 1,
    position: { x: start.x, y: world.terrainHeight(start.x, start.z), z: start.z },
    heading: 0, lastKnown: null, searchTimer: 0, sightCheckTimer: 0, canSeePlayer: false, exposure: 0, aimPoint: null, walkPhase: 0, deathTime: 0, sinceShot: 99,
  };
}

/** How visible the player is to a sentry at `distance` metres (0..1+), before line of sight. */
export function playerVisibility(player: PlayerSnapshot, distance: number): number {
  const stance = player.stance === 'stand' ? 1 : player.stance === 'crouch' ? 0.55 : 0.22;
  const motion = player.sprinting ? 1.35 : player.moving ? 1 : 0.5;
  const cover = player.concealed ? (player.stance === 'stand' ? 0.5 : 0.12) : 1;
  const range = Math.max(0, 1 - distance / SENTRY.sightRange);
  return stance * motion * cover * range ** 1.25;
}

/** Chance that one sentry shot hits the player. */
export function hitChance(player: PlayerSnapshot, distance: number): number {
  const stance = player.stance === 'stand' ? 1 : player.stance === 'crouch' ? 0.7 : 0.4;
  const motion = player.sprinting ? 0.55 : player.moving ? 0.8 : 1;
  const cover = player.concealed ? 0.5 : 1;
  if (distance > SENTRY.effectiveRange) return 0;
  return clamp(0.85 * (1 - distance / (SENTRY.effectiveRange * 2.5)) * stance * motion * cover, 0.1, 0.85);
}

export function sentryHeadPosition(sentry: SentryState): Vec3 {
  return { x: sentry.position.x, y: sentry.position.y + SENTRY.headHeight, z: sentry.position.z };
}

/** Advances one sentry. Returns a shot when it fires at the player. */
export function updateSentry(
  sentry: SentryState, player: PlayerSnapshot, world: CollisionWorld, dt: number, random: Random,
): SentryShot | null {
  sentry.sinceShot += dt;
  if (sentry.mode === 'dead') {
    sentry.deathTime += dt;
    return null;
  }
  const eye = { x: sentry.position.x, y: sentry.position.y + SENTRY.eyeHeight, z: sentry.position.z };
  const toPlayerX = player.eye.x - eye.x;
  const toPlayerZ = player.eye.z - eye.z;
  const distance = Math.hypot(toPlayerX, toPlayerZ, player.eye.y - eye.y);
  const bearing = Math.atan2(toPlayerX, toPlayerZ);
  const facing = Math.abs(angleDifference(bearing, sentry.heading));
  const fieldOfView = sentry.mode === 'alert' ? Math.PI : SENTRY.fieldOfView;

  sentry.sightCheckTimer -= dt;
  if (sentry.sightCheckTimer <= 0) {
    sentry.sightCheckTimer = 0.12 + random.next() * 0.08;
    const inView = distance < SENTRY.sightRange && facing < fieldOfView / 2;
    const seen = inView ? playerExposure(world, eye, player) : { exposure: 0, aimPoint: null };
    sentry.exposure = seen.exposure;
    sentry.aimPoint = seen.aimPoint;
    sentry.canSeePlayer = seen.exposure > 0.06;
  }

  if (sentry.canSeePlayer) {
    const gain = playerVisibility(player, distance) * Math.min(1, sentry.exposure * 1.5) * (sentry.mode === 'alert' ? 4 : 1.7);
    sentry.awareness = Math.min(1.2, sentry.awareness + gain * dt);
    if (sentry.awareness > 0.3) sentry.lastKnown = { x: player.position.x, z: player.position.z };
  } else {
    sentry.awareness = Math.max(0, sentry.awareness - (sentry.mode === 'alert' ? 0.08 : 0.18) * dt);
  }

  if (sentry.awareness >= 1) sentry.mode = 'alert';
  else if (sentry.mode === 'alert' && !sentry.canSeePlayer) { sentry.mode = 'search'; sentry.searchTimer = 14; }
  else if (sentry.mode === 'patrol' && sentry.awareness > 0.35) sentry.mode = 'suspicious';
  else if (sentry.mode === 'suspicious' && sentry.awareness < 0.1) sentry.mode = 'patrol';

  let shot: SentryShot | null = null;
  let target: { x: number; z: number } | null = null;
  let speed = 0;
  switch (sentry.mode) {
    case 'patrol': {
      const waypoint = sentry.waypoints[sentry.waypoint];
      if (waypoint !== undefined && !(sentry.guard && sentry.waypoints.length < 2)) {
        target = waypoint;
        speed = SENTRY.patrolSpeed;
        if (Math.hypot(waypoint.x - sentry.position.x, waypoint.z - sentry.position.z) < 0.8) {
          sentry.waypoint = (sentry.waypoint + 1) % sentry.waypoints.length;
        }
      }
      break;
    }
    case 'suspicious':
      // Stop and stare towards the disturbance.
      sentry.heading = turnToward(sentry.heading, sentry.lastKnown === null ? sentry.heading
        : Math.atan2(sentry.lastKnown.x - sentry.position.x, sentry.lastKnown.z - sentry.position.z), 2 * dt);
      break;
    case 'alert':
      sentry.heading = turnToward(sentry.heading, bearing, 4 * dt);
      sentry.fireCooldown -= dt;
      if (sentry.canSeePlayer && distance <= SENTRY.effectiveRange && sentry.fireCooldown <= 0 && facing < 0.35) {
        sentry.fireCooldown = SENTRY.fireInterval * (0.8 + random.next() * 0.5);
        sentry.sinceShot = 0;
        shot = fireAt(sentry, player, world, eye, distance, random);
      }
      if (!sentry.canSeePlayer && sentry.lastKnown !== null) { target = sentry.lastKnown; speed = SENTRY.huntSpeed; }
      else if (sentry.canSeePlayer && distance > SENTRY.standoff) {
        // Too far to shoot: advance on the player, slowing down once inside firing range.
        target = { x: player.position.x, z: player.position.z };
        speed = distance > SENTRY.effectiveRange ? SENTRY.huntSpeed : SENTRY.patrolSpeed;
      }
      break;
    case 'search':
      sentry.searchTimer -= dt;
      if (sentry.lastKnown !== null && Math.hypot(sentry.lastKnown.x - sentry.position.x, sentry.lastKnown.z - sentry.position.z) > 1.5) {
        target = sentry.lastKnown;
        speed = SENTRY.huntSpeed * 0.7;
      } else {
        sentry.heading += dt * 0.9;
      }
      if (sentry.searchTimer <= 0) { sentry.mode = 'patrol'; sentry.awareness = 0; sentry.lastKnown = null; }
      break;
  }

  if (target !== null && speed > 0) {
    const desired = Math.atan2(target.x - sentry.position.x, target.z - sentry.position.z);
    sentry.heading = turnToward(sentry.heading, desired, 3 * dt);
    const step = speed * dt * Math.max(0, Math.cos(angleDifference(desired, sentry.heading)));
    sentry.position.x += Math.sin(sentry.heading) * step;
    sentry.position.z += Math.cos(sentry.heading) * step;
    world.resolveHorizontal(sentry.position, SENTRY.radius, 2.1, 0.45);
    sentry.walkPhase += step * 2.4;
  }
  sentry.position.y = world.groundHeight(sentry.position.x, sentry.position.z, SENTRY.radius * 0.5, sentry.position.y + 0.3, 0.45);
  return shot;
}

/**
 * Resolves one sentry round. Partly covered players are harder to hit, and the round is traced from the gun to
 * its target so a tree trunk or wall in the way stops it.
 */
function fireAt(sentry: SentryState, player: PlayerSnapshot, world: CollisionWorld, eye: Vec3, distance: number, random: Random): SentryShot {
  const from = { x: eye.x + Math.sin(sentry.heading) * 0.5 * SCALE, y: eye.y - 0.4 * SCALE, z: eye.z + Math.cos(sentry.heading) * 0.5 * SCALE };
  const aim = sentry.aimPoint ?? { x: player.position.x, y: player.position.y + 1, z: player.position.z };
  // Out of effective range a round can never hurt; hitChance is zero there.
  const wantsHit = random.next() < hitChance(player, distance) * Math.min(1, sentry.exposure * 1.3);
  const spread = wantsHit ? 0 : 0.5 + random.next() * 1.2;
  const target = {
    x: aim.x + (random.next() - 0.5) * spread, y: aim.y + (random.next() - 0.5) * spread, z: aim.z + (random.next() - 0.5) * spread,
  };
  const direction = { x: target.x - from.x, y: target.y - from.y, z: target.z - from.z };
  const reach = Math.hypot(direction.x, direction.y, direction.z);
  // Misses fly on past the player; either way the first solid thing on the path stops the round.
  const travel = wantsHit ? reach : reach + 25;
  const blocked = world.raycast(from, direction, wantsHit ? Math.max(0, reach - 0.35) : travel, (volume) => volume.tag === 'glass');
  if (blocked !== null) return { from, to: blocked.point, hit: false, damage: 0, impact: blocked.point };
  const scale = travel / Math.max(reach, 1e-6);
  const to = { x: from.x + direction.x * scale, y: from.y + direction.y * scale, z: from.z + direction.z * scale };
  return { from, to, hit: wantsHit, damage: wantsHit ? SENTRY.damage : 0, impact: null };
}

/** A gunshot alerts every living sentry within hearing range, pointing them roughly at the shooter. */
export function hearGunshot(sentries: readonly SentryState[], origin: Vec3, random: Random): void {
  for (const sentry of sentries) {
    if (sentry.mode === 'dead') continue;
    const distance = Math.hypot(sentry.position.x - origin.x, sentry.position.z - origin.z);
    if (distance > SENTRY.hearingRange) continue;
    const error = distance * 0.18;
    sentry.lastKnown = { x: origin.x + (random.next() - 0.5) * error, z: origin.z + (random.next() - 0.5) * error };
    sentry.awareness = Math.max(sentry.awareness, 0.5 + (1 - distance / SENTRY.hearingRange) * 0.3);
    if (sentry.mode === 'patrol' || sentry.mode === 'suspicious') { sentry.mode = 'search'; sentry.searchTimer = 16; }
  }
}

/** Applies a bullet hit. Returns true when the sentry is destroyed. */
export function damageSentry(sentry: SentryState, damage: number, shooter: Vec3): boolean {
  if (sentry.mode === 'dead') return false;
  sentry.health -= damage;
  sentry.lastKnown = { x: shooter.x, z: shooter.z };
  if (sentry.health <= 0) {
    sentry.mode = 'dead';
    sentry.deathTime = 0;
    return true;
  }
  sentry.awareness = Math.max(sentry.awareness, 0.8);
  if (sentry.mode !== 'alert') { sentry.mode = 'search'; sentry.searchTimer = 18; }
  return false;
}

/** Ray against a sentry's head sphere and body box. Returns distance and whether it was a headshot. */
export function raySentry(origin: Vec3, direction: Vec3, sentry: SentryState): { distance: number; headshot: boolean } | null {
  if (sentry.mode === 'dead') return null;
  const head = sentryHeadPosition(sentry);
  const headDistance = raySphere(origin, direction, head, SENTRY.headRadius);
  const w = SENTRY.bodyHalfWidth;
  const bodyDistance = rayAabb(origin, direction,
    sentry.position.x - w, sentry.position.y + 0.15, sentry.position.z - w,
    sentry.position.x + w, sentry.position.y + SENTRY.bodyTop, sentry.position.z + w);
  if (headDistance !== null && (bodyDistance === null || headDistance <= bodyDistance + 0.05)) return { distance: headDistance, headshot: true };
  if (bodyDistance !== null) return { distance: bodyDistance, headshot: false };
  return null;
}

export function angleDifference(a: number, b: number): number {
  let difference = (a - b) % (Math.PI * 2);
  if (difference > Math.PI) difference -= Math.PI * 2;
  if (difference < -Math.PI) difference += Math.PI * 2;
  return difference;
}

function turnToward(current: number, target: number, maxStep: number): number {
  const difference = angleDifference(target, current);
  return current + clamp(difference, -maxStep, maxStep);
}

function raySphere(origin: Vec3, direction: Vec3, center: Vec3, radius: number): number | null {
  const ox = origin.x - center.x; const oy = origin.y - center.y; const oz = origin.z - center.z;
  const b = ox * direction.x + oy * direction.y + oz * direction.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const discriminant = b * b - c;
  if (discriminant < 0) return null;
  const t = -b - Math.sqrt(discriminant);
  return t >= 0 ? t : null;
}

function rayAabb(origin: Vec3, d: Vec3, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): number | null {
  let tMin = 0; let tMax = Number.POSITIVE_INFINITY;
  for (const [o, dir, min, max] of [[origin.x, d.x, minX, maxX], [origin.y, d.y, minY, maxY], [origin.z, d.z, minZ, maxZ]] as const) {
    if (Math.abs(dir) < 1e-9) { if (o < min || o > max) return null; continue; }
    let t1 = (min - o) / dir; let t2 = (max - o) / dir;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1); tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  return tMin;
}
