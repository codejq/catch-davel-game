import type { Vec3 } from '../core/collision';
import type { ControlAction } from '../core/controls';
import type { Stance } from '../player/body';
import {
  bearingDegrees, describeObservation, normalizeDegrees, relativeDegrees, round, solveAim,
  type InnocentView, type Observation, type RobotView, type ThingView,
} from './observation';

/** Everything the bridge needs from the running game. The game implements this in `Game.agentHost()`. */
export interface AgentHost {
  phase(): Observation['phase'];
  /** Starts a fresh run in the given world (0-based), or the current one. */
  start(world?: number): void;
  /** One simulation frame, as if that much real time passed with the current virtual input. */
  step(dt: number): void;
  setLockstep(on: boolean): void;
  /** Asks for one fresh frame to be drawn (in lockstep the game only draws on request). */
  redraw(): void;
  hold(action: ControlAction, down: boolean): void;
  tap(action: ControlAction): void;
  releaseAll(): void;
  view(): { yaw: number; pitch: number };
  setView(yaw: number, pitch: number): void;
  setStance(stance: Stance): void;
  setScope(on: boolean): void;
  eye(): Vec3;
  lineOfSight(from: Vec3, to: Vec3): boolean;
  /** A walking route (through doorways and up stairs) to within `reach` of a point on its floor, or null. */
  findPath(to: Vec3, reach: number): Vec3[] | null;
  snapshot(): GameSnapshot;
  /** Removes and returns everything logged since the last call. */
  drainEvents(): string[];
}

export interface GameSnapshot {
  readonly time: number;
  readonly world: { readonly index: number; readonly count: number; readonly name: string };
  readonly objectives: readonly { readonly text: string; readonly done: boolean }[];
  readonly player: Omit<Observation['player'], 'heading' | 'pitch'> & { readonly moving: boolean };
  readonly robots: readonly {
    readonly id: string; readonly kind: 'robot' | 'soldier' | 'tank'; readonly position: Vec3; readonly chest: Vec3; readonly mode: string; readonly tactic: string;
    readonly seesYou: boolean;
  }[];
  readonly innocents: readonly { readonly id: string; readonly kind: 'adult' | 'child' | 'dog'; readonly position: Vec3; readonly mode: string }[];
  readonly doors: readonly { readonly id: string; readonly center: Vec3; readonly open: boolean }[];
  readonly containers: readonly { readonly id: string; readonly kind: string; readonly center: Vec3; readonly searched: boolean }[];
  readonly pickups: readonly { readonly id: string; readonly kind: string; readonly position: Vec3; readonly refusal: string | null }[];
  /** Houses, with a spot just outside the door to walk to and how many containers are still unsearched inside. */
  readonly buildings: readonly { readonly id: string; readonly entrance: Vec3; readonly unsearched: number }[];
  readonly portal: Vec3 & { readonly unlocked: boolean };
  readonly crosshair: { readonly robot: string | null; readonly distance: number | null; readonly innocent: string | null };
  /** The interaction prompt on screen right now (what {"do":"interact"} or search would do), if any. */
  readonly prompt: string | null;
}

/** One thing for the sniper to do. Agents send a list of these; see `COMMAND_HELP` for the full reference. */
export type AgentCommand =
  | { do: 'start'; world?: number }
  | { do: 'move'; direction: 'forward' | 'back' | 'left' | 'right'; seconds?: number; run?: boolean }
  | { do: 'turn'; degrees: number }
  | { do: 'look'; degrees: number }
  | { do: 'face'; bearing?: number; target?: string }
  | { do: 'aim'; target: string }
  | { do: 'fire'; rounds?: number }
  | { do: 'weapon'; name: 'rifle' | 'carbine' }
  | { do: 'scope'; on: boolean }
  | { do: 'zoom' }
  | { do: 'stance'; value: Stance }
  | { do: 'jump' }
  | { do: 'reload' }
  | { do: 'interact' }
  | { do: 'search'; seconds?: number }
  | { do: 'go_to'; target?: string; x?: number; z?: number; run?: boolean; seconds?: number }
  | { do: 'wait'; seconds?: number };

export const COMMAND_HELP = `Commands (send a list; they run in order and the world only moves while they run):
  {"do":"start","world":0}                 start a fresh run (world 0-2 optional); also use after dying
  {"do":"move","direction":"forward|back|left|right","seconds":1,"run":false}   walk (max 5 s)
  {"do":"turn","degrees":30}                turn right (negative = left)
  {"do":"look","degrees":-5}                tilt the view up (negative = down)
  {"do":"face","bearing":90} or {"do":"face","target":"r2"}   turn to a compass bearing or toward a robot/thing
  {"do":"aim","target":"r2"}                raise the sights and aim at a robot's (r#) or tank's (t#) body, allowing for bullet drop
  {"do":"fire","rounds":1}                  shoot; with the carbine, "rounds" fires a burst (default 5). Never shoot innocents
  {"do":"weapon","name":"carbine"}          switch between "rifle" and "carbine" (take a carbine from a destroyed robot first)
  {"do":"scope","on":true}                  raise or lower the scope
  {"do":"zoom"}                             cycle scope magnification
  {"do":"stance","value":"stand|crouch|prone"}   crouch or crawl to hide (prone in a bush is near invisible)
  {"do":"jump"}  {"do":"reload"}
  {"do":"interact"}                         open/close a door, pick up an item, or enter the portal (face it, within ~2.5 m)
  {"do":"search","seconds":1.6}             hold interact to search the container in front of you
  {"do":"go_to","target":"c3","run":false,"seconds":30} or {"do":"go_to","x":10,"z":-4}   walk there by a route
                                            around walls, opening doors; stops early if a robot spots you or you are hit
  {"do":"wait","seconds":1}                 let time pass (max 10 s; stops early if a robot spots you or you are hit)
Ids: r# robots and soldiers, t# tanks, h# civilians and k# dogs (innocents: never shoot), d# doors, c# containers, p# pickups, b# buildings (go_to walks to the entrance), "portal".`;

const FRAME = 1 / 60;

/** Turns agent commands into game input and game state into observations. */
export class AgentBridge {
  private lockstep = false;

  constructor(private readonly host: AgentHost) {}

  observe(): Observation {
    const snapshot = this.host.snapshot();
    const eye = this.host.eye();
    const view = this.host.view();
    const heading = normalizeDegrees(view.yaw * 180 / Math.PI);
    const relative = (bearing: number): number => round(relativeDegrees(bearing, heading), 0);

    const robots: RobotView[] = [];
    for (const robot of snapshot.robots) {
      if (robot.mode === 'dead') continue;
      const distance = Math.hypot(robot.position.x - eye.x, robot.position.z - eye.z);
      const inSight = this.host.lineOfSight(eye, robot.chest);
      if (distance > 150 && !inSight && robot.mode !== 'alert') continue;
      const bearing = bearingDegrees(eye, robot.position);
      robots.push({
        id: robot.id, kind: robot.kind, bearing: round(bearing, 0), relative: relative(bearing), distance: round(distance),
        state: robot.mode as RobotView['state'], tactic: robot.mode === 'alert' && robot.kind === 'robot' ? robot.tactic : null,
        seesYou: robot.seesYou, inSight, canHurtYou: distance <= 10,
      });
    }
    robots.sort((a, b) => a.distance - b.distance);

    const innocents: InnocentView[] = snapshot.innocents
      .filter((innocent) => innocent.mode !== 'dead' && Math.hypot(innocent.position.x - eye.x, innocent.position.z - eye.z) < 80)
      .map((innocent) => {
        const bearing = bearingDegrees(eye, innocent.position);
        const state: InnocentView['state'] = innocent.mode === 'flee' ? 'fleeing' : innocent.mode === 'hide' ? 'hiding' : 'calm';
        return { id: innocent.id, kind: innocent.kind, bearing: round(bearing, 0), relative: relative(bearing), distance: round(Math.hypot(innocent.position.x - eye.x, innocent.position.z - eye.z)), state };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8);
    const nearby: ThingView[] = [];
    const feet = snapshot.player.y;
    const addThing = (id: string, kind: ThingView['kind'], detail: string, point: Vec3): void => {
      const distance = Math.hypot(point.x - eye.x, point.z - eye.z);
      if (distance > 40) return;
      const bearing = bearingDegrees(eye, point);
      const level = point.y - feet > 2.4 ? 'upstairs' : point.y - feet < -1.5 ? 'downstairs' : null;
      nearby.push({ id, kind, detail: level === null ? detail : `${detail}, ${level}`, bearing: round(bearing, 0), relative: relative(bearing), distance: round(distance) });
    };
    for (const door of snapshot.doors) addThing(door.id, 'door', door.open ? 'open' : 'closed', door.center);
    for (const container of snapshot.containers) if (!container.searched) addThing(container.id, 'container', `${container.kind}, unsearched`, container.center);
    for (const pickup of snapshot.pickups) addThing(pickup.id, 'pickup', pickup.refusal === null ? pickup.kind : `${pickup.kind}, ${pickup.refusal}`, pickup.position);
    nearby.sort((a, b) => a.distance - b.distance);
    const portalBearing = bearingDegrees(eye, snapshot.portal);
    const buildings = snapshot.buildings.map((building) => {
      const bearing = bearingDegrees(eye, building.entrance);
      return { id: building.id, bearing: round(bearing, 0), relative: relative(bearing), distance: round(Math.hypot(building.entrance.x - eye.x, building.entrance.z - eye.z)), unsearched: building.unsearched };
    }).sort((a, b) => a.distance - b.distance).slice(0, 6);

    return {
      time: round(snapshot.time, 2), phase: this.host.phase(), world: snapshot.world, objectives: snapshot.objectives,
      player: { ...withoutMoving(snapshot.player), heading: round(heading, 0), pitch: round(view.pitch * 180 / Math.PI, 0) },
      robots: robots.slice(0, 8), innocents, nearby: nearby.slice(0, 10), buildings,
      portal: { bearing: round(portalBearing, 0), relative: relative(portalBearing), distance: round(Math.hypot(snapshot.portal.x - eye.x, snapshot.portal.z - eye.z)), unlocked: snapshot.portal.unlocked },
      crosshair: snapshot.crosshair,
      prompt: snapshot.prompt,
      events: this.host.drainEvents(),
    };
  }

  describe(): string {
    return describeObservation(this.observe());
  }

  /** Runs commands in order (stopping early if the sniper dies or wins) and returns what happened plus a fresh observation. */
  act(commands: AgentCommand | readonly AgentCommand[]): { results: string[]; observation: Observation } {
    const list = Array.isArray(commands) ? commands : [commands as AgentCommand];
    if (!this.lockstep) { this.lockstep = true; this.host.setLockstep(true); }
    const results: string[] = [];
    for (const command of list) {
      if (this.host.phase() !== 'playing' && command.do !== 'start') {
        results.push(`${command.do}: skipped, the game is ${this.host.phase()} (send {"do":"start"})`);
        continue;
      }
      try {
        results.push(`${command.do}: ${this.run(command)}`);
      } catch (error) {
        results.push(`${command.do}: error - ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        this.host.releaseAll();
      }
    }
    this.host.redraw();
    return { results, observation: this.observe() };
  }

  /** Hands control back to a human player: the game runs in real time again. */
  release(): void {
    this.lockstep = false;
    this.host.releaseAll();
    this.host.setLockstep(false);
  }

  private steps(seconds: number, each?: () => boolean | void): number {
    const frames = Math.max(1, Math.round(seconds / FRAME));
    for (let frame = 0; frame < frames; frame += 1) {
      if (each?.() === true) return frame * FRAME;
      this.host.step(FRAME);
      if (this.host.phase() !== 'playing') return (frame + 1) * FRAME;
    }
    return frames * FRAME;
  }

  /**
   * Returns a checker for long commands: reports (at most four times a second) when a robot newly spots the sniper
   * or the sniper takes damage, so the agent gets a chance to react.
   */
  private alarm(): () => string | null {
    const seen = new Set(this.host.snapshot().robots.filter((robot) => robot.seesYou && robot.mode === 'alert').map((robot) => robot.id));
    let health = this.host.snapshot().player.health;
    let clock = 0;
    return () => {
      clock += FRAME;
      if (clock < 0.25) return null;
      clock = 0;
      const snapshot = this.host.snapshot();
      if (snapshot.player.health < health) return `you were hit (health ${Math.round(snapshot.player.health)})`;
      health = snapshot.player.health;
      const spotter = snapshot.robots.find((robot) => robot.seesYou && robot.mode === 'alert' && !seen.has(robot.id));
      return spotter === undefined ? null : `${spotter.id} spotted you`;
    };
  }

  private locate(id: string): Vec3 {
    const snapshot = this.host.snapshot();
    if (id === 'portal') return snapshot.portal;
    const robot = snapshot.robots.find((candidate) => candidate.id === id);
    if (robot !== undefined) return robot.chest;
    const door = snapshot.doors.find((candidate) => candidate.id === id);
    if (door !== undefined) return door.center;
    const container = snapshot.containers.find((candidate) => candidate.id === id);
    if (container !== undefined) return container.center;
    const pickup = snapshot.pickups.find((candidate) => candidate.id === id);
    if (pickup !== undefined) return pickup.position;
    const innocent = snapshot.innocents.find((candidate) => candidate.id === id && candidate.mode !== 'dead');
    if (innocent !== undefined) return { x: innocent.position.x, y: innocent.position.y + 1, z: innocent.position.z };
    const building = snapshot.buildings.find((candidate) => candidate.id === id);
    if (building !== undefined) return building.entrance;
    if (/^[rtp]\d+$/.test(id)) throw new Error(`${id} is no longer there (${id.startsWith('p') ? 'already picked up' : 'destroyed'})`);
    throw new Error(`unknown target "${id}" - use an id from the latest observation`);
  }

  private run(command: AgentCommand): string {
    const host = this.host;
    switch (command.do) {
      case 'start':
        host.start(command.world);
        this.steps(0.2);
        return `started world ${(command.world ?? 0) + 1}`;
      case 'move': {
        const key = { forward: 'forward', back: 'back', left: 'strafeLeft', right: 'strafeRight' }[command.direction] as ControlAction | undefined;
        if (key === undefined) throw new Error('direction must be forward, back, left, or right');
        const seconds = clamp(command.seconds ?? 1, 0.1, 5);
        const before = host.snapshot().player;
        host.hold(key, true);
        if (command.run === true) host.hold('run', true);
        this.steps(seconds);
        const after = host.snapshot().player;
        return `moved ${round(Math.hypot(after.x - before.x, after.z - before.z))} m ${command.direction}`;
      }
      case 'turn': {
        const view = host.view();
        host.setView(view.yaw + finite(command.degrees) * Math.PI / 180, view.pitch);
        this.steps(FRAME);
        return `now facing ${Math.round(normalizeDegrees(host.view().yaw * 180 / Math.PI))}°`;
      }
      case 'look': {
        const view = host.view();
        host.setView(view.yaw, clamp(view.pitch + finite(command.degrees) * Math.PI / 180, -1.45, 1.45));
        this.steps(FRAME);
        return `pitch ${Math.round(host.view().pitch * 180 / Math.PI)}°`;
      }
      case 'face': {
        const eye = host.eye();
        if (command.target !== undefined) {
          const point = this.locate(command.target);
          host.setView(Math.atan2(point.x - eye.x, -(point.z - eye.z)), clamp(Math.atan2(point.y - eye.y, Math.hypot(point.x - eye.x, point.z - eye.z)), -1.45, 1.45));
        } else {
          host.setView(finite(command.bearing ?? 0) * Math.PI / 180, 0);
        }
        this.steps(FRAME);
        return `now facing ${Math.round(normalizeDegrees(host.view().yaw * 180 / Math.PI))}°`;
      }
      case 'aim': {
        if (!/^[rt]\d+$/.test(command.target ?? '')) throw new Error('aim needs a robot or tank id like "r2" or "t1"');
        host.setScope(true);
        // Let the scope come up and the sway settle, tracking the target as it moves.
        this.steps(0.45, () => {
          const aim = solveAim(host.eye(), this.locate(command.target));
          host.setView(aim.yaw, aim.pitch);
        });
        const snapshot = host.snapshot();
        const robot = snapshot.robots.find((candidate) => candidate.id === command.target)!;
        const clear = host.lineOfSight(host.eye(), robot.chest);
        return `aimed at ${command.target} (${Math.round(Math.hypot(robot.position.x - host.eye().x, robot.position.z - host.eye().z))} m)${clear ? '' : ' - something is in the way'}`;
      }
      case 'weapon': {
        if (command.name !== 'rifle' && command.name !== 'carbine') throw new Error('name must be "rifle" or "carbine"');
        host.tap(command.name === 'rifle' ? 'weapon1' : 'weapon2');
        this.steps(0.6);
        const now = host.snapshot().player.weapon;
        return now === command.name ? `now holding the ${now === 'rifle' ? 'sniper rifle' : 'robot carbine'}` : 'no carbine yet: destroy a robot and walk up to it to take one';
      }
      case 'fire': {
        if (host.snapshot().player.weapon === 'carbine') {
          const carbine = host.snapshot().player.carbine;
          if (carbine.magazine === 0) {
            if (carbine.reserve === 0) return 'click - carbine out of ammo; switch to the rifle';
            host.tap('reload');
            this.steps(2.3);
            return `carbine reloaded (${host.snapshot().player.carbine.magazine} rounds) - fire again`;
          }
          const rounds = clamp(command.rounds ?? 5, 1, 24);
          const before = carbine.magazine;
          host.hold('fire', true);
          this.steps(rounds * 0.11 + 0.02, () => before - host.snapshot().player.carbine.magazine >= rounds);
          host.hold('fire', false);
          this.steps(0.3);
          return `fired ${before - host.snapshot().player.carbine.magazine} rounds (see events)`;
        }
        const before = host.snapshot().player;
        if (before.magazine === 0) {
          if (before.reserve === 0) return 'click - out of ammo; find an ammo box';
          host.tap('reload');
          this.steps(3);
          return `magazine was empty: reloaded (${host.snapshot().player.magazine} rounds) - fire again`;
        }
        if (!before.boltReady) this.steps(1.2, () => host.snapshot().player.boltReady);
        const shotsLeft = host.snapshot().player.magazine;
        host.tap('fire');
        this.steps(0.6);
        return host.snapshot().player.magazine < shotsLeft ? 'fired (see events for the result)' : 'did not fire';
      }
      case 'scope':
        host.setScope(command.on);
        this.steps(0.35);
        return command.on ? 'scoped in' : 'scope down';
      case 'zoom':
        host.tap('zoom');
        this.steps(FRAME * 2);
        return `zoom ${host.snapshot().player.zoom}x`;
      case 'stance':
        if (!['stand', 'crouch', 'prone'].includes(command.value)) throw new Error('stance must be stand, crouch, or prone');
        host.setStance(command.value);
        this.steps(0.4);
        return `now ${host.snapshot().player.stance}`;
      case 'jump':
        host.tap('jump');
        this.steps(0.7);
        return 'jumped';
      case 'reload':
        host.tap('reload');
        this.steps(3);
        return `magazine ${host.snapshot().player.magazine}`;
      case 'interact':
        host.tap('interact');
        this.steps(0.35);
        return 'done (see events)';
      case 'search':
        host.hold('interact', true);
        this.steps(clamp(command.seconds ?? 1.6, 0.2, 4));
        return 'done (see events)';
      case 'go_to':
        return this.goTo(command);
      case 'wait': {
        const alarm = this.alarm();
        let stopped: string | null = null;
        const waited = this.steps(clamp(command.seconds ?? 1, 0.05, 10), () => { stopped = alarm(); return stopped !== null; });
        return stopped === null ? 'waited' : `stopped after ${round(waited)} s: ${stopped}`;
      }
    }
    throw new Error(`unknown command ${JSON.stringify(command)}`);
  }

  /**
   * Walks to a target along a planned route (around walls and through doorways), opening closed doors on the way,
   * until close, stuck, or out of time.
   */
  private goTo(command: Extract<AgentCommand, { do: 'go_to' }>): string {
    const host = this.host;
    const goal = (): Vec3 => command.target !== undefined ? this.locate(command.target) : { x: finite(command.x ?? NaN), y: 0, z: finite(command.z ?? NaN) };
    // Close enough to interact: containers and doors are reached from beside them, pickups by walking onto them.
    const target = command.target ?? '';
    const arrive = target === 'portal' ? 2.5 : target.startsWith('r') || target.startsWith('t') ? 8 : target.startsWith('h') || target.startsWith('k') ? 3 : target.startsWith('c') ? 1.5 : target.startsWith('d') ? 1.8 : target.startsWith('p') ? 0.7 : 1.4;
    const seconds = clamp(command.seconds ?? 30, 0.2, 60);
    const alarm = this.alarm();
    let route = host.findPath(goal(), Math.min(arrive, 1.3)) ?? [goal()];
    let waypoint = 0;
    let lastCheck = { ...host.snapshot().player };
    let sinceCheck = 0;
    let stuck = 0;
    let replans = 0;
    let doorsOpened = 0;
    const startedStanding = host.snapshot().player.stance === 'stand';
    let outcome = 'out of time';
    host.hold('forward', true);
    if (command.run === true) host.hold('run', true);
    this.steps(seconds, () => {
      const eye = host.eye();
      const point = goal();
      const feet = host.snapshot().player.y;
      const sameFloor = point.y - feet < 2.4 && point.y - feet > -1.5;
      if (Math.hypot(point.x - eye.x, point.z - eye.z) < arrive && sameFloor) { outcome = 'arrived'; return true; }
      const danger = alarm();
      if (danger !== null) { outcome = `stopped: ${danger}`; return true; }
      // Next corner of the route (the goal itself once the route is used up).
      let next = route[waypoint] ?? point;
      while (waypoint < route.length && Math.hypot(next.x - eye.x, next.z - eye.z) < 0.6) { waypoint += 1; next = route[waypoint] ?? point; }
      // At the end of the route, beside furniture the route cannot enter: that is as close as it gets.
      if (waypoint >= route.length && sameFloor && Math.hypot(point.x - eye.x, point.z - eye.z) < Math.max(arrive, 2.2)) { outcome = 'arrived'; return true; }
      host.setView(Math.atan2(next.x - eye.x, -(next.z - eye.z)), host.view().pitch * 0.9);
      sinceCheck += FRAME;
      if (sinceCheck < 0.8) return false;
      const player = host.snapshot().player;
      const moved = Math.hypot(player.x - lastCheck.x, player.z - lastCheck.z);
      lastCheck = { ...player };
      sinceCheck = 0;
      if (moved >= 0.3) { stuck = 0; return false; }
      stuck += 1;
      // A closed door in the way: open it.
      const door = host.snapshot().doors.find((candidate) => !candidate.open && Math.hypot(candidate.center.x - eye.x, candidate.center.z - eye.z) < 2.4);
      if (door !== undefined) {
        host.setView(Math.atan2(door.center.x - eye.x, -(door.center.z - eye.z)), 0);
        host.tap('interact');
        doorsOpened += 1;
        return false;
      }
      // Low doorway or ceiling: duck. Otherwise try hopping over whatever is in the way.
      if (stuck === 1 && host.snapshot().player.stance === 'stand') host.setStance('crouch');
      if (stuck === 2) host.tap('jump');
      if (stuck >= 3) {
        if (replans >= 2) {
          const level = point.y - host.snapshot().player.y;
          outcome = level > 2.4 ? 'blocked - it is upstairs and no route up was found (look for the stairs)'
            : level < -1.5 ? 'blocked - it is below you and no route down was found' : 'blocked - no way through from here';
          return true;
        }
        replans += 1;
        stuck = 0;
        route = host.findPath(point, Math.min(arrive, 1.3)) ?? [point];
        waypoint = 0;
      }
      return false;
    });
    if (host.snapshot().player.stance === 'crouch' && startedStanding) host.setStance('stand');
    const eye = host.eye();
    const point = goal();
    return `${outcome}, ${round(Math.hypot(point.x - eye.x, point.z - eye.z))} m from the target${doorsOpened > 0 ? ` (opened ${doorsOpened} door${doorsOpened > 1 ? 's' : ''})` : ''}`;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function finite(value: number): number {
  if (!Number.isFinite(value)) throw new Error('expected a number');
  return value;
}

function withoutMoving<T extends { moving: boolean }>(player: T): Omit<T, 'moving'> {
  const { moving: _moving, ...rest } = player;
  return rest;
}
