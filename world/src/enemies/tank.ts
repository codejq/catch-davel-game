import { clamp, type CollisionWorld, type Vec3 } from '../core/collision';
import type { Random } from '../core/random';
import { angleDifference, playerExposure, playerVisibility, type PlayerSnapshot } from './sentry';

export const TANK = {
  /** Hull half-extents (metres) in the tank's own frame: x across, z along the barrel direction. */
  halfWidth: 1.7,
  halfLength: 2.9,
  hullHeight: 1.5,
  /** Height of the gunner's sights and the barrel. */
  eyeHeight: 2.5,
  health: 400,
  speed: 3.4,
  turnRate: 0.55,
  turretRate: 0.8,
  sightRange: 85,
  /** Shells only hurt when fired at this range or closer. */
  fireRange: 35,
  fireInterval: 4.2,
  shellSpeed: 140,
  splashRadius: 3.5,
  splashDamage: 32,
  hearingRange: 90,
} as const;

export interface TankState {
  readonly id: string;
  position: Vec3;
  /** Hull heading (radians, 0 = +Z like the robots). */
  heading: number;
  /** Turret heading in world space. */
  turret: number;
  readonly route: readonly { readonly x: number; readonly z: number }[];
  waypoint: number;
  /** +1 driving forward along the route, -1 back. */
  direction: 1 | -1;
  mode: 'patrol' | 'alert' | 'dead';
  health: number;
  awareness: number;
  lastKnown: { x: number; z: number } | null;
  sightTimer: number;
  canSeePlayer: boolean;
  sinceSeen: number;
  fireCooldown: number;
  sinceShot: number;
  deathTime: number;
  /** Distance driven, for track animation. */
  odometer: number;
}

/** A shell in flight: where it left the barrel and where it will burst. */
export interface TankShell {
  readonly from: Vec3;
  readonly to: Vec3;
  /** Seconds until it lands. */
  readonly flight: number;
}

export function createTank(id: string, route: readonly { x: number; z: number }[], world: CollisionWorld, start = 0): TankState {
  const index = Math.min(start, Math.max(0, route.length - 1));
  const at = route[index] ?? { x: 0, z: 0 };
  const next = route[Math.min(index + 1, route.length - 1)] ?? at;
  const heading = Math.atan2(next.x - at.x, next.z - at.z);
  return {
    id, route, waypoint: Math.min(index + 1, route.length - 1), direction: 1,
    position: { x: at.x, y: world.terrainHeight(at.x, at.z), z: at.z },
    heading, turret: heading, mode: 'patrol', health: TANK.health, awareness: 0, lastKnown: null,
    sightTimer: 0, canSeePlayer: false, sinceSeen: 99, fireCooldown: 2, sinceShot: 99, deathTime: 0, odometer: 0,
  };
}

export function tankGunPosition(tank: TankState): Vec3 {
  return {
    x: tank.position.x + Math.sin(tank.turret) * 3.6,
    y: tank.position.y + TANK.eyeHeight - 0.15,
    z: tank.position.z + Math.cos(tank.turret) * 3.6,
  };
}

/** Advances a tank: drives its route, hunts the player once seen, and returns a shell when it fires. */
export function updateTank(tank: TankState, player: PlayerSnapshot, world: CollisionWorld, dt: number, random: Random): TankShell | null {
  tank.sinceShot += dt;
  if (tank.mode === 'dead') { tank.deathTime += dt; return null; }
  const eye = { x: tank.position.x, y: tank.position.y + TANK.eyeHeight, z: tank.position.z };
  const distance = Math.hypot(player.eye.x - eye.x, player.eye.z - eye.z);

  tank.sightTimer -= dt;
  if (tank.sightTimer <= 0) {
    tank.sightTimer = 0.25 + random.next() * 0.1;
    tank.canSeePlayer = distance < TANK.sightRange && playerExposure(world, eye, player).exposure > 0.08;
  }
  tank.sinceSeen = tank.canSeePlayer ? 0 : tank.sinceSeen + dt;
  if (tank.canSeePlayer) {
    tank.awareness = Math.min(1.2, tank.awareness + playerVisibility(player, distance * 0.8) * 2.2 * dt);
    if (tank.awareness > 0.4) tank.lastKnown = { x: player.position.x, z: player.position.z };
  } else {
    tank.awareness = Math.max(0, tank.awareness - 0.06 * dt);
  }
  if (tank.awareness >= 1) tank.mode = 'alert';
  else if (tank.mode === 'alert' && tank.sinceSeen > 12) tank.mode = 'patrol';

  let shell: TankShell | null = null;
  // Turret: onto the player when hunting, back along the hull when not.
  const turretGoal = tank.mode === 'alert' && tank.lastKnown !== null
    ? Math.atan2(tank.lastKnown.x - tank.position.x, tank.lastKnown.z - tank.position.z) : tank.heading;
  tank.turret += clamp(angleDifference(turretGoal, tank.turret), -TANK.turretRate * dt, TANK.turretRate * dt);

  let drive: number = TANK.speed;
  if (tank.mode === 'alert') {
    // Halt to fire when in range, otherwise creep closer along the route.
    drive = distance <= TANK.fireRange ? 0 : TANK.speed * 0.6;
    tank.fireCooldown -= dt;
    const aligned = Math.abs(angleDifference(turretGoal, tank.turret)) < 0.05;
    if (tank.canSeePlayer && aligned && distance <= TANK.fireRange && tank.fireCooldown <= 0) {
      tank.fireCooldown = TANK.fireInterval * (0.85 + random.next() * 0.4);
      tank.sinceShot = 0;
      shell = fireShell(tank, player, world, random);
    }
  }
  if (drive > 0 && tank.route.length > 1) {
    const target = tank.route[tank.waypoint]!;
    const desired = Math.atan2(target.x - tank.position.x, target.z - tank.position.z);
    const turn = angleDifference(desired, tank.heading);
    tank.heading += clamp(turn, -TANK.turnRate * dt, TANK.turnRate * dt);
    // Tracks pivot slowly on the spot for sharp turns.
    const step = drive * dt * Math.max(0.15, Math.cos(turn));
    tank.position.x += Math.sin(tank.heading) * step;
    tank.position.z += Math.cos(tank.heading) * step;
    tank.odometer += step;
    if (Math.hypot(target.x - tank.position.x, target.z - tank.position.z) < 2.5) {
      const next = tank.waypoint + tank.direction;
      if (next < 0 || next >= tank.route.length) tank.direction = tank.direction === 1 ? -1 : 1;
      tank.waypoint = clamp(tank.waypoint + tank.direction, 0, tank.route.length - 1);
    }
  }
  tank.position.y = world.terrainHeight(tank.position.x, tank.position.z);
  return shell;
}

/** The gunner leads a little and misses by a few metres; the first solid thing on the way stops the shell. */
function fireShell(tank: TankState, player: PlayerSnapshot, world: CollisionWorld, random: Random): TankShell {
  const from = tankGunPosition(tank);
  const scatter = player.moving ? 3.2 : 1.8;
  const aim = {
    x: player.position.x + (random.next() - 0.5) * scatter,
    y: player.position.y + 0.3,
    z: player.position.z + (random.next() - 0.5) * scatter,
  };
  const direction = { x: aim.x - from.x, y: aim.y - from.y, z: aim.z - from.z };
  const reach = Math.hypot(direction.x, direction.y, direction.z);
  const blocked = world.raycast(from, direction, reach, (volume) => volume.tag === 'glass');
  const to = blocked?.point ?? aim;
  return { from, to, flight: Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) / TANK.shellSpeed };
}

/** Damage a shell bursting at `impact` does to someone standing at `point` (full at the centre, none at the edge). */
export function splashDamage(impact: Vec3, point: Vec3): number {
  const distance = Math.hypot(point.x - impact.x, (point.y - impact.y) * 0.6, point.z - impact.z);
  if (distance >= TANK.splashRadius) return 0;
  return TANK.splashDamage * (1 - distance / TANK.splashRadius);
}

/** Ray against the tank's hull and turret, in the tank's own rotated frame. */
export function rayTank(origin: Vec3, direction: Vec3, tank: TankState): number | null {
  if (tank.mode === 'dead') return null;
  const cos = Math.cos(-tank.heading); const sin = Math.sin(-tank.heading);
  const ox = origin.x - tank.position.x; const oz = origin.z - tank.position.z;
  const local = { x: ox * cos + oz * sin, y: origin.y - tank.position.y, z: -ox * sin + oz * cos };
  const dir = { x: direction.x * cos + direction.z * sin, y: direction.y, z: -direction.x * sin + direction.z * cos };
  const hull = slab(local, dir, -TANK.halfWidth, 0.2, -TANK.halfLength, TANK.halfWidth, TANK.hullHeight, TANK.halfLength);
  const turret = slab(local, dir, -1.2, TANK.hullHeight, -1.3, 1.2, TANK.hullHeight + 0.9, 1.2);
  if (hull === null) return turret;
  if (turret === null) return hull;
  return Math.min(hull, turret);
}

function slab(origin: Vec3, direction: Vec3, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): number | null {
  let near = -Infinity; let far = Infinity;
  for (const [o, d, min, max] of [[origin.x, direction.x, minX, maxX], [origin.y, direction.y, minY, maxY], [origin.z, direction.z, minZ, maxZ]] as const) {
    if (Math.abs(d) < 1e-9) { if (o < min || o > max) return null; continue; }
    let t1 = (min - o) / d; let t2 = (max - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    near = Math.max(near, t1); far = Math.min(far, t2);
    if (near > far) return null;
  }
  if (far < 0) return null;
  return Math.max(0, near);
}

/** Pushes a point (the player) out of a tank's hull footprint. */
export function pushOutOfTank(point: Vec3, radius: number, tank: TankState): boolean {
  const cos = Math.cos(-tank.heading); const sin = Math.sin(-tank.heading);
  const ox = point.x - tank.position.x; const oz = point.z - tank.position.z;
  let lx = ox * cos + oz * sin; let lz = -ox * sin + oz * cos;
  const halfX = TANK.halfWidth + radius; const halfZ = TANK.halfLength + radius;
  if (Math.abs(lx) >= halfX || Math.abs(lz) >= halfZ || point.y > tank.position.y + TANK.hullHeight + 1) return false;
  if (halfX - Math.abs(lx) < halfZ - Math.abs(lz)) lx = Math.sign(lx || 1) * halfX; else lz = Math.sign(lz || 1) * halfZ;
  // Back to world space.
  point.x = tank.position.x + lx * Math.cos(tank.heading) + lz * Math.sin(tank.heading);
  point.z = tank.position.z - lx * Math.sin(tank.heading) + lz * Math.cos(tank.heading);
  return true;
}

/** A tank struck by a round: it knows where the shot came from. Returns true when destroyed. */
export function damageTank(tank: TankState, damage: number, shooter: Vec3): boolean {
  if (tank.mode === 'dead') return false;
  tank.health -= damage;
  tank.lastKnown = { x: shooter.x, z: shooter.z };
  tank.awareness = Math.max(tank.awareness, 1);
  tank.mode = 'alert';
  if (tank.health <= 0) { tank.mode = 'dead'; tank.deathTime = 0; return true; }
  return false;
}

/** Tanks hear gunshots too and swing their turret round. */
export function tankHearsGunshot(tank: TankState, origin: Vec3): void {
  if (tank.mode === 'dead') return;
  if (Math.hypot(tank.position.x - origin.x, tank.position.z - origin.z) > TANK.hearingRange) return;
  tank.lastKnown = { x: origin.x, z: origin.z };
  tank.awareness = Math.max(tank.awareness, 0.7);
}
