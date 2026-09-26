import { describe, expect, it } from 'vitest';
import { CollisionWorld } from '../src/core/collision';
import { Random } from '../src/core/random';
import { createSentry, radioSquad, SENTRY, suppressSentry, updateSentry, type PlayerSnapshot, type SentryState } from '../src/enemies/sentry';

const player = (x = 0, z = 0, overrides: Partial<PlayerSnapshot> = {}): PlayerSnapshot => ({
  eye: { x, y: 1.64, z }, position: { x, y: 0, z }, stance: 'stand', moving: false, sprinting: false, concealed: false, ...overrides,
});

/** Finds sentry ids that get the wanted role. */
function withRole(role: SentryState['role'], world: CollisionWorld, x: number, z: number): SentryState {
  for (let index = 0; index < 50; index += 1) {
    const sentry = createSentry(`robot-${index}`, [{ x, z }], true, world);
    if (sentry.role === role) return sentry;
  }
  throw new Error(`no ${role} id`);
}

function alert(sentry: SentryState, at: { x: number; z: number }): void {
  sentry.mode = 'alert';
  sentry.awareness = 1.1;
  sentry.lastKnown = { ...at };
  sentry.heading = Math.atan2(at.x - sentry.position.x, at.z - sentry.position.z);
}

describe('robot tactics', () => {
  it('flankers swing round to the side instead of walking straight in', () => {
    const world = new CollisionWorld(() => 0);
    const flanker = withRole('flank', world, 0, -40);
    alert(flanker, { x: 0, z: 0 });
    const random = new Random('flank');
    let widest = 0;
    for (let tick = 0; tick < 60 * 18; tick += 1) {
      updateSentry(flanker, player(), world, 1 / 60, random);
      // Angle between where it started (due north of the player) and where it is now, seen from the player.
      const angle = Math.abs(Math.atan2(flanker.position.x, -flanker.position.z));
      widest = Math.max(widest, angle);
    }
    expect(widest).toBeGreaterThan(Math.PI / 4);
    expect(Math.hypot(flanker.position.x, flanker.position.z)).toBeLessThan(SENTRY.effectiveRange + 2);
  });

  it('assault robots bound forward from cover to cover', () => {
    const world = new CollisionWorld(() => 0);
    // A scattering of tree trunks between the robot and the player.
    for (const [x, z] of [[1.5, -30], [-2, -24], [2.5, -18], [-1.5, -13], [3, -28], [-3, -20]] as const) world.addBox('solid', x, 0, z, 0.8, 9, 0.8, 'tree');
    const robot = withRole('assault', world, 0, -38);
    alert(robot, { x: 0, z: 0 });
    const random = new Random('bound');
    let hiddenPauses = 0;
    let closest = 99;
    for (let tick = 0; tick < 60 * 20; tick += 1) {
      updateSentry(robot, player(), world, 1 / 60, random);
      const hidden = !world.lineOfSight({ x: 0, y: 1.64, z: 0 }, { x: robot.position.x, y: 1.8, z: robot.position.z });
      if (robot.tactic === 'cover' && hidden) hiddenPauses += 1;
      closest = Math.min(closest, Math.hypot(robot.position.x, robot.position.z));
    }
    expect(hiddenPauses).toBeGreaterThan(60);
    expect(closest).toBeLessThan(20);
  });

  it('dives behind a tree when the player shoots near it', () => {
    const world = new CollisionWorld(() => 0);
    world.addBox('solid', 3, 0, -22, 0.9, 9, 0.9, 'tree');
    const robot = createSentry('near-miss', [{ x: 0, z: -24 }], true, world);
    suppressSentry(robot, { x: 0, y: 1.6, z: 0 });
    const random = new Random('duck');
    for (let tick = 0; tick < 60 * 3; tick += 1) updateSentry(robot, player(0, 0, { stance: 'prone', eye: { x: 0, y: 0.35, z: 0 } }), world, 1 / 60, random);
    expect(world.lineOfSight({ x: 0, y: 1.64, z: 0 }, { x: robot.position.x, y: 1.8, z: robot.position.z })).toBe(false);
  });

  it('radios the player position to nearby robots, not distant ones', () => {
    const world = new CollisionWorld(() => 0);
    const spotter = createSentry('spotter', [{ x: 0, z: -20 }], true, world);
    const buddy = createSentry('buddy', [{ x: 30, z: -30 }], true, world);
    const faraway = createSentry('faraway', [{ x: 200, z: -200 }], true, world);
    alert(spotter, { x: 0, z: 0 });
    spotter.canSeePlayer = true;
    expect(radioSquad([spotter, buddy, faraway], spotter, { x: 0, y: 0, z: 0 })).toBe(1);
    expect(buddy.mode).toBe('search');
    expect(buddy.lastKnown).toEqual({ x: 0, z: 0 });
    expect(faraway.mode).toBe('patrol');
  });
});
