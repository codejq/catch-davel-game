import * as THREE from 'three';
import type { CollisionWorld, Vec3 } from '../core/collision';
import { Random } from '../core/random';
import { createTankRig, poseTank, type TankRig } from '../enemies/tank-mesh';
import {
  createTank, damageTank, pushOutOfTank, rayTank, splashDamage, TANK, tankHearsGunshot, updateTank, type TankShell, type TankState,
} from '../enemies/tank';
import { sentrySize, type PlayerSnapshot, type SentryState, type Victim } from '../enemies/sentry';
import type { HitTarget } from '../player/ballistics';
import type { WorldLayout } from '../world/layout';
import { alarm, CIVILIAN, rayCivilian, updateCivilian, type Civilian } from './civilians';
import { createDogRig, createPersonRig, createPicnic, poseDog, posePerson, type DogRig, type PersonRig } from './meshes';
import { planPopulation } from './placement';

const TANK_PAINT: Record<string, number> = { 'green-valley': 0x55603f, 'dust-ridge': 0xb49a6a, 'frost-pass': 0xc8ccd0 };

/** Sound hooks the population plays through the game's audio. */
export interface PopulationSounds {
  cannon(pan: number, distance: number): void;
  explosion(pan: number, distance: number): void;
  bark(pan: number, distance: number): void;
  scream(pan: number, distance: number): void;
}

/** What happened this frame that the game needs to act on. */
export interface PopulationEvents {
  /** Damage from tank shells bursting near the player. */
  playerDamage: number;
  /** Where shells burst (for the damage flash and direction marker). */
  readonly explosions: Vec3[];
  /** Civilians killed by robots or shells (never counted against the player). */
  readonly killedByEnemies: Civilian[];
  /** Tanks that fired this frame. */
  readonly tankShots: TankState[];
}

interface Shell { readonly shell: TankShell; age: number; readonly mesh: THREE.Mesh }
interface Blast { readonly mesh: THREE.Mesh; readonly light: THREE.PointLight; age: number }

/**
 * Everyone besides the robots: civilian families (some picnicking), their dogs, and tanks. Owns their AI, their
 * meshes, tank shells, and explosions; the game feeds it the player, the robots, and gunshots.
 */
export class Population {
  readonly civilians: Civilian[] = [];
  readonly tanks: TankState[] = [];
  private readonly personRigs = new Map<string, PersonRig>();
  private readonly dogRigs = new Map<string, DogRig>();
  private readonly tankRigs: TankRig[] = [];
  private readonly shells: Shell[] = [];
  private readonly blasts: Blast[] = [];
  /** Explosion lights, always in the scene (dark until a blast) so the set of lights never changes mid-game. */
  private readonly blastLights = [0, 1].map(() => new THREE.PointLight(0xffa050, 0, 30, 2));
  private nextBlastLight = 0;
  /** Which civilian each robot is picking on, and when robots may pick on someone again. */
  private readonly victims = new Map<SentryState, { civilian: Civilian; since: number; shots: number }>();
  private readonly victimCooldown = new Map<SentryState, number>();
  private readonly byId = new Map<string, Civilian>();
  private victimClock = 0;
  private panicClock = 0;
  /** Seconds until each dog may bark again. */
  private readonly barkWait = new Map<Civilian, number>();
  /** Where the player hears from; sounds are placed relative to this. */
  private listener: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly targetList: HitTarget[];

  constructor(layout: WorldLayout, private readonly world: CollisionWorld, private readonly root: THREE.Object3D, private readonly random: Random,
    private readonly sounds: PopulationSounds) {
    const plan = planPopulation(layout, world, random);
    root.add(...this.blastLights);
    for (const picnic of plan.picnics) root.add(createPicnic(picnic));
    for (const civilian of plan.civilians) {
      this.civilians.push(civilian);
      this.byId.set(civilian.id, civilian);
      if (civilian.kind === 'dog') {
        const rig = createDogRig(civilian);
        this.dogRigs.set(civilian.id, rig);
        root.add(rig.root);
      } else {
        const rig = createPersonRig(civilian);
        this.personRigs.set(civilian.id, rig);
        root.add(rig.root);
      }
    }
    for (const tankPlan of plan.tanks) {
      const tank = createTank(tankPlan.id, tankPlan.route, world, tankPlan.start);
      this.tanks.push(tank);
      const rig = createTankRig(TANK_PAINT[layout.theme.id] ?? 0x5a6048);
      this.tankRigs.push(rig);
      root.add(rig.root);
    }
    // Hit targets are built once; each checks whether its owner is still alive.
    this.targetList = [
      ...this.tanks.map((tank): HitTarget => ({ kind: 'tank', id: tank.id, hit: (origin, direction) => rayTank(origin, direction, tank) })),
      ...this.civilians.map((civilian): HitTarget => ({ kind: civilian.kind === 'dog' ? 'dog' : 'civilian', id: civilian.id, hit: (origin, direction) => rayCivilian(origin, direction, civilian) })),
    ];
  }

  /** Everything a bullet can hit besides the robots. */
  targets(): readonly HitTarget[] { return this.targetList; }

  civilian(id: string): Civilian | undefined { return this.byId.get(id); }

  tank(id: string): TankState | undefined { return this.tanks.find((tank) => tank.id === id); }

  /** The civilian a robot is currently picking on, if any. */
  victimFor(sentry: SentryState): Victim | null {
    const entry = this.victims.get(sentry);
    return entry === undefined ? null : { id: entry.civilian.id, position: entry.civilian.position };
  }

  /** A gunshot (or a burst of gunfire) at `origin`: civilians within `radius` panic; tanks turn to look. */
  gunshot(origin: Vec3, radius: number): void {
    for (const civilian of this.civilians) {
      if (Math.hypot(civilian.position.x - origin.x, civilian.position.z - origin.z) < radius) this.frighten(civilian, origin);
    }
    for (const tank of this.tanks) tankHearsGunshot(tank, origin);
  }

  /** Kills an innocent (shot by anyone). Returns false if already dead. */
  kill(civilian: Civilian): boolean {
    if (civilian.mode === 'dead') return false;
    civilian.mode = 'dead';
    civilian.deathTime = 0;
    // Everyone nearby panics at the sight of it.
    for (const other of this.civilians) {
      if (other !== civilian && Math.hypot(other.position.x - civilian.position.x, other.position.z - civilian.position.z) < 30) this.frighten(other, civilian.position);
    }
    return true;
  }

  /** A round hit a tank. Returns true when it is destroyed. */
  hitTank(tank: TankState, damage: number, shooter: Vec3): boolean {
    const destroyed = damageTank(tank, damage, shooter);
    if (destroyed) this.explode({ x: tank.position.x, y: tank.position.y + 1.5, z: tank.position.z }, shooter, 2.2);
    return destroyed;
  }

  /** Keeps the player from walking through tanks. */
  pushPlayer(position: Vec3, radius: number): void {
    for (const tank of this.tanks) pushOutOfTank(position, radius, tank);
  }

  update(dt: number, player: PlayerSnapshot, sentries: readonly SentryState[], time: number): PopulationEvents {
    const events: PopulationEvents = { playerDamage: 0, explosions: [], killedByEnemies: [], tankShots: [] };
    this.listener = player.eye;
    this.chooseVictims(dt, sentries);
    this.panicAtThreats(dt, sentries);

    for (const civilian of this.civilians) {
      const owner = civilian.owner === null ? null : this.byId.get(civilian.owner) ?? null;
      updateCivilian(civilian, dt, this.world, this.random, owner);
    }
    for (const tank of this.tanks) {
      const shell = updateTank(tank, player, this.world, dt, this.random);
      if (shell !== null) {
        events.tankShots.push(tank);
        this.launch(shell);
        this.sounds.cannon(0, Math.hypot(tank.position.x - player.eye.x, tank.position.z - player.eye.z));
        this.gunshot(shell.from, 60);
      }
    }
    // Shells in flight; each bursts where it lands.
    for (let index = this.shells.length - 1; index >= 0; index -= 1) {
      const flying = this.shells[index]!;
      flying.age += dt;
      const t = Math.min(1, flying.age / Math.max(flying.shell.flight, 0.01));
      const { from, to } = flying.shell;
      flying.mesh.position.set(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, from.z + (to.z - from.z) * t);
      if (t < 1) continue;
      this.root.remove(flying.mesh);
      this.shells.splice(index, 1);
      events.explosions.push(to);
      events.playerDamage += splashDamage(to, { x: player.position.x, y: player.position.y + 0.9, z: player.position.z });
      for (const civilian of this.civilians) {
        if (civilian.mode !== 'dead' && splashDamage(to, civilian.position) > 8 && this.kill(civilian)) events.killedByEnemies.push(civilian);
      }
      this.explode(to, player.eye, 1);
    }
    this.updateBlasts(dt);
    this.pose(time);
    return events;
  }

  /** A robot's round at a civilian landed: kill them if it hit, and frighten everyone nearby either way. */
  robotShotCivilian(id: string, hit: boolean, from: Vec3): Civilian | null {
    const civilian = this.byId.get(id);
    for (const entry of this.victims.values()) if (entry.civilian.id === id) entry.shots += 1;
    this.gunshot(from, 30);
    if (civilian === undefined || !hit) return null;
    return this.kill(civilian) ? civilian : null;
  }

  /** Distance from the player to a sound. */
  private hearing(at: { x: number; z: number }): number {
    return Math.hypot(at.x - this.listener.x, at.z - this.listener.z);
  }

  private frighten(civilian: Civilian, threat: Vec3): void {
    const wasCalm = civilian.mode === 'calm';
    alarm(civilian, threat, this.random);
    const heard = this.hearing(civilian.position);
    if (wasCalm && civilian.mode !== 'calm' && civilian.kind !== 'dog' && heard < 60 && this.random.chance(0.35)) this.sounds.scream(0, heard);
  }

  /** Every couple of seconds, a patrolling robot may pick on a civilian it can see nearby. */
  private chooseVictims(dt: number, sentries: readonly SentryState[]): void {
    for (const [sentry, entry] of this.victims) {
      entry.since += dt;
      // A robot gives up after a few rounds (a civilian in cover can't be hit), so it doesn't keep firing for ever.
      if (entry.civilian.mode === 'dead' || sentry.mode !== 'patrol' || entry.since > 25 || entry.shots >= 4) {
        this.victims.delete(sentry);
        this.victimCooldown.set(sentry, 30);
      }
    }
    for (const [sentry, left] of this.victimCooldown) this.victimCooldown.set(sentry, left - dt);
    this.victimClock -= dt;
    if (this.victimClock > 0) return;
    this.victimClock = 2;
    for (const sentry of sentries) {
      if (sentry.mode !== 'patrol' || this.victims.has(sentry) || (this.victimCooldown.get(sentry) ?? 0) > 0 || !this.random.chance(0.015)) continue;
      const eye = { x: sentry.position.x, y: sentry.position.y + sentrySize(sentry).eyeHeight, z: sentry.position.z };
      let chosen: Civilian | null = null; let nearest = 35;
      for (const civilian of this.civilians) {
        if (civilian.mode === 'dead' || civilian.kind === 'dog') continue;
        const distance = Math.hypot(civilian.position.x - sentry.position.x, civilian.position.z - sentry.position.z);
        if (distance < nearest && this.world.lineOfSight(eye, { x: civilian.position.x, y: civilian.position.y + 1.2, z: civilian.position.z })) { nearest = distance; chosen = civilian; }
      }
      if (chosen !== null) this.victims.set(sentry, { civilian: chosen, since: 0, shots: 0 });
    }
  }

  /** Alerted or hunting robots and tanks coming close set civilians running; dogs bark at robots. */
  private panicAtThreats(dt: number, sentries: readonly SentryState[]): void {
    this.panicClock -= dt;
    for (const [dog, wait] of this.barkWait) this.barkWait.set(dog, wait - dt);
    if (this.panicClock > 0) return;
    this.panicClock = 0.5;
    for (const civilian of this.civilians) {
      if (civilian.mode === 'dead') continue;
      for (const sentry of sentries) {
        if (sentry.mode === 'dead') continue;
        const hunting = sentry.mode === 'alert' || this.victims.has(sentry);
        const distance = Math.hypot(sentry.position.x - civilian.position.x, sentry.position.z - civilian.position.z);
        if (hunting && distance < CIVILIAN.robotPanicRange) this.frighten(civilian, sentry.position);
        // A dog barks at a robot close by now and then (each dog waits 20-30 s), heard only when you are near.
        if (civilian.kind === 'dog' && distance < 18 && (this.barkWait.get(civilian) ?? 0) <= 0) {
          this.barkWait.set(civilian, 20 + this.random.next() * 10);
          const heard = this.hearing(civilian.position);
          if (heard < 45) this.sounds.bark(0, heard);
        }
      }
      for (const tank of this.tanks) {
        if (tank.mode === 'alert' && Math.hypot(tank.position.x - civilian.position.x, tank.position.z - civilian.position.z) < 25) this.frighten(civilian, tank.position);
      }
    }
  }

  private launch(shell: TankShell): void {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd080 }));
    mesh.position.set(shell.from.x, shell.from.y, shell.from.z);
    this.root.add(mesh);
    this.shells.push({ shell, age: 0, mesh });
  }

  private explode(point: Vec3, listener: Vec3, size: number): void {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    mesh.position.set(point.x, point.y, point.z);
    mesh.scale.setScalar(0.5 * size);
    // Reuse one of the blast lights that always stay in the scene: adding or removing a light makes three.js
    // recompile every material, which froze the game for a moment at each explosion.
    const light = this.blastLights[this.nextBlastLight]!;
    this.nextBlastLight = (this.nextBlastLight + 1) % this.blastLights.length;
    light.intensity = 80 * size;
    light.position.set(point.x, point.y + 1, point.z);
    this.root.add(mesh);
    this.blasts.push({ mesh, light, age: 0 });
    this.sounds.explosion(0, Math.hypot(point.x - listener.x, point.z - listener.z));
    this.gunshot(point, 40);
  }

  private updateBlasts(dt: number): void {
    for (let index = this.blasts.length - 1; index >= 0; index -= 1) {
      const blast = this.blasts[index]!;
      blast.age += dt;
      const t = blast.age / 0.8;
      blast.mesh.scale.setScalar(0.5 + t * TANK.splashRadius);
      (blast.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1 - t));
      blast.light.intensity = Math.max(0, blast.light.intensity - dt * 200);
      if (t >= 1) {
        this.root.remove(blast.mesh);
        blast.light.intensity = 0;
        this.blasts.splice(index, 1);
      }
    }
  }

  private pose(time: number): void {
    for (const civilian of this.civilians) {
      const person = this.personRigs.get(civilian.id);
      if (person !== undefined) posePerson(person, civilian, time);
      const dog = this.dogRigs.get(civilian.id);
      if (dog !== undefined) poseDog(dog, civilian, time);
    }
    this.tanks.forEach((tank, index) => poseTank(this.tankRigs[index]!, tank, time));
  }
}

/** A fresh random stream for a world's population (different families and dogs every run). */
export function populationRandom(seed: string): Random {
  return new Random(`population-${seed}`);
}
