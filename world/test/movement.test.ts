import { describe, expect, it } from 'vitest';
import { CollisionWorld } from '../src/core/collision';
import { PlayerBody, STANCE, type MoveIntent } from '../src/player/body';

const idle: MoveIntent = { forward: 0, strafe: 0, sprint: false, jump: false, crouch: false, prone: false };
const flat = (): CollisionWorld => new CollisionWorld(() => 0);
const run = (body: PlayerBody, world: CollisionWorld, intent: Partial<MoveIntent>, seconds: number): void => {
  const steps = Math.round(seconds * 60);
  for (let step = 0; step < steps; step += 1) body.step({ ...idle, ...intent }, 1 / 60, world);
};

describe('player movement', () => {
  it('walks, sprints faster, and spends stamina', () => {
    const world = flat();
    const walker = new PlayerBody(0, 0, 0);
    run(walker, world, { forward: 1 }, 1);
    const sprinter = new PlayerBody(0, 0, 0);
    run(sprinter, world, { forward: 1, sprint: true }, 1);
    expect(-walker.position.z).toBeGreaterThan(2.5);
    expect(-sprinter.position.z).toBeGreaterThan(-walker.position.z * 1.6);
    expect(sprinter.stamina).toBeLessThan(100);
  });

  it('is stopped by walls but climbs stairs', () => {
    const world = flat();
    world.addBox('solid', 0, 0, -3, 6, 3, 0.3);
    const body = new PlayerBody(0, 0, 0);
    run(body, world, { forward: 1 }, 2);
    expect(body.position.z).toBeGreaterThan(-3 + 0.15);
    const stairs = flat();
    for (let step = 0; step < 6; step += 1) stairs.addBox('solid', 0, 0, -1 - step * 0.3, 1.2, (step + 1) * 0.25, 0.3);
    stairs.addBox('solid', 0, 0, -6, 3, 1.5, 6);
    const climber = new PlayerBody(0, 0, 0);
    run(climber, stairs, { forward: 1 }, 2);
    expect(climber.position.y).toBeCloseTo(1.5, 1);
  });

  it('crouches, goes prone, and cannot stand up under a table', () => {
    const world = flat();
    world.addBox('solid', 0, 0.8, 0, 2, 0.1, 2);
    const body = new PlayerBody(0, 0, 0);
    body.step({ ...idle, prone: true }, 1 / 60, world);
    expect(body.stance).toBe('prone');
    expect(body.setStance('stand', world)).toBe(false);
    expect(body.setStance('crouch', world)).toBe(false);
    const free = new PlayerBody(10, 0, 10);
    free.step({ ...idle, crouch: true }, 1 / 60, world);
    run(free, world, {}, 1);
    expect(free.stance).toBe('crouch');
    expect(free.eyeHeight).toBeCloseTo(STANCE.crouch.eye, 1);
  });

  it('jumps and mantles onto a crate', () => {
    const world = flat();
    world.addBox('solid', 0, 0, -1.2, 1.2, 1.2, 1.2);
    const body = new PlayerBody(0, 0, 0);
    body.step({ ...idle, forward: 1, jump: true }, 1 / 60, world);
    expect(body.mantle).not.toBeNull();
    run(body, world, {}, 1);
    expect(body.position.y).toBeCloseTo(1.2, 2);
    const jumper = new PlayerBody(20, 0, 20);
    jumper.step({ ...idle, jump: true }, 1 / 60, world);
    run(jumper, world, {}, 0.2);
    expect(jumper.position.y).toBeGreaterThan(0.4);
  });

  it('climbs a ladder onto a roof', () => {
    const world = flat();
    world.addBox('solid', 0, 0, -2.5, 4, 4, 4);
    world.add('ladder', -0.4, 0, -0.55, 0.4, 4, -0.2, 'ladder:-z');
    const body = new PlayerBody(0, 0, 0);
    run(body, world, { forward: 1 }, 2.3);
    run(body, world, {}, 1);
    expect(body.position.y).toBeCloseTo(4, 1);
    expect(body.position.z).toBeLessThan(-0.8);
  });

  it('raycasts against boxes and terrain', () => {
    const world = new CollisionWorld((x) => (x > 30 ? 5 : 0));
    world.addBox('solid', 10, 0, 0, 1, 3, 1);
    const hit = world.raycast({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, 50);
    expect(hit?.distance).toBeCloseTo(9.5, 3);
    const terrain = world.raycast({ x: 0, y: 4, z: 3 }, { x: 1, y: 0, z: 0 }, 50);
    expect(terrain?.volume).toBeNull();
    expect(terrain?.distance).toBeCloseTo(30, 0);
    expect(world.lineOfSight({ x: 0, y: 1, z: 5 }, { x: 20, y: 1, z: 5 })).toBe(true);
    expect(world.lineOfSight({ x: 0, y: 1, z: 0 }, { x: 20, y: 1, z: 0 })).toBe(false);
  });
});
