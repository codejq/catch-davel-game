import { describe, expect, it } from 'vitest';
import { CollisionWorld } from '../src/core/collision';
import { Random } from '../src/core/random';
import { alarm, rayCivilian, updateCivilian, type Civilian } from '../src/population/civilians';
import { planPopulation } from '../src/population/placement';
import { generateLayout } from '../src/world/layout';
import { WORLDS } from '../src/world/themes';
import { createTank, damageTank, pushOutOfTank, rayTank, splashDamage, TANK, updateTank } from '../src/enemies/tank';
import { createSentry, updateSentry, type PlayerSnapshot } from '../src/enemies/sentry';
import { CARBINE, CarbineState } from '../src/weapons/carbine-state';
import { applyLoot, type Loadout } from '../src/player/loot';
import { RifleState } from '../src/player/rifle-state';

const player = (x = 0, z = 0, overrides: Partial<PlayerSnapshot> = {}): PlayerSnapshot => ({
  eye: { x, y: 1.64, z }, position: { x, y: 0, z }, stance: 'stand', moving: false, sprinting: false, concealed: false, ...overrides,
});

function buildWorld(index: number) {
  const layout = generateLayout(WORLDS[index]!);
  const world = new CollisionWorld((x, z) => layout.terrain.heightAt(x, z));
  for (const { parts } of layout.buildings) {
    for (const part of parts.parts) {
      if (!part.collide) continue;
      world.add('solid', part.x - part.width / 2, part.y - part.height / 2, part.z - part.depth / 2, part.x + part.width / 2, part.y + part.height / 2, part.z + part.depth / 2, part.role === 'glass' || part.role === 'stairs' ? part.role : undefined);
    }
  }
  return { layout, world };
}

function civilian(overrides: Partial<Civilian> = {}): Civilian {
  return {
    id: 'h1', kind: 'adult', family: 0, look: { skin: 0, hair: 0, shirt: 0, pants: 0, shoes: 0, longHair: false },
    home: { x: 0, z: 0, heading: 0 }, activity: 'idle', seat: null, owner: null, bravery: 1, cheer: 0.5,
    position: { x: 0, y: 0, z: 0 }, heading: 0, mode: 'calm', target: null, threat: null, timer: 0, walkPhase: 0, speed: 0, deathTime: 0, idleTimer: 0,
    ...overrides,
  };
}

describe('populating the worlds', () => {
  for (const [index, theme] of WORLDS.entries()) {
    it(`settles families, dogs, and four to six tanks in ${theme.name}, all on open dry ground`, () => {
      const { layout, world } = buildWorld(index);
      const plan = planPopulation(layout, world, new Random(`people-${index}`));
      const people = plan.civilians.filter((person) => person.kind !== 'dog');
      expect(new Set(people.map((person) => person.family)).size).toBeGreaterThanOrEqual(3);
      expect(plan.civilians.some((person) => person.kind === 'dog')).toBe(true);
      expect(plan.tanks.length).toBeGreaterThanOrEqual(4);
      expect(plan.tanks.length).toBeLessThanOrEqual(6);
      for (const person of plan.civilians) {
        expect(world.inside('solid', { x: person.position.x, y: person.position.y + 0.9, z: person.position.z }, 0.1), person.id).toBeNull();
        if (theme.waterLevel !== null) expect(layout.terrain.heightAt(person.position.x, person.position.z)).toBeGreaterThan(theme.waterLevel);
      }
      for (const tank of plan.tanks) {
        for (const point of tank.route) if (theme.waterLevel !== null) expect(layout.terrain.heightAt(point.x, point.z)).toBeGreaterThan(theme.waterLevel);
        const start = tank.route[tank.start]!;
        expect(Math.hypot(start.x - layout.spawn.x, start.z - layout.spawn.z)).toBeGreaterThan(40);
      }
      expect(new Set(plan.civilians.map((person) => person.id)).size).toBe(plan.civilians.length);
    });
  }
});

describe('civilians', () => {
  it('a brave civilian runs for cover away from gunfire, hides, then goes home', () => {
    const world = new CollisionWorld(() => 0);
    world.addBox('solid', 6, 0, 0, 3, 3, 3);
    const person = civilian({ bravery: 1 });
    const random = new Random('run');
    alarm(person, { x: 20, z: 0 }, random);
    expect(person.mode).toBe('flee');
    let hidden = false;
    for (let tick = 0; tick < 60 * 12; tick += 1) {
      updateCivilian(person, 1 / 60, world, random, null);
      if (person.mode === 'hide' && !world.lineOfSight({ x: 20, y: 1.6, z: 0 }, { x: person.position.x, y: 0.9, z: person.position.z })) hidden = true;
    }
    expect(hidden).toBe(true);
    for (let tick = 0; tick < 60 * 40 && person.mode !== 'calm'; tick += 1) updateCivilian(person, 1 / 60, world, random, null);
    expect(person.mode).toBe('calm');
    expect(Math.hypot(person.position.x, person.position.z)).toBeLessThan(1);
  });

  it('a timid civilian freezes and cowers on the spot', () => {
    const person = civilian({ bravery: 0 });
    alarm(person, { x: 10, z: 0 }, new Random('freeze'));
    expect(person.mode).toBe('hide');
    updateCivilian(person, 0.5, new CollisionWorld(() => 0), new Random('freeze'), null);
    expect(Math.hypot(person.position.x, person.position.z)).toBeLessThan(0.01);
  });

  it('dogs trot after their owner', () => {
    const world = new CollisionWorld(() => 0);
    const owner = civilian({ position: { x: 20, y: 0, z: 0 } });
    const dog = civilian({ id: 'k1', kind: 'dog', owner: 'h1', activity: 'stroll' });
    for (let tick = 0; tick < 60 * 10; tick += 1) updateCivilian(dog, 1 / 60, world, new Random(`dog-${tick}`), owner);
    expect(Math.hypot(dog.position.x - 20, dog.position.z)).toBeLessThan(5);
  });

  it('can be hit by a round, and not once dead', () => {
    const person = civilian({ position: { x: 0, y: 0, z: -10 } });
    expect(rayCivilian({ x: 0, y: 1.5, z: 0 }, { x: 0, y: 0, z: -1 }, person)).toBeCloseTo(9.73, 1);
    expect(rayCivilian({ x: 3, y: 1.5, z: 0 }, { x: 0, y: 0, z: -1 }, person)).toBeNull();
    person.mode = 'dead';
    expect(rayCivilian({ x: 0, y: 1.5, z: 0 }, { x: 0, y: 0, z: -1 }, person)).toBeNull();
  });

  it('patrolling robots pick on a civilian: they close in and shoot at them, not the hidden player', () => {
    const world = new CollisionWorld(() => 0);
    const robot = createSentry('r', [{ x: 0, z: -30 }], true, world);
    const victim = civilian({ position: { x: 0, y: 0, z: 0 } });
    const random = new Random('victim');
    let shotAt: string | undefined;
    for (let tick = 0; tick < 60 * 20 && shotAt === undefined; tick += 1) {
      const shot = updateSentry(robot, player(200, 200, { stance: 'prone', concealed: true }), world, 1 / 60, random, { id: victim.id, position: victim.position });
      if (shot !== null) shotAt = shot.victim;
    }
    expect(shotAt).toBe('h1');
    expect(Math.hypot(robot.position.x, robot.position.z)).toBeLessThan(9);
  });
});

describe('tanks', () => {
  const route = [{ x: 0, z: -80 }, { x: 0, z: -20 }, { x: 40, z: -20 }];

  it('drive their route while nothing is wrong', () => {
    const world = new CollisionWorld(() => 0);
    const tank = createTank('t1', route, world);
    for (let tick = 0; tick < 60 * 10; tick += 1) updateTank(tank, player(500, 500, { stance: 'prone', concealed: true }), world, 1 / 60, new Random(`t${tick}`));
    expect(tank.position.z).toBeGreaterThan(-60);
    expect(tank.mode).toBe('patrol');
  });

  it('spot a player in the open, turn the turret, and shell them only within range', () => {
    const world = new CollisionWorld(() => 0);
    const near = createTank('t1', [{ x: 0, z: -30 }, { x: 0, z: -29 }], world);
    const far = createTank('t2', [{ x: 60, z: -60 }, { x: 60, z: -59 }], world);
    const random = new Random('tank');
    let nearShots = 0; let farShots = 0;
    for (let tick = 0; tick < 60 * 20; tick += 1) {
      if (updateTank(near, player(), world, 1 / 60, random) !== null) nearShots += 1;
      far.position = { x: 60, y: 0, z: -60 };
      if (updateTank(far, player(), world, 1 / 60, random) !== null) farShots += 1;
    }
    expect(near.mode).toBe('alert');
    expect(nearShots).toBeGreaterThan(1);
    expect(farShots).toBe(0);
  });

  it('take four rifle hits, block bullets with the hull, and push the player aside', () => {
    const world = new CollisionWorld(() => 0);
    const tank = createTank('t1', [{ x: 0, z: 0 }, { x: 0, z: 10 }], world);
    expect(rayTank({ x: 20, y: 1, z: 0 }, { x: -1, y: 0, z: 0 }, tank)).toBeCloseTo(20 - TANK.halfWidth, 1);
    expect(rayTank({ x: 20, y: 6, z: 0 }, { x: -1, y: 0, z: 0 }, tank)).toBeNull();
    const point = { x: 0.5, y: 0, z: 1 };
    expect(pushOutOfTank(point, 0.32, tank)).toBe(true);
    expect(Math.abs(point.x) >= TANK.halfWidth + 0.3 || Math.abs(point.z) >= TANK.halfLength + 0.3).toBe(true);
    expect(splashDamage({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toBe(TANK.splashDamage);
    expect(splashDamage({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 })).toBe(0);
    for (let hit = 1; hit <= 3; hit += 1) expect(damageTank(tank, 100, { x: 50, y: 0, z: 0 })).toBe(false);
    expect(damageTank(tank, 100, { x: 50, y: 0, z: 0 })).toBe(true);
    expect(rayTank({ x: 20, y: 1, z: 0 }, { x: -1, y: 0, z: 0 }, tank)).toBeNull();
  });
});

describe('the robot carbine', () => {
  it('fires automatically, empties, and reloads from rounds taken off robots', () => {
    const carbine = new CarbineState();
    expect(carbine.fire()).toBe(false);
    expect(carbine.take()).toEqual({ unlocked: true, rounds: CARBINE.roundsPerPickup });
    let fired = 0;
    for (let tick = 0; tick < 60 * 5; tick += 1) { if (carbine.fire()) fired += 1; carbine.update(1 / 60, true); }
    expect(fired).toBe(CARBINE.magazine);
    expect(carbine.startReload()).toBe(true);
    carbine.update(CARBINE.reloadSeconds + 0.1, false);
    expect(carbine.magazine).toBe(CARBINE.magazine);
    expect(carbine.take()).toEqual({ unlocked: false, rounds: CARBINE.roundsPerPickup });
  });

  it('taking a robot carbine adds the weapon and its armor plates', () => {
    const loadout: Loadout = { health: 100, armor: 10, lives: 0, money: 0, suppressor: false };
    const carbine = new CarbineState();
    expect(applyLoot({ kind: 'carbine', amount: 1 }, loadout, new RifleState(), carbine)).toContain('ROBOT CARBINE');
    expect(carbine.owned).toBe(true);
    expect(loadout.armor).toBe(10 + CARBINE.armorPerPickup);
  });
});
