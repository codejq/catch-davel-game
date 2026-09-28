import { describe, expect, it } from 'vitest';
import { CollisionWorld } from '../src/core/collision';
import { Random } from '../src/core/random';
import { planForces, SPAWN_CLEARANCE } from '../src/enemies/deployment';
import { createSentry, raySentry, sentrySize, updateSentry, type PlayerSnapshot } from '../src/enemies/sentry';
import { Resupply, RESUPPLY } from '../src/player/resupply';
import { RifleState } from '../src/player/rifle-state';
import { CarbineState } from '../src/weapons/carbine-state';
import { generateLayout } from '../src/world/layout';
import { WORLDS } from '../src/world/themes';

function buildWorld(index: number) {
  const layout = generateLayout(WORLDS[index]!);
  const world = new CollisionWorld((x, z) => layout.terrain.heightAt(x, z));
  for (const { parts } of layout.buildings) {
    for (const part of parts.parts) {
      if (!part.collide) continue;
      world.add('solid', part.x - part.width / 2, part.y - part.height / 2, part.z - part.depth / 2, part.x + part.width / 2, part.y + part.height / 2, part.z + part.depth / 2);
    }
  }
  return { layout, world };
}

const farPlayer: PlayerSnapshot = { eye: { x: 900, y: 1.6, z: 900 }, position: { x: 900, y: 0, z: 900 }, stance: 'stand', moving: false, sprinting: false, concealed: false };

describe('deploying the enemy', () => {
  for (const [index, theme] of WORLDS.entries()) {
    it(`sends 20+ extra robots and 10+ soldiers into ${theme.name}, away from the spawn`, () => {
      const { layout, world } = buildWorld(index);
      const forces = planForces(layout, world, new Random(`forces-${index}`));
      const robots = forces.filter((unit) => unit.kind === 'robot');
      const soldiers = forces.filter((unit) => unit.kind === 'soldier');
      expect(robots.length).toBeGreaterThanOrEqual(theme.sentries + 20 - 2);
      expect(soldiers.length).toBeGreaterThanOrEqual(10);
      expect(new Set(forces.map((unit) => unit.id)).size).toBe(forces.length);
      for (const unit of forces) {
        const start = unit.waypoints[0]!;
        expect(Math.hypot(start.x - layout.spawn.x, start.z - layout.spawn.z), unit.id).toBeGreaterThan(SPAWN_CLEARANCE * 0.8 - 4);
        if (theme.waterLevel !== null) expect(layout.terrain.heightAt(start.x, start.z), unit.id).toBeGreaterThan(theme.waterLevel);
      }
    });
  }

  it('puts them somewhere different every run', () => {
    const { layout, world } = buildWorld(0);
    const first = planForces(layout, world, new Random('run-a')).map((unit) => unit.waypoints[0]!);
    const second = planForces(layout, world, new Random('run-b')).map((unit) => unit.waypoints[0]!);
    const same = first.filter((a) => second.some((b) => Math.hypot(a.x - b.x, a.z - b.z) < 1)).length;
    expect(same).toBeLessThan(first.length / 4);
  });

  it('soldiers are life-size and faster than robots', () => {
    const world = new CollisionWorld(() => 0);
    const route = [{ x: 0, z: 0 }, { x: 0, z: 200 }];
    const robot = createSentry('r', route, false, world, 'robot');
    const soldier = createSentry('s', route, false, world, 'soldier');
    const random = new Random('pace');
    for (let tick = 0; tick < 600; tick += 1) {
      updateSentry(robot, farPlayer, world, 1 / 60, random);
      updateSentry(soldier, farPlayer, world, 1 / 60, random);
    }
    expect(soldier.position.z).toBeGreaterThan(robot.position.z * 1.4);
    expect(sentrySize(soldier).headHeight).toBeLessThan(2);
    expect(sentrySize(robot).headHeight).toBeGreaterThan(3);
    // A round over a soldier's head that would hit a robot's chest misses him.
    const origin = { x: 0, y: 2.6, z: -20 };
    expect(raySentry(origin, { x: 0, y: 0, z: 1 }, soldier)).toBeNull();
  });
});

describe('resupply', () => {
  it('an empty rifle and carbine slowly get rounds back and reload themselves', () => {
    const rifle = new RifleState();
    rifle.magazine = 0; rifle.reserve = 0;
    const carbine = new CarbineState();
    carbine.take();
    carbine.magazine = 0; carbine.reserve = 0;
    const resupply = new Resupply();
    const loadout = { health: 100 };
    for (let tick = 0; tick < 60 * 30; tick += 1) {
      resupply.step(1 / 60, rifle, carbine, loadout, 0);
      rifle.update(1 / 60, false, false);
      carbine.update(1 / 60, false);
    }
    expect(rifle.magazine).toBeGreaterThan(0);
    expect(rifle.magazine + rifle.reserve).toBeGreaterThanOrEqual(5);
    expect(rifle.magazine + rifle.reserve).toBeLessThanOrEqual(RESUPPLY.rifleFloor);
    expect(carbine.magazine).toBeGreaterThan(0);
    expect(carbine.magazine + carbine.reserve).toBe(RESUPPLY.carbineFloor);
  });

  it('health comes back after a few seconds without damage, up to full', () => {
    const resupply = new Resupply();
    const rifle = new RifleState();
    const carbine = new CarbineState();
    const loadout = { health: 20 };
    resupply.step(1, rifle, carbine, loadout, 2);
    expect(loadout.health).toBe(20);
    let sinceHurt = RESUPPLY.healthDelay;
    for (let tick = 0; tick < 60 * 30; tick += 1) { sinceHurt += 1 / 60; resupply.step(1 / 60, rifle, carbine, loadout, sinceHurt); }
    expect(loadout.health).toBe(100);
  });
});
