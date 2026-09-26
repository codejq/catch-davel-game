import { describe, expect, it } from 'vitest';
import { CollisionWorld } from '../src/core/collision';
import { Random } from '../src/core/random';
import { createSentry, damageSentry, hearGunshot, hitChance, playerVisibility, updateSentry, type PlayerSnapshot, type SentryShot } from '../src/enemies/sentry';
import { fireBullet, stepBullet, zeroAngle, ZERO_RANGE } from '../src/player/ballistics';
import { MAGAZINE_SIZE, RifleState } from '../src/player/rifle-state';

const player = (overrides: Partial<PlayerSnapshot> = {}): PlayerSnapshot => ({
  eye: { x: 0, y: 1.64, z: 0 }, position: { x: 0, y: 0, z: 0 }, stance: 'stand', moving: false, sprinting: false, concealed: false,
  ...overrides,
});

describe('robot sentries', () => {
  it('spot a standing player in the open and open fire', () => {
    const world = new CollisionWorld(() => 0);
    const sentry = createSentry('s', [{ x: 0, z: -40 }], true, world);
    const random = new Random('t');
    let shots = 0;
    let firstShotRange = Infinity;
    for (let tick = 0; tick < 60 * 24; tick += 1) {
      if (updateSentry(sentry, player(), world, 1 / 60, random) !== null) {
        shots += 1;
        firstShotRange = Math.min(firstShotRange, Math.hypot(sentry.position.x, sentry.position.z));
      }
    }
    expect(sentry.mode).toBe('alert');
    expect(shots).toBeGreaterThan(2);
    // It had to walk in from 40 m: robots only shoot at close quarters.
    expect(firstShotRange).toBeLessThanOrEqual(10.5);
  });

  it('cannot hurt the player from long range', () => {
    expect(hitChance(player(), 11)).toBe(0);
    expect(hitChance(player(), 100)).toBe(0);
    expect(hitChance(player(), 8)).toBeGreaterThan(0.3);
  });

  it('miss a prone player hidden in a bush', () => {
    const world = new CollisionWorld(() => 0);
    const sentry = createSentry('s', [{ x: 0, z: -60 }], true, world);
    const random = new Random('t');
    for (let tick = 0; tick < 60 * 10; tick += 1) {
      updateSentry(sentry, player({ stance: 'prone', concealed: true, eye: { x: 0, y: 0.36, z: 0 } }), world, 1 / 60, random);
    }
    expect(sentry.mode).toBe('patrol');
    expect(playerVisibility(player({ stance: 'prone', concealed: true }), 30)).toBeLessThan(playerVisibility(player(), 30) * 0.1);
  });

  it('cannot see through walls', () => {
    const world = new CollisionWorld(() => 0);
    world.addBox('solid', 0, 0, -20, 10, 4, 0.5);
    const sentry = createSentry('s', [{ x: 0, z: -40 }], true, world);
    for (let tick = 0; tick < 60 * 6; tick += 1) updateSentry(sentry, player(), world, 1 / 60, new Random('t'));
    expect(sentry.awareness).toBe(0);
  });

  it('investigate gunshots and die from a headshot', () => {
    const world = new CollisionWorld(() => 0);
    const sentry = createSentry('s', [{ x: 30, z: -30 }, { x: 40, z: -30 }], false, world);
    hearGunshot([sentry], { x: 0, y: 1.6, z: 0 }, new Random('t'));
    expect(sentry.mode).toBe('search');
    expect(sentry.lastKnown).not.toBeNull();
    expect(damageSentry(sentry, 60, { x: 0, y: 0, z: 0 })).toBe(false);
    expect(damageSentry(sentry, 150, { x: 0, y: 0, z: 0 })).toBe(true);
    expect(sentry.mode).toBe('dead');
  });
});

describe('cover from trees', () => {
  const treeWorld = () => {
    const world = new CollisionWorld(() => 0);
    // A 0.8 m trunk between the robot and the player, with a leafy crown overhead.
    world.addBox('solid', 0, 0, -1.2, 0.8, 10, 0.8, 'tree');
    world.addBox('cover', 0, 2.5, -1.2, 5, 7, 5, 'crown');
    return world;
  };

  it('a crouched player tucked behind a trunk is never spotted or hit', () => {
    const world = treeWorld();
    const sentry = createSentry('s', [{ x: 0, z: -9 }], true, world);
    sentry.mode = 'alert';
    sentry.awareness = 1;
    sentry.lastKnown = { x: 0, z: 0 };
    const random = new Random('t');
    let hits = 0;
    const crouched = player({ stance: 'crouch', eye: { x: 0, y: 1.05, z: 0 } });
    for (let tick = 0; tick < 60 * 12; tick += 1) {
      const shot = updateSentry(sentry, crouched, world, 1 / 60, random);
      if (shot?.hit) hits += 1;
    }
    expect(hits).toBe(0);
    expect(sentry.exposure).toBeLessThan(0.06);
  });

  it('cover stops stray rounds and reports where they struck', () => {
    const world = new CollisionWorld(() => 0);
    // A chest-high log: the head is visible, but low rounds bury themselves in the wood.
    world.addBox('solid', 0, 0, -1.5, 3, 1.45, 0.6, 'tree');
    const sentry = createSentry('s', [{ x: 0, z: -9 }], true, world);
    sentry.mode = 'alert';
    sentry.awareness = 1;
    const random = new Random('shots');
    const blocked: SentryShot[] = [];
    for (let tick = 0; tick < 60 * 20; tick += 1) {
      const shot = updateSentry(sentry, player(), world, 1 / 60, random);
      if (shot !== null && shot.impact !== null) blocked.push(shot);
      if (shot?.hit) expect(shot.impact).toBeNull();
    }
    expect(blocked.length).toBeGreaterThan(0);
    for (const shot of blocked) expect(shot.hit).toBe(false);
  });

  it('foliage reduces how exposed a player standing among the leaves is', () => {
    const open = new CollisionWorld(() => 0);
    const leafy = new CollisionWorld(() => 0);
    leafy.addBox('cover', 0, 0, -3, 4, 8, 4, 'crown');
    const a = createSentry('a', [{ x: 0, z: -40 }], true, open);
    const b = createSentry('b', [{ x: 0, z: -40 }], true, leafy);
    updateSentry(a, player(), open, 1 / 60, new Random('t'));
    updateSentry(b, player(), leafy, 1 / 60, new Random('t'));
    expect(b.exposure).toBeLessThan(a.exposure * 0.5);
  });
});

describe('sniper ballistics', () => {
  const flight = (targetDistance: number, aimHeight: number) => {
    const world = new CollisionWorld(() => 0);
    const sentry = createSentry('s', [{ x: 0, z: -targetDistance }], true, world);
    sentry.heading = Math.PI;
    const eye = { x: 0, y: 1.64, z: 0 };
    const bullet = fireBullet(eye, { x: 0, y: aimHeight - eye.y, z: -targetDistance });
    for (let step = 0; step < 600 && bullet.alive; step += 1) {
      const impact = stepBullet(bullet, 1 / 240, world, [sentry]);
      if (impact !== null) return impact;
    }
    return null;
  };

  it('is zeroed so the bullet meets the line of sight at the zero range', () => {
    const bullet = fireBullet({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 });
    const world = new CollisionWorld(() => -100);
    while (bullet.position.z > -ZERO_RANGE) stepBullet(bullet, 1 / 1000, world, []);
    expect(Math.abs(bullet.position.y)).toBeLessThan(0.02);
    expect(zeroAngle()).toBeGreaterThan(0);
  });

  it('lands headshots at medium range and drops at long range', () => {
    const near = flight(80, 1.95);
    expect(near?.kind).toBe('sentry');
    expect(near?.kind === 'sentry' && near.headshot).toBe(true);
    // At 380 m, aiming at the head, the bullet drops below it into the body or the ground.
    const far = flight(380, 1.95);
    expect(far === null || far.kind === 'world' || (far.kind === 'sentry' && !far.headshot)).toBe(true);
  });

  it('cycles the bolt, empties the magazine, and reloads from reserve', () => {
    const rifle = new RifleState();
    expect(rifle.fire()).toBe(true);
    expect(rifle.fire()).toBe(false);
    for (let shot = 1; shot < MAGAZINE_SIZE; shot += 1) {
      rifle.update(1.2, false, false);
      expect(rifle.fire()).toBe(true);
    }
    rifle.update(1.2, false, false);
    expect(rifle.magazine).toBe(0);
    expect(rifle.startReload()).toBe(true);
    rifle.update(3, false, false);
    expect(rifle.magazine).toBe(MAGAZINE_SIZE);
    expect(rifle.reserve).toBe(15);
  });
});
