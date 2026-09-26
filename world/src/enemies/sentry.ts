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
  huntSpeed: 3.2,
  health: 100,
  fireInterval: 1.2,
  damage: 12,
  /** Robot rifles only hurt at close quarters; beyond this they close in instead of shooting. */
  effectiveRange: 10,
  /** How close an alerted robot tries to get before it stops to shoot. */
  standoff: 6.5,
  hearingRange: 75,
  /** Squad radio: an alerted robot passes the player's position to others this close. */
  radioRange: 60,
  /** Seconds an alerted robot keeps hunting after losing sight before it falls back to searching. */
  alertMemory: 7,
  /** How far a robot looks for its next piece of cover. */
  coverRadius: 16,
} as const;

/** How an alerted robot fights: `assault` bounds from cover to cover, `flank` swings round to the player's side. */
export type SentryRole = 'assault' | 'flank';
export type SentryTactic = 'advance' | 'cover' | 'flank' | 'engage';

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
  readonly role: SentryRole;
  /** Which side a flanker swings round to, and which way it sidesteps while shooting. */
  side: -1 | 1;
  tactic: SentryTactic;
  tacticTimer: number;
  /** Where the robot is heading for this tactic (cover spot, flank point), if anywhere. */
  moveTarget: { x: number; z: number } | null;
  /** Seconds left diving for cover after the player's shots landed nearby. */
  suppressed: number;
  /** Seconds left to reach `moveTarget` before giving up on it (walls can make a spot unreachable). */
  moveBudget: number;
  sinceSeen: number;
  radioTimer: number;
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
    role: hashId(id) % 2 === 0 ? 'assault' : 'flank', side: hashId(id) % 4 < 2 ? 1 : -1,
    tactic: 'advance', tacticTimer: 0, moveTarget: null, moveBudget: 0, suppressed: 0, sinceSeen: 99, radioTimer: 0,
  };
}

function hashId(id: string): number {
  let hash = 7;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  return hash;
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

  sentry.suppressed = Math.max(0, sentry.suppressed - dt);
  sentry.moveBudget = Math.max(0, sentry.moveBudget - dt);
  sentry.radioTimer = Math.max(0, sentry.radioTimer - dt);
  sentry.sinceSeen = sentry.canSeePlayer ? 0 : sentry.sinceSeen + dt;
  if (sentry.canSeePlayer) {
    const gain = playerVisibility(player, distance) * Math.min(1, sentry.exposure * 1.5) * (sentry.mode === 'alert' ? 4 : 1.7);
    sentry.awareness = Math.min(1.2, sentry.awareness + gain * dt);
    if (sentry.awareness > 0.3) sentry.lastKnown = { x: player.position.x, z: player.position.z };
  } else {
    sentry.awareness = Math.max(0, sentry.awareness - (sentry.mode === 'alert' ? 0.08 : 0.18) * dt);
  }

  if (sentry.awareness >= 1) sentry.mode = 'alert';
  else if (sentry.mode === 'alert' && sentry.sinceSeen > SENTRY.alertMemory) { sentry.mode = 'search'; sentry.searchTimer = 14; }
  else if (sentry.mode === 'patrol' && sentry.awareness > 0.35) sentry.mode = 'suspicious';
  else if (sentry.mode === 'suspicious' && sentry.awareness < 0.1) sentry.mode = 'patrol';

  let shot: SentryShot | null = null;
  let target: { x: number; z: number } | null = null;
  let speed = 0;
  /** False to sidestep while still facing (and shooting at) the player. */
  let faceMovement = true;
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
    case 'alert': {
      const known = sentry.canSeePlayer ? { x: player.position.x, z: player.position.z } : sentry.lastKnown;
      sentry.fireCooldown -= dt;
      if (sentry.tacticTimer >= 0) sentry.tacticTimer = Math.max(0, sentry.tacticTimer - dt);
      if (sentry.canSeePlayer && distance <= SENTRY.effectiveRange && sentry.fireCooldown <= 0 && facing < 0.35 && sentry.suppressed <= 0) {
        sentry.fireCooldown = SENTRY.fireInterval * (0.8 + random.next() * 0.5);
        sentry.sinceShot = 0;
        shot = fireAt(sentry, player, world, eye, distance, random);
      }
      if (known === null) break;
      const plan = planTactic(sentry, known, player.eye, distance, world, random);
      target = plan.target;
      speed = plan.speed;
      faceMovement = plan.faceMovement;
      // Keep the gun on the player whenever the robot isn't running somewhere.
      if (!faceMovement || target === null) sentry.heading = turnToward(sentry.heading, bearing, 4 * dt);
      break;
    }
    case 'search':
      sentry.searchTimer -= dt;
      if (sentry.suppressed > 0 && sentry.lastKnown !== null) {
        const threat = { x: sentry.lastKnown.x, y: sentry.position.y + 1.6, z: sentry.lastKnown.z };
        if (sentry.moveTarget === null || sentry.tactic !== 'cover') {
          setMoveTarget(sentry, findCover(world, sentry, threat, SENTRY.coverRadius * 0.6, null), SENTRY.huntSpeed);
          sentry.tactic = 'cover';
        }
        if (sentry.moveTarget !== null) { target = sentry.moveTarget; speed = SENTRY.huntSpeed; }
      } else if (sentry.lastKnown !== null && Math.hypot(sentry.lastKnown.x - sentry.position.x, sentry.lastKnown.z - sentry.position.z) > 1.5) {
        target = sentry.lastKnown;
        speed = SENTRY.huntSpeed * 0.7;
      } else {
        sentry.heading += dt * 0.9;
      }
      if (sentry.searchTimer <= 0) { sentry.mode = 'patrol'; sentry.awareness = 0; sentry.lastKnown = null; }
      break;
  }

  if (target !== null && speed > 0 && Math.hypot(target.x - sentry.position.x, target.z - sentry.position.z) > 0.3) {
    const desired = Math.atan2(target.x - sentry.position.x, target.z - sentry.position.z);
    let step: number;
    if (faceMovement) {
      sentry.heading = turnToward(sentry.heading, desired, 3 * dt);
      step = speed * dt * Math.max(0, Math.cos(angleDifference(desired, sentry.heading)));
      sentry.position.x += Math.sin(sentry.heading) * step;
      sentry.position.z += Math.cos(sentry.heading) * step;
    } else {
      step = speed * dt;
      sentry.position.x += Math.sin(desired) * step;
      sentry.position.z += Math.cos(desired) * step;
    }
    world.resolveHorizontal(sentry.position, SENTRY.radius, 2.1, 0.45);
    sentry.walkPhase += step * 2.4;
  }
  sentry.position.y = world.groundHeight(sentry.position.x, sentry.position.z, SENTRY.radius * 0.5, sentry.position.y + 0.3, 0.45);
  return shot;
}

function setMoveTarget(sentry: SentryState, target: { x: number; z: number } | null, speed: number): void {
  sentry.moveTarget = target;
  sentry.moveBudget = target === null ? 0 : Math.hypot(target.x - sentry.position.x, target.z - sentry.position.z) / speed + 3;
}

interface TacticPlan { readonly target: { x: number; z: number } | null; readonly speed: number; readonly faceMovement: boolean }

/**
 * Chooses how an alerted robot moves this frame. Under fire it dives for cover; out of range, assault robots bound
 * from cover to cover towards the player while flankers swing round to the player's side; in range, it fights from
 * where it is, sidestepping so it is harder to hit, and relocates after a few shots.
 */
function planTactic(sentry: SentryState, known: { x: number; z: number }, threatEye: Vec3, distance: number, world: CollisionWorld, random: Random): TacticPlan {
  const here = sentry.position;
  const arrived = sentry.moveTarget !== null && (Math.hypot(sentry.moveTarget.x - here.x, sentry.moveTarget.z - here.z) < 0.9 || sentry.moveBudget <= 0);
  const threat = sentry.canSeePlayer ? threatEye : { x: known.x, y: threatEye.y, z: known.z };

  if (sentry.suppressed > 0) {
    if (sentry.tactic !== 'cover' || sentry.moveTarget === null) {
      sentry.tactic = 'cover';
      setMoveTarget(sentry, findCover(world, sentry, threat, SENTRY.coverRadius * 0.6, null), SENTRY.huntSpeed);
      sentry.tacticTimer = 2 + random.next() * 1.5;
    }
    return sentry.moveTarget === null || arrived
      ? { target: null, speed: 0, faceMovement: false }
      : { target: sentry.moveTarget, speed: SENTRY.huntSpeed, faceMovement: true };
  }

  if (distance <= SENTRY.effectiveRange && sentry.canSeePlayer) {
    if (sentry.tactic !== 'engage' || sentry.tacticTimer <= 0) {
      sentry.tactic = 'engage';
      sentry.tacticTimer = 1.6 + random.next() * 1.4;
      sentry.side = sentry.side === 1 ? -1 : 1;
      // Sidestep across the player's line of fire.
      const awayX = here.x - known.x; const awayZ = here.z - known.z;
      const length = Math.hypot(awayX, awayZ) || 1;
      setMoveTarget(sentry, { x: here.x + (-awayZ / length) * sentry.side * 2.5, z: here.z + (awayX / length) * sentry.side * 2.5 }, SENTRY.patrolSpeed);
    }
    // Close in a little if still far from the standoff distance.
    if (distance > SENTRY.standoff + 1.5 && sentry.moveTarget !== null) {
      const towardX = known.x - here.x; const towardZ = known.z - here.z;
      const length = Math.hypot(towardX, towardZ) || 1;
      return { target: { x: sentry.moveTarget.x + towardX / length * 1.5, z: sentry.moveTarget.z + towardZ / length * 1.5 }, speed: SENTRY.patrolSpeed, faceMovement: false };
    }
    return { target: sentry.moveTarget, speed: SENTRY.patrolSpeed * 0.8, faceMovement: false };
  }

  // Out of range (or the player is out of sight): work closer.
  if (sentry.role === 'flank' && sentry.tactic !== 'cover') {
    if (sentry.tactic !== 'flank' || sentry.moveTarget === null) {
      // Swing round ~65 degrees to one side, just outside firing range, then close in from there.
      const awayX = here.x - known.x; const awayZ = here.z - known.z;
      const length = Math.hypot(awayX, awayZ) || 1;
      const radius = Math.max(SENTRY.effectiveRange - 1, Math.min(length * 0.45, 14));
      const angle = Math.atan2(awayX, awayZ) + 1.1 * sentry.side;
      sentry.tactic = 'flank';
      sentry.tacticTimer = 1;
      setMoveTarget(sentry, { x: known.x + Math.sin(angle) * radius, z: known.z + Math.cos(angle) * radius }, SENTRY.huntSpeed);
    } else if (arrived || sentry.tacticTimer < 0) {
      // Flank reached: now close in on the player from the side (tacticTimer < 0 marks this stage).
      sentry.tacticTimer = -1;
      setMoveTarget(sentry, { x: known.x, z: known.z }, SENTRY.huntSpeed);
    }
    return { target: sentry.moveTarget, speed: SENTRY.huntSpeed, faceMovement: true };
  }

  // Assault: bound from cover to cover, pausing in each.
  if (sentry.tactic === 'cover' && sentry.moveTarget !== null && !arrived) {
    return { target: sentry.moveTarget, speed: SENTRY.huntSpeed, faceMovement: true };
  }
  if (sentry.tactic === 'cover' && sentry.tacticTimer > 0) return { target: null, speed: 0, faceMovement: false };
  const next = findCover(world, sentry, threat, SENTRY.coverRadius, known);
  if (next !== null) {
    sentry.tactic = 'cover';
    setMoveTarget(sentry, next, SENTRY.huntSpeed);
    sentry.tacticTimer = 1.2 + random.next() * 1.4;
    return { target: next, speed: SENTRY.huntSpeed, faceMovement: true };
  }
  sentry.tactic = 'advance';
  setMoveTarget(sentry, { x: known.x, z: known.z }, SENTRY.huntSpeed);
  return { target: sentry.moveTarget, speed: SENTRY.huntSpeed, faceMovement: true };
}

/**
 * Finds a spot behind a tree trunk, rock, or wall that hides a robot from `threat`. With `toward` set it only
 * accepts cover that gets the robot at least a few metres closer to that point (for bounding forward).
 */
export function findCover(world: CollisionWorld, sentry: SentryState, threat: Vec3, radius: number, toward: { x: number; z: number } | null): { x: number; z: number } | null {
  const here = sentry.position;
  const currentGap = toward === null ? 0 : Math.hypot(toward.x - here.x, toward.z - here.z);
  let best: { x: number; z: number } | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  const volumes = world.query(here.x - radius, here.z - radius, here.x + radius, here.z + radius, 'solid')
    .filter((volume) => volume.enabled && volume.tag !== 'glass' && volume.maxY - volume.minY > 1.6 && volume.maxX - volume.minX < 12 && volume.maxZ - volume.minZ < 12)
    .sort((a, b) => Math.hypot((a.minX + a.maxX) / 2 - here.x, (a.minZ + a.maxZ) / 2 - here.z) - Math.hypot((b.minX + b.maxX) / 2 - here.x, (b.minZ + b.maxZ) / 2 - here.z))
    .slice(0, 28);
  for (const volume of volumes) {
    const centerX = (volume.minX + volume.maxX) / 2; const centerZ = (volume.minZ + volume.maxZ) / 2;
    const awayX = centerX - threat.x; const awayZ = centerZ - threat.z;
    const length = Math.hypot(awayX, awayZ) || 1;
    const reach = Math.max(volume.maxX - volume.minX, volume.maxZ - volume.minZ) / 2 + SENTRY.radius + 0.35;
    const spot = { x: centerX + awayX / length * reach, z: centerZ + awayZ / length * reach };
    const travel = Math.hypot(spot.x - here.x, spot.z - here.z);
    if (travel > radius) continue;
    let gap = 0;
    if (toward !== null) {
      gap = Math.hypot(toward.x - spot.x, toward.z - spot.z);
      if (gap > currentGap - 3 || gap < SENTRY.standoff) continue;
    }
    const ground = world.groundHeight(spot.x, spot.z, SENTRY.radius * 0.5, here.y + 0.5, 0.45);
    if (world.inside('solid', { x: spot.x, y: ground + 1, z: spot.z }, SENTRY.radius * 0.6) !== null) continue;
    if (world.lineOfSight(threat, { x: spot.x, y: ground + 1.8, z: spot.z }, (candidate) => candidate.tag === 'glass')) continue;
    const score = travel + gap * 0.6;
    if (score < bestScore) { bestScore = score; best = spot; }
  }
  return best;
}

/** The player's shot passed close by: the robot dives for cover and knows roughly where it came from. */
export function suppressSentry(sentry: SentryState, shooter: Vec3): void {
  if (sentry.mode === 'dead') return;
  sentry.suppressed = 2.5;
  sentry.lastKnown = { x: shooter.x, z: shooter.z };
  sentry.awareness = Math.max(sentry.awareness, 0.7);
  sentry.moveTarget = null;
  sentry.tactic = 'advance';
  if (sentry.mode === 'patrol' || sentry.mode === 'suspicious') { sentry.mode = 'search'; sentry.searchTimer = 16; }
}

/** An alerted robot that can see the player radios the position to nearby robots, who converge to help. */
export function radioSquad(sentries: readonly SentryState[], spotter: SentryState, player: Vec3): number {
  if (spotter.mode !== 'alert' || !spotter.canSeePlayer || spotter.radioTimer > 0) return 0;
  spotter.radioTimer = 1.5;
  let told = 0;
  for (const other of sentries) {
    if (other === spotter || other.mode === 'dead') continue;
    if (Math.hypot(other.position.x - spotter.position.x, other.position.z - spotter.position.z) > SENTRY.radioRange) continue;
    other.lastKnown = { x: player.x, z: player.z };
    if (other.mode === 'patrol' || other.mode === 'suspicious' || other.mode === 'search') {
      other.mode = 'search';
      other.searchTimer = Math.max(other.searchTimer, 18);
      other.awareness = Math.max(other.awareness, 0.6);
    }
    told += 1;
  }
  return told;
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
export function hearGunshot(sentries: readonly SentryState[], origin: Vec3, random: Random, range: number = SENTRY.hearingRange): void {
  for (const sentry of sentries) {
    if (sentry.mode === 'dead') continue;
    const distance = Math.hypot(sentry.position.x - origin.x, sentry.position.z - origin.z);
    if (distance > range) continue;
    const error = distance * 0.18;
    sentry.lastKnown = { x: origin.x + (random.next() - 0.5) * error, z: origin.z + (random.next() - 0.5) * error };
    sentry.awareness = Math.max(sentry.awareness, 0.5 + (1 - distance / range) * 0.3);
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
