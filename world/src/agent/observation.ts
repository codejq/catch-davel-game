import type { Vec3 } from '../core/collision';
import { GRAVITY, MUZZLE_VELOCITY, zeroAngle } from '../player/ballistics';

/**
 * What an agent sees each turn: a compact, text-friendly summary of the game. Angles are in degrees. A bearing is a
 * compass direction (0 = north, 90 = east); a `relative` angle is measured from where the sniper is looking,
 * positive to the right.
 */
export interface Observation {
  readonly time: number;
  readonly phase: 'menu' | 'playing' | 'paused' | 'dead' | 'victory';
  readonly world: { readonly index: number; readonly count: number; readonly name: string };
  readonly objectives: readonly { readonly text: string; readonly done: boolean }[];
  readonly player: {
    readonly x: number; readonly y: number; readonly z: number;
    readonly heading: number; readonly pitch: number;
    readonly stance: 'stand' | 'crouch' | 'prone';
    readonly health: number; readonly armor: number; readonly lives: number; readonly money: number;
    readonly magazine: number; readonly capacity: number; readonly reserve: number; readonly reloading: boolean; readonly boltReady: boolean;
    readonly scoped: boolean; readonly zoom: number; readonly suppressor: boolean;
    /** The weapon in hand, and the robot carbine's rounds (once one has been taken from a destroyed robot). */
    readonly weapon: 'rifle' | 'carbine';
    readonly carbine: { readonly owned: boolean; readonly magazine: number; readonly reserve: number };
    readonly visibility: 'hidden' | 'concealed' | 'visible' | 'spotted';
    readonly indoors: boolean; readonly keycard: boolean;
  };
  /** Enemies worth knowing about (robots and tanks), nearest first: any in line of sight, within 150 m, or hunting you. */
  readonly robots: readonly RobotView[];
  /** Civilians and their dogs nearby. Never shoot them: each one you hit costs 5% health. */
  readonly innocents: readonly InnocentView[];
  /** Doors, unsearched containers, pickups, and the portal within reach of a short walk, nearest first. */
  readonly nearby: readonly ThingView[];
  /** The nearest houses: go to one (by id) to search its containers. */
  readonly buildings: readonly { readonly id: string; readonly bearing: number; readonly relative: number; readonly distance: number; readonly unsearched: number }[];
  readonly portal: { readonly bearing: number; readonly relative: number; readonly distance: number; readonly unlocked: boolean };
  /** What is under the crosshair right now. */
  readonly crosshair: { readonly robot: string | null; readonly distance: number | null; readonly innocent: string | null };
  /** What interact would do right now (the on-screen prompt), if anything is in reach. */
  readonly prompt: string | null;
  /** Things that happened since the last observation, oldest first. */
  readonly events: readonly string[];
}

export interface InnocentView {
  readonly id: string;
  readonly kind: 'adult' | 'child' | 'dog';
  readonly bearing: number; readonly relative: number; readonly distance: number;
  readonly state: 'calm' | 'fleeing' | 'hiding';
}

export interface RobotView {
  readonly id: string;
  /** A walking robot (r#) or a tank (t#; four rifle hits to destroy). */
  readonly kind: 'robot' | 'tank';
  readonly bearing: number; readonly relative: number; readonly distance: number;
  /** patrol (unaware), suspicious, searching, alert (hunting you), or down. */
  readonly state: 'patrol' | 'suspicious' | 'search' | 'alert';
  /** advance, cover, flank, or engage while alert. */
  readonly tactic: string | null;
  readonly seesYou: boolean;
  /** Clear line of fire from your eye to its body. */
  readonly inSight: boolean;
  /** Close enough for its rifle to hurt you (10 m). */
  readonly canHurtYou: boolean;
}

export interface ThingView {
  readonly id: string;
  readonly kind: 'door' | 'container' | 'pickup' | 'portal';
  /** Door: open/closed. Container: its type. Pickup: what it is (and why it can't be taken yet, if so). */
  readonly detail: string;
  readonly bearing: number; readonly relative: number; readonly distance: number;
}

const DEG = 180 / Math.PI;

/** Compass bearing in degrees 0..360 from `from` to `to` (0 = north = -Z, 90 = east = +X). */
export function bearingDegrees(from: Vec3, to: { x: number; z: number }): number {
  return normalizeDegrees(Math.atan2(to.x - from.x, -(to.z - from.z)) * DEG);
}

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Signed difference a - b in degrees, -180..180. */
export function relativeDegrees(a: number, b: number): number {
  const difference = normalizeDegrees(a - b);
  return difference > 180 ? difference - 360 : difference;
}

export function round(value: number, digits = 1): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

/**
 * The view yaw and pitch (radians) that put a rifle round through `target`, allowing for bullet drop and the
 * rifle's 100 m zero. Pitch is positive up, yaw uses the game's convention (0 = north).
 */
export function solveAim(eye: Vec3, target: Vec3): { yaw: number; pitch: number } {
  const dx = target.x - eye.x; const dz = target.z - eye.z;
  const range = Math.hypot(dx, dz);
  const rise = target.y - eye.y;
  const yaw = Math.atan2(dx, -dz);
  if (range < 0.5) return { yaw, pitch: Math.atan2(rise, Math.max(range, 0.01)) };
  // Height of the round at the target's range for a launch angle, solved by bisection.
  const heightAt = (angle: number): number =>
    range * Math.tan(angle) - (GRAVITY * range * range) / (2 * MUZZLE_VELOCITY * MUZZLE_VELOCITY * Math.cos(angle) ** 2);
  let low = -1.2; let high = 1.2;
  for (let iteration = 0; iteration < 40; iteration += 1) {
    const middle = (low + high) / 2;
    if (heightAt(middle) < rise) low = middle; else high = middle;
  }
  return { yaw, pitch: (low + high) / 2 - zeroAngle() };
}

/** A short plain-text briefing of an observation, for putting straight into an LLM prompt. */
export function describeObservation(observation: Observation): string {
  const { player } = observation;
  const lines: string[] = [];
  lines.push(`[${observation.phase.toUpperCase()}] ${observation.world.name} (world ${observation.world.index + 1} of ${observation.world.count}), t=${round(observation.time, 1)}s`);
  lines.push(`Objectives: ${observation.objectives.map((item) => `${item.done ? '[x]' : '[ ]'} ${item.text}`).join('; ')}`);
  lines.push(`You: at (${round(player.x)}, ${round(player.z)}), facing ${Math.round(player.heading)}° (pitch ${Math.round(player.pitch)}°), ${player.stance}, ${player.visibility}${player.indoors ? ', indoors' : ''}. Health ${Math.round(player.health)}, armor ${Math.round(player.armor)}, lives ${player.lives}, cash $${player.money}${player.keycard ? ', HAVE KEYCARD' : ''}.`);
  lines.push(`Rifle${player.weapon === 'rifle' ? ' (in hand)' : ''}: ${player.magazine}/${player.capacity} in magazine, ${player.reserve} spare${player.reloading ? ', reloading' : ''}${player.boltReady ? '' : ', cycling bolt'}${player.scoped ? `, scoped ${player.zoom}x` : ''}${player.suppressor ? ', suppressed' : ''}.`);
  lines.push(player.carbine.owned ? `Robot carbine${player.weapon === 'carbine' ? ' (in hand)' : ''}: ${player.carbine.magazine} loaded, ${player.carbine.reserve} spare.` : 'Robot carbine: not yet (destroy a robot and walk up to it to take its carbine).');
  if (observation.robots.length === 0) lines.push('Robots: none nearby.');
  else {
    lines.push('Robots (relative angle: + right / - left):');
    for (const robot of observation.robots) {
      const flags = [robot.state, robot.tactic, robot.seesYou ? 'SEES YOU' : null, robot.inSight ? 'in your line of fire' : 'blocked from view', robot.canHurtYou ? 'CLOSE ENOUGH TO HIT YOU' : null].filter(Boolean).join(', ');
      lines.push(`  ${robot.id}${robot.kind === 'tank' ? ' (TANK)' : ''}: ${Math.round(robot.distance)} m at ${Math.round(robot.relative)}° (bearing ${Math.round(robot.bearing)}°) - ${flags}`);
    }
  }
  if (observation.crosshair.innocent !== null) lines.push(`WARNING: the crosshair is on innocent ${observation.crosshair.innocent} - do not fire.`);
  else if (observation.crosshair.robot !== null) lines.push(`Crosshair: on ${observation.crosshair.robot} at ${Math.round(observation.crosshair.distance ?? 0)} m.`);
  if (observation.innocents.length > 0) {
    lines.push(`Innocents nearby (never shoot them): ${observation.innocents.map((innocent) => `${innocent.id} ${innocent.kind} ${Math.round(innocent.distance)} m at ${Math.round(innocent.relative)}°${innocent.state === 'calm' ? '' : ` (${innocent.state})`}`).join('; ')}`);
  }
  if (observation.prompt !== null) lines.push(`Within reach: ${observation.prompt} (interact / search).`);
  if (observation.nearby.length > 0) {
    lines.push('Nearby:');
    for (const thing of observation.nearby) lines.push(`  ${thing.id} ${thing.kind} (${thing.detail}): ${round(thing.distance)} m at ${Math.round(thing.relative)}°`);
  }
  if (observation.buildings.length > 0) {
    lines.push(`Buildings: ${observation.buildings.map((building) => `${building.id} ${Math.round(building.distance)} m at ${Math.round(building.relative)}° (${building.unsearched} unsearched)`).join('; ')}`);
  }
  lines.push(`Portal: ${Math.round(observation.portal.distance)} m at ${Math.round(observation.portal.relative)}° (${observation.portal.unlocked ? 'unlocked' : 'locked - find the keycard in a container'}).`);
  if (observation.events.length > 0) lines.push(`Events: ${observation.events.join(' | ')}`);
  return lines.join('\n');
}
