import { describe, expect, it } from 'vitest';
import { CollisionWorld } from '../src/core/collision';
import { createSentry, SENTRY } from '../src/enemies/sentry';
import { fireBullet, stepBullet } from '../src/player/ballistics';
import { bearingDegrees, describeObservation, relativeDegrees, solveAim, type Observation } from '../src/agent/observation';

describe('agent helpers', () => {
  it('uses compass bearings: north is -Z, east is +X', () => {
    const origin = { x: 0, y: 0, z: 0 };
    expect(bearingDegrees(origin, { x: 0, z: -10 })).toBeCloseTo(0);
    expect(bearingDegrees(origin, { x: 10, z: 0 })).toBeCloseTo(90);
    expect(bearingDegrees(origin, { x: 0, z: 10 })).toBeCloseTo(180);
    expect(bearingDegrees(origin, { x: -10, z: 0 })).toBeCloseTo(270);
    expect(relativeDegrees(10, 350)).toBeCloseTo(20);
    expect(relativeDegrees(350, 10)).toBeCloseTo(-20);
  });

  it('solves aim with bullet drop so the round lands on the robot at any range', () => {
    for (const range of [8, 60, 180, 320, 450]) {
      const world = new CollisionWorld(() => -50);
      const sentry = createSentry('target', [{ x: range * 0.6, z: -range * 0.8 }], true, world);
      sentry.position.y = 3;
      const eye = { x: 0, y: 1.64, z: 0 };
      const chest = { x: sentry.position.x, y: sentry.position.y + (SENTRY.bodyBottom + SENTRY.bodyTop) / 2, z: sentry.position.z };
      const aim = solveAim(eye, chest);
      const direction = { x: Math.sin(aim.yaw) * Math.cos(aim.pitch), y: Math.sin(aim.pitch), z: -Math.cos(aim.yaw) * Math.cos(aim.pitch) };
      const bullet = fireBullet(eye, direction);
      let impact = null;
      for (let step = 0; step < 2000 && bullet.alive && impact === null; step += 1) impact = stepBullet(bullet, 1 / 480, world, [sentry]);
      expect(impact?.kind, `range ${range}`).toBe('sentry');
    }
  });

  it('writes a readable briefing', () => {
    const observation: Observation = {
      time: 12.5, phase: 'playing', world: { index: 0, count: 3, name: 'Green Valley' },
      objectives: [{ text: 'Find the keycard', done: false }],
      player: {
        x: 1, y: 0, z: 2, heading: 90, pitch: 0, stance: 'crouch', health: 80, armor: 20, lives: 1, money: 50,
        magazine: 4, capacity: 5, reserve: 12, reloading: false, boltReady: true, scoped: false, zoom: 4, suppressor: false,
        visibility: 'hidden', indoors: false, keycard: false, weapon: 'rifle', carbine: { owned: true, magazine: 20, reserve: 30 },
      },
      innocents: [{ id: 'h3', kind: 'child', bearing: 40, relative: -50, distance: 22, state: 'hiding' }],
      robots: [{ id: 'r2', kind: 'robot', bearing: 100, relative: 10, distance: 64, state: 'alert', tactic: 'flank', seesYou: false, inSight: true, canHurtYou: false }],
      nearby: [{ id: 'c3', kind: 'container', detail: 'crate, unsearched', bearing: 200, relative: 110, distance: 12 }],
      buildings: [{ id: 'b2', bearing: 30, relative: -60, distance: 45, unsearched: 3 }],
      portal: { bearing: 0, relative: -90, distance: 140, unlocked: false },
      crosshair: { robot: null, distance: 30, innocent: 'h3' },
      prompt: 'Search crate',
      events: ['your shot missed and hit a tree 60 m away'],
    };
    const text = describeObservation(observation);
    expect(text).toContain('r2: 64 m at 10°');
    expect(text).toContain('flank');
    expect(text).toContain('c3 container');
    expect(text).toContain('locked');
    expect(text).toContain('b2 45 m');
    expect(text).toContain('do not fire');
    expect(text).toContain('h3 child 22 m');
    expect(text).toContain('Robot carbine: 20 loaded');
    expect(text).toContain('your shot missed');
  });
});

describe('agent pathfinding', () => {
  const buildWorld = async () => {
    const { generateLayout } = await import('../src/world/layout');
    const { WORLDS } = await import('../src/world/themes');
    const layout = generateLayout(WORLDS[0]!);
    const world = new CollisionWorld((x, z) => layout.terrain.heightAt(x, z));
    for (const { parts } of layout.buildings) {
      for (const part of parts.parts) {
        if (!part.collide) continue;
        world.add('solid', part.x - part.width / 2, part.y - part.height / 2, part.z - part.depth / 2, part.x + part.width / 2, part.y + part.height / 2, part.z + part.depth / 2, part.role === 'glass' || part.role === 'stairs' ? part.role : undefined);
      }
      for (const door of parts.doors) {
        const endX = door.hingeX + Math.cos(door.closedYaw) * door.width; const endZ = door.hingeZ - Math.sin(door.closedYaw) * door.width;
        world.add('solid', Math.min(door.hingeX, endX) - 0.08, door.hingeY, Math.min(door.hingeZ, endZ) - 0.08, Math.max(door.hingeX, endX) + 0.08, door.hingeY + door.height, Math.max(door.hingeZ, endZ) + 0.08, `door:${door.id}`);
      }
      for (const box of parts.containers) world.addBox('solid', box.x, box.y, box.z, Math.max(box.width, box.depth) * 0.95, box.height, Math.max(box.width, box.depth) * 0.95);
    }
    return { layout, world };
  };

  it('climbs the stairs to reach a container upstairs', async () => {
    const { findPath } = await import('../src/agent/pathfind');
    const { layout, world } = await buildWorld();
    const house = layout.buildings.find((building) => building.plan.floors === 2 && building.parts.containers.some((box) => box.y > building.plan.baseY + 2))!;
    const container = house.parts.containers.find((box) => box.y > house.plan.baseY + 2)!;
    const start = { x: house.plan.x + 12, y: 0, z: house.plan.z + 12 };
    start.y = layout.terrain.heightAt(start.x, start.z);
    const route = findPath(world, start, { x: container.x, y: container.y + container.height * 0.6, z: container.z });
    expect(route).not.toBeNull();
    const end = route![route!.length - 1]!;
    expect(end.y).toBeGreaterThan(house.plan.baseY + 2.5);
  });

  it('routes from outside a house, through its doorway, to a container inside without crossing walls', async () => {
    const { findPath } = await import('../src/agent/pathfind');
    const { layout, world } = await buildWorld();
    const { plan, parts } = layout.buildings.find((building) => building.parts.containers.some((box) => box.y < building.plan.baseY + 1))!;
    const container = parts.containers.find((box) => box.y < plan.baseY + 1)!;
    // Start 14 m outside the house on the side away from the container.
    const awayX = plan.x - container.x; const awayZ = plan.z - container.z;
    const length = Math.hypot(awayX, awayZ) || 1;
    const start = { x: plan.x + awayX / length * 14, y: 0, z: plan.z + awayZ / length * 14 };
    start.y = layout.terrain.heightAt(start.x, start.z);
    const route = findPath(world, start, { x: container.x, y: container.y + container.height * 0.6, z: container.z });
    expect(route).not.toBeNull();
    const end = route![route!.length - 1]!;
    expect(Math.hypot(end.x - container.x, end.z - container.z)).toBeLessThan(2.5);
    // Every leg of the route clears the walls at waist height (doors excepted, the walker opens them).
    let previous = start;
    for (const point of route!) {
      const blocked = world.raycast({ x: previous.x, y: previous.y + 1, z: previous.z }, { x: point.x - previous.x, y: point.y - previous.y, z: point.z - previous.z },
        Math.hypot(point.x - previous.x, point.y - previous.y, point.z - previous.z), (volume) => volume.tag?.startsWith('door:') === true || volume.tag === 'glass');
      expect(blocked, `leg to ${point.x.toFixed(1)},${point.z.toFixed(1)}`).toBeNull();
      previous = point;
    }
  });
});
